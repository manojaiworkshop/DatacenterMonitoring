import os
import sys
import asyncio
import uuid
import struct
import fcntl
import termios
from typing import Dict, Optional
import pty
import select
import paramiko


class Terminal:
    def __init__(self, terminal_id: str, cols: int = 80, rows: int = 24, ssh_config: Optional[dict] = None):
        self.terminal_id = terminal_id
        self.cols = cols
        self.rows = rows
        self.fd: Optional[int] = None
        self.pid: Optional[int] = None
        self.closed = False
        
        # SSH specific
        self.is_ssh = ssh_config is not None
        self.ssh_config = ssh_config
        self.ssh_client: Optional[paramiko.SSHClient] = None
        self.ssh_channel: Optional[paramiko.Channel] = None
        
    def resize(self, cols: int, rows: int):
        """Resize the terminal"""
        self.cols = cols
        self.rows = rows
        
        if self.is_ssh and self.ssh_channel:
            # Resize SSH channel
            try:
                self.ssh_channel.resize_pty(width=cols, height=rows)
            except Exception:
                pass
        elif self.fd is not None:
            # Resize local PTY
            winsize = struct.pack("HHHH", rows, cols, 0, 0)
            fcntl.ioctl(self.fd, termios.TIOCSWINSZ, winsize)
    
    def write(self, data: str):
        """Write data to terminal"""
        if self.closed:
            return
            
        try:
            if self.is_ssh and self.ssh_channel:
                # Write to SSH channel
                self.ssh_channel.send(data)
            elif self.fd is not None:
                # Write to local PTY
                os.write(self.fd, data.encode())
        except (OSError, Exception):
            pass
    
    def close(self):
        """Close the terminal"""
        if not self.closed:
            self.closed = True
            
            # Close SSH connection
            if self.is_ssh:
                if self.ssh_channel:
                    try:
                        self.ssh_channel.close()
                    except Exception:
                        pass
                if self.ssh_client:
                    try:
                        self.ssh_client.close()
                    except Exception:
                        pass
            
            # Close local PTY
            if self.fd is not None:
                try:
                    os.close(self.fd)
                except OSError:
                    pass
            if self.pid is not None:
                try:
                    os.kill(self.pid, 9)
                except OSError:
                    pass


class TerminalManager:
    def __init__(self):
        self.terminals: Dict[str, Terminal] = {}
    
    async def create_terminal(self, cols: int = 80, rows: int = 24, ssh_config: Optional[dict] = None) -> Terminal:
        """Create a new terminal instance (local or SSH)"""
        terminal_id = str(uuid.uuid4())
        terminal = Terminal(terminal_id, cols, rows, ssh_config)
        
        if ssh_config:
            # Create SSH terminal
            try:
                ssh_client = paramiko.SSHClient()
                ssh_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
                
                # Connect to SSH server
                ssh_client.connect(
                    hostname=ssh_config['host'],
                    port=ssh_config.get('port', 22),
                    username=ssh_config['username'],
                    password=ssh_config.get('password'),
                    timeout=10
                )
                
                # Open interactive shell
                channel = ssh_client.invoke_shell(term='xterm-256color', width=cols, height=rows)
                channel.setblocking(0)
                
                terminal.ssh_client = ssh_client
                terminal.ssh_channel = channel
                
                self.terminals[terminal_id] = terminal
                return terminal
                
            except Exception as e:
                if ssh_client:
                    ssh_client.close()
                raise Exception(f"SSH connection failed: {str(e)}")
        else:
            # Create local PTY terminal
            # Fork a new process with a pseudo-terminal
            pid, fd = pty.fork()
            
            if pid == 0:
                # Child process - execute shell
                shell = os.environ.get("SHELL", "/bin/bash")
                if sys.platform == "win32":
                    shell = "powershell.exe"
                
                # Set environment variables
                env = os.environ.copy()
                env["TERM"] = "xterm-256color"
                env["COLORTERM"] = "truecolor"
                
                os.execvpe(shell, [shell], env)
            else:
                # Parent process
                terminal.fd = fd
                terminal.pid = pid
                
                # Set non-blocking
                flags = fcntl.fcntl(fd, fcntl.F_GETFL)
                fcntl.fcntl(fd, fcntl.F_SETFL, flags | os.O_NONBLOCK)
                
                # Set terminal size
                terminal.resize(cols, rows)
                
                self.terminals[terminal_id] = terminal
                return terminal
    
    async def read_output(self, terminal_id: str, timeout: float = 0.1):
        """Read output from terminal (local or SSH)"""
        terminal = self.terminals.get(terminal_id)
        if not terminal or terminal.closed:
            return None
        
        try:
            if terminal.is_ssh:
                # Read from SSH channel
                if terminal.ssh_channel and terminal.ssh_channel.recv_ready():
                    data = terminal.ssh_channel.recv(4096)
                    return data.decode('utf-8', errors='replace')
                return ""
            else:
                # Read from local PTY
                # Use select to check if data is available
                ready, _, _ = select.select([terminal.fd], [], [], timeout)
                if ready:
                    data = os.read(terminal.fd, 4096)
                    return data.decode('utf-8', errors='replace')
                return ""
        except OSError:
            # Terminal closed
            terminal.close()
            return None
        except Exception as e:
            # SSH error
            terminal.close()
            return None
    
    def get_terminal(self, terminal_id: str) -> Optional[Terminal]:
        """Get terminal by ID"""
        return self.terminals.get(terminal_id)
    
    def close_terminal(self, terminal_id: str):
        """Close and remove terminal"""
        terminal = self.terminals.get(terminal_id)
        if terminal:
            terminal.close()
            del self.terminals[terminal_id]
    
    def close_all(self):
        """Close all terminals"""
        for terminal_id in list(self.terminals.keys()):
            self.close_terminal(terminal_id)


# Global terminal manager instance
terminal_manager = TerminalManager()
