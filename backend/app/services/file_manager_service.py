"""
Service for managing remote files via SSH
"""
import asyncio
import paramiko
import logging
from typing import Dict, Optional, List
import os
from pathlib import Path

logger = logging.getLogger(__name__)


class FileManagerService:
    """Service to manage files on remote devices via SSH"""
    
    def __init__(self):
        self.active_connections: Dict[str, paramiko.SSHClient] = {}
        self.sftp_clients: Dict[str, paramiko.SFTPClient] = {}
    
    async def get_ssh_connection(self, connection_key: str, host: str, port: int, 
                                  username: str, password: str) -> Optional[paramiko.SSHClient]:
        """Get or create SSH connection for file operations"""
        try:
            # Check if connection exists and is active
            if connection_key in self.active_connections:
                client = self.active_connections[connection_key]
                try:
                    transport = client.get_transport()
                    if transport and transport.is_active():
                        return client
                    else:
                        # Connection is dead, remove it
                        del self.active_connections[connection_key]
                        if connection_key in self.sftp_clients:
                            del self.sftp_clients[connection_key]
                except:
                    del self.active_connections[connection_key]
                    if connection_key in self.sftp_clients:
                        del self.sftp_clients[connection_key]
            
            # Create new connection
            client = paramiko.SSHClient()
            client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.connect(
                    hostname=host,
                    port=port,
                    username=username,
                    password=password,
                    timeout=10,
                    look_for_keys=False,
                    allow_agent=False
                )
            )
            
            self.active_connections[connection_key] = client
            logger.info(f"SSH connection established for file manager: {connection_key}")
            return client
            
        except Exception as e:
            logger.error(f"Failed to connect for file operations {connection_key}: {e}")
            return None
    
    async def get_sftp_client(self, connection_key: str, ssh_client: paramiko.SSHClient) -> Optional[paramiko.SFTPClient]:
        """Get or create SFTP client"""
        try:
            if connection_key in self.sftp_clients:
                return self.sftp_clients[connection_key]
            
            sftp = await asyncio.get_event_loop().run_in_executor(
                None,
                ssh_client.open_sftp
            )
            self.sftp_clients[connection_key] = sftp
            return sftp
        except Exception as e:
            logger.error(f"Failed to open SFTP: {e}")
            return None
    
    async def list_directory(self, connection_key: str, host: str, port: int, 
                            username: str, password: str, path: str = '/') -> Dict:
        """List files and directories in a path"""
        client = await self.get_ssh_connection(connection_key, host, port, username, password)
        
        if not client:
            return {"error": "Failed to connect to device"}
        
        try:
            sftp = await self.get_sftp_client(connection_key, client)
            if not sftp:
                return {"error": "Failed to open SFTP"}
            
            # List directory contents
            def list_dir():
                try:
                    items = []
                    for item in sftp.listdir_attr(path):
                        item_path = os.path.join(path, item.filename)
                        is_dir = paramiko.sftp_attr.S_ISDIR(item.st_mode)
                        is_link = paramiko.sftp_attr.S_ISLNK(item.st_mode)
                        
                        items.append({
                            'name': item.filename,
                            'path': item_path,
                            'is_directory': is_dir,
                            'is_link': is_link,
                            'size': item.st_size if not is_dir else 0,
                            'modified': item.st_mtime,
                            'permissions': oct(item.st_mode)[-3:],
                        })
                    
                    # Sort: directories first, then files
                    items.sort(key=lambda x: (not x['is_directory'], x['name'].lower()))
                    return items
                except Exception as e:
                    logger.error(f"Error listing directory {path}: {e}")
                    return []
            
            items = await asyncio.get_event_loop().run_in_executor(None, list_dir)
            
            return {
                'path': path,
                'items': items
            }
            
        except Exception as e:
            logger.error(f"Error in list_directory: {e}")
            return {"error": str(e)}
    
    async def read_file(self, connection_key: str, host: str, port: int, 
                       username: str, password: str, file_path: str) -> Dict:
        """Read file contents"""
        client = await self.get_ssh_connection(connection_key, host, port, username, password)
        
        if not client:
            return {"error": "Failed to connect to device"}
        
        try:
            sftp = await self.get_sftp_client(connection_key, client)
            if not sftp:
                return {"error": "Failed to open SFTP"}
            
            def read_file_content():
                try:
                    with sftp.open(file_path, 'r') as f:
                        content = f.read()
                        # Try to decode as UTF-8
                        try:
                            return content.decode('utf-8')
                        except UnicodeDecodeError:
                            # If not UTF-8, return base64 for binary files
                            import base64
                            return {
                                'binary': True,
                                'content': base64.b64encode(content).decode('ascii')
                            }
                except Exception as e:
                    logger.error(f"Error reading file {file_path}: {e}")
                    raise e
            
            content = await asyncio.get_event_loop().run_in_executor(None, read_file_content)
            
            if isinstance(content, dict) and content.get('binary'):
                return {
                    'path': file_path,
                    'binary': True,
                    'error': 'Binary file - cannot edit'
                }
            
            return {
                'path': file_path,
                'content': content,
                'binary': False
            }
            
        except Exception as e:
            logger.error(f"Error in read_file: {e}")
            return {"error": str(e)}
    
    async def write_file(self, connection_key: str, host: str, port: int, 
                        username: str, password: str, file_path: str, content: str) -> Dict:
        """Write content to file"""
        client = await self.get_ssh_connection(connection_key, host, port, username, password)
        
        if not client:
            return {"error": "Failed to connect to device"}
        
        try:
            sftp = await self.get_sftp_client(connection_key, client)
            if not sftp:
                return {"error": "Failed to open SFTP"}
            
            def write_file_content():
                try:
                    with sftp.open(file_path, 'w') as f:
                        f.write(content.encode('utf-8'))
                    return True
                except Exception as e:
                    logger.error(f"Error writing file {file_path}: {e}")
                    raise e
            
            success = await asyncio.get_event_loop().run_in_executor(None, write_file_content)
            
            return {
                'success': success,
                'path': file_path,
                'message': 'File saved successfully'
            }
            
        except Exception as e:
            logger.error(f"Error in write_file: {e}")
            return {"error": str(e)}
    
    async def search_files(self, connection_key: str, host: str, port: int, 
                          username: str, password: str, search_path: str, query: str) -> Dict:
        """Search for files matching query"""
        client = await self.get_ssh_connection(connection_key, host, port, username, password)
        
        if not client:
            return {"error": "Failed to connect to device"}
        
        try:
            # Use find command to search
            command = f"find {search_path} -maxdepth 5 -iname '*{query}*' -type f 2>/dev/null | head -100"
            
            stdin, stdout, stderr = await asyncio.get_event_loop().run_in_executor(
                None,
                client.exec_command,
                command
            )
            
            output = await asyncio.get_event_loop().run_in_executor(
                None,
                stdout.read
            )
            
            files = output.decode('utf-8', errors='ignore').strip().split('\n')
            files = [f for f in files if f]  # Remove empty lines
            
            return {
                'query': query,
                'results': files[:50]  # Limit to 50 results
            }
            
        except Exception as e:
            logger.error(f"Error searching files: {e}")
            return {"error": str(e)}
    
    def close_connection(self, connection_key: str):
        """Close SSH connection"""
        if connection_key in self.sftp_clients:
            try:
                self.sftp_clients[connection_key].close()
            except:
                pass
            del self.sftp_clients[connection_key]
        
        if connection_key in self.active_connections:
            try:
                self.active_connections[connection_key].close()
            except:
                pass
            del self.active_connections[connection_key]


# Global instance
file_manager_service = FileManagerService()
