import socketio
from app.services.terminal_service import terminal_manager
from app.services.device_stats_service import device_stats_service
import asyncio
from typing import Dict
import logging

logger = logging.getLogger(__name__)

# Create Socket.IO server
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True
)

# Store user terminal mappings
user_terminals: Dict[str, set] = {}

# Store active device monitoring tasks
device_monitoring_tasks: Dict[str, asyncio.Task] = {}


@sio.event
async def connect(sid, environ):
    """Handle client connection"""
    logger.info(f"Client connected: {sid}")
    user_terminals[sid] = set()


@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {sid}")
    
    # Close all terminals for this user
    if sid in user_terminals:
        for terminal_id in list(user_terminals[sid]):
            terminal_manager.close_terminal(terminal_id)
        del user_terminals[sid]


@sio.event
async def create_terminal(sid, data):
    """Create a new terminal (local or SSH)"""
    try:
        cols = data.get('cols', 80)
        rows = data.get('rows', 24)
        ssh_config = data.get('ssh_config')  # Optional SSH configuration
        
        # Create terminal
        terminal = await terminal_manager.create_terminal(cols, rows, ssh_config)
        
        # Track this terminal for the user
        if sid not in user_terminals:
            user_terminals[sid] = set()
        user_terminals[sid].add(terminal.terminal_id)
        
        # Start reading output
        asyncio.create_task(stream_terminal_output(sid, terminal.terminal_id))
        
        # Send success response
        await sio.emit('terminal_created', {
            'terminal_id': terminal.terminal_id,
            'status': 'success',
            'is_ssh': terminal.is_ssh,
            'host': ssh_config['host'] if ssh_config else 'local'
        }, room=sid)
        
    except Exception as e:
        logger.error(f"Error creating terminal: {e}")
        await sio.emit('error', {
            'message': f'Failed to create terminal: {str(e)}'
        }, room=sid)


@sio.event
async def terminal_input(sid, data):
    """Handle terminal input"""
    try:
        terminal_id = data.get('terminal_id')
        input_data = data.get('data', '')
        
        terminal = terminal_manager.get_terminal(terminal_id)
        if terminal and not terminal.closed:
            terminal.write(input_data)
    except Exception as e:
        logger.error(f"Error handling terminal input: {e}")


@sio.event
async def terminal_resize(sid, data):
    """Handle terminal resize"""
    try:
        terminal_id = data.get('terminal_id')
        cols = data.get('cols', 80)
        rows = data.get('rows', 24)
        
        terminal = terminal_manager.get_terminal(terminal_id)
        if terminal and not terminal.closed:
            terminal.resize(cols, rows)
    except Exception as e:
        logger.error(f"Error resizing terminal: {e}")


@sio.event
async def close_terminal(sid, data):
    """Close a terminal"""
    try:
        terminal_id = data.get('terminal_id')
        
        if sid in user_terminals and terminal_id in user_terminals[sid]:
            user_terminals[sid].remove(terminal_id)
        
        terminal_manager.close_terminal(terminal_id)
        
        await sio.emit('terminal_closed', {
            'terminal_id': terminal_id
        }, room=sid)
        
    except Exception as e:
        logger.error(f"Error closing terminal: {e}")


async def stream_terminal_output(sid: str, terminal_id: str):
    """Stream terminal output to client"""
    try:
        while True:
            terminal = terminal_manager.get_terminal(terminal_id)
            if not terminal or terminal.closed:
                break
            
            output = await terminal_manager.read_output(terminal_id)
            if output is None:
                # Terminal closed
                break
            
            if output:
                await sio.emit('terminal_output', {
                    'terminal_id': terminal_id,
                    'data': output
                }, room=sid)
            
            # Small delay to avoid overwhelming the client
            await asyncio.sleep(0.01)
            
    except Exception as e:
        logger.error(f"Error streaming terminal output: {e}")
    finally:
        # Notify client that terminal is closed
        await sio.emit('terminal_closed', {
            'terminal_id': terminal_id
        }, room=sid)


@sio.event
async def start_device_monitoring(sid, data):
    """Start streaming device statistics"""
    try:
        device_id = data.get('device_id')
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        
        if not all([device_id, host, username, password]):
            await sio.emit('error', {
                'message': 'Missing required device connection info'
            }, room=sid)
            return
        
        # Create monitoring task key
        task_key = f"{sid}:{device_id}"
        
        # Stop existing monitoring if any
        if task_key in device_monitoring_tasks:
            device_monitoring_tasks[task_key].cancel()
        
        # Start monitoring task
        task = asyncio.create_task(
            stream_device_stats(sid, device_id, host, port, username, password)
        )
        device_monitoring_tasks[task_key] = task
        
        logger.info(f"Started device monitoring for device {device_id}")
        
    except Exception as e:
        logger.error(f"Error starting device monitoring: {e}")
        await sio.emit('error', {
            'message': f'Failed to start monitoring: {str(e)}'
        }, room=sid)


@sio.event
async def stop_device_monitoring(sid, data):
    """Stop streaming device statistics"""
    try:
        device_id = data.get('device_id')
        task_key = f"{sid}:{device_id}"
        
        if task_key in device_monitoring_tasks:
            device_monitoring_tasks[task_key].cancel()
            del device_monitoring_tasks[task_key]
            device_stats_service.close_connection(device_id)
            logger.info(f"Stopped device monitoring for device {device_id}")
        
    except Exception as e:
        logger.error(f"Error stopping device monitoring: {e}")


async def stream_device_stats(sid: str, device_id: int, host: str, 
                               port: int, username: str, password: str):
    """Stream device statistics to client every 3 seconds"""
    try:
        while True:
            # Get system stats
            stats = await device_stats_service.get_system_stats(
                device_id, host, port, username, password
            )
            
            if stats and 'error' not in stats:
                await sio.emit('device_stats_update', {
                    'device_id': device_id,
                    'stats': stats
                }, room=sid)
            else:
                logger.warning(f"Failed to get stats for device {device_id}")
            
            # Wait 3 seconds before next update
            await asyncio.sleep(3)
            
    except asyncio.CancelledError:
        logger.info(f"Device monitoring cancelled for device {device_id}")
    except Exception as e:
        logger.error(f"Error streaming device stats: {e}")
        await sio.emit('device_monitoring_error', {
            'device_id': device_id,
            'error': str(e)
        }, room=sid)


# File Manager Events
from app.services.file_manager_service import file_manager_service


@sio.event
async def list_directory(sid, data):
    """List files and directories"""
    try:
        device_id = data.get('device_id')
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        path = data.get('path', '/')
        
        connection_key = f"{sid}:files:{device_id}"
        
        result = await file_manager_service.list_directory(
            connection_key, host, port, username, password, path
        )
        
        await sio.emit('directory_listed', {
            'device_id': device_id,
            'path': path,
            'data': result
        }, room=sid)
        
    except Exception as e:
        logger.error(f"Error listing directory: {e}")
        await sio.emit('file_error', {
            'error': str(e),
            'operation': 'list_directory'
        }, room=sid)


@sio.event
async def read_file(sid, data):
    """Read file contents"""
    try:
        device_id = data.get('device_id')
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        file_path = data.get('file_path')
        
        connection_key = f"{sid}:files:{device_id}"
        
        result = await file_manager_service.read_file(
            connection_key, host, port, username, password, file_path
        )
        
        await sio.emit('file_read', {
            'device_id': device_id,
            'data': result
        }, room=sid)
        
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        await sio.emit('file_error', {
            'error': str(e),
            'operation': 'read_file'
        }, room=sid)


@sio.event
async def write_file(sid, data):
    """Write file contents"""
    try:
        device_id = data.get('device_id')
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        file_path = data.get('file_path')
        content = data.get('content', '')
        
        connection_key = f"{sid}:files:{device_id}"
        
        result = await file_manager_service.write_file(
            connection_key, host, port, username, password, file_path, content
        )
        
        await sio.emit('file_written', {
            'device_id': device_id,
            'data': result
        }, room=sid)
        
    except Exception as e:
        logger.error(f"Error writing file: {e}")
        await sio.emit('file_error', {
            'error': str(e),
            'operation': 'write_file'
        }, room=sid)


@sio.event
async def search_files(sid, data):
    """Search for files"""
    try:
        device_id = data.get('device_id')
        host = data.get('host')
        port = data.get('port', 22)
        username = data.get('username')
        password = data.get('password')
        search_path = data.get('search_path', '/')
        query = data.get('query', '')
        
        connection_key = f"{sid}:files:{device_id}"
        
        result = await file_manager_service.search_files(
            connection_key, host, port, username, password, search_path, query
        )
        
        await sio.emit('files_searched', {
            'device_id': device_id,
            'data': result
        }, room=sid)
        
    except Exception as e:
        logger.error(f"Error searching files: {e}")
        await sio.emit('file_error', {
            'error': str(e),
            'operation': 'search_files'
        }, room=sid)


@sio.event
async def close_file_manager(sid, data):
    """Close file manager connection"""
    try:
        device_id = data.get('device_id')
        connection_key = f"{sid}:files:{device_id}"
        
        file_manager_service.close_connection(connection_key)
        logger.info(f"Closed file manager for device {device_id}")
        
    except Exception as e:
        logger.error(f"Error closing file manager: {e}")
