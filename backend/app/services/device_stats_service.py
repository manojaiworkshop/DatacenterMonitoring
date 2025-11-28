"""
Service for collecting device statistics via SSH
"""
import asyncio
import paramiko
import logging
from typing import Dict, Optional, List
import json

logger = logging.getLogger(__name__)


class DeviceStatsService:
    """Service to collect system stats from remote devices via SSH"""
    
    def __init__(self):
        self.active_connections: Dict[int, paramiko.SSHClient] = {}
    
    async def get_ssh_connection(self, device_id: int, host: str, port: int, 
                                  username: str, password: str) -> Optional[paramiko.SSHClient]:
        """Get or create SSH connection for a device"""
        try:
            # Check if connection exists and is active
            if device_id in self.active_connections:
                client = self.active_connections[device_id]
                try:
                    # Test if connection is alive
                    transport = client.get_transport()
                    if transport and transport.is_active():
                        return client
                    else:
                        # Connection is dead, remove it
                        del self.active_connections[device_id]
                except:
                    del self.active_connections[device_id]
            
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
            
            self.active_connections[device_id] = client
            logger.info(f"SSH connection established for device {device_id}")
            return client
            
        except Exception as e:
            logger.error(f"Failed to connect to device {device_id}: {e}")
            return None
    
    async def execute_command(self, client: paramiko.SSHClient, command: str) -> str:
        """Execute command via SSH and return output"""
        try:
            stdin, stdout, stderr = await asyncio.get_event_loop().run_in_executor(
                None,
                client.exec_command,
                command
            )
            
            output = await asyncio.get_event_loop().run_in_executor(
                None,
                stdout.read
            )
            
            return output.decode('utf-8', errors='ignore')
        except Exception as e:
            logger.error(f"Command execution failed: {e}")
            return ""
    
    async def get_system_stats(self, device_id: int, host: str, port: int, 
                                username: str, password: str) -> Dict:
        """Get comprehensive system statistics"""
        client = await self.get_ssh_connection(device_id, host, port, username, password)
        
        if not client:
            return {"error": "Failed to connect to device"}
        
        try:
            # Get CPU usage
            cpu_command = "top -bn1 | grep 'Cpu(s)' | sed 's/.*, *\\([0-9.]*\\)%* id.*/\\1/' | awk '{print 100 - $1}'"
            cpu_output = await self.execute_command(client, cpu_command)
            
            # Get memory usage
            mem_command = "free -m | awk 'NR==2{printf \"{\\\"total\\\":%s,\\\"used\\\":%s,\\\"free\\\":%s,\\\"percent\\\":%.2f}\", $2,$3,$4,$3*100/$2 }'"
            mem_output = await self.execute_command(client, mem_command)
            
            # Get disk usage
            disk_command = "df -h / | awk 'NR==2{printf \"{\\\"total\\\":\\\"%s\\\",\\\"used\\\":\\\"%s\\\",\\\"available\\\":\\\"%s\\\",\\\"percent\\\":\\\"%s\\\"}\", $2,$3,$4,$5}'"
            disk_output = await self.execute_command(client, disk_command)
            
            # Parse results
            try:
                cpu_percent = float(cpu_output.strip()) if cpu_output.strip() else 0.0
            except:
                cpu_percent = 0.0
            
            try:
                memory = json.loads(mem_output.strip()) if mem_output.strip() else {}
            except:
                memory = {"total": 0, "used": 0, "free": 0, "percent": 0}
            
            try:
                disk = json.loads(disk_output.strip()) if disk_output.strip() else {}
            except:
                disk = {"total": "0G", "used": "0G", "available": "0G", "percent": "0%"}
            
            return {
                "cpu": {
                    "percent": round(cpu_percent, 2)
                },
                "memory": memory,
                "disk": disk
            }
            
        except Exception as e:
            logger.error(f"Failed to get stats for device {device_id}: {e}")
            return {"error": str(e)}
    
    async def get_services(self, device_id: int, host: str, port: int, 
                           username: str, password: str) -> List[Dict]:
        """Get list of systemd services"""
        client = await self.get_ssh_connection(device_id, host, port, username, password)
        
        if not client:
            return []
        
        try:
            # Get systemd services
            command = "systemctl list-units --type=service --all --no-pager --no-legend | awk '{print $1,$2,$3,$4}' | head -200"
            output = await self.execute_command(client, command)
            
            services = []
            for line in output.strip().split('\n'):
                if line.strip():
                    parts = line.split(None, 3)
                    if len(parts) >= 3:
                        services.append({
                            "name": parts[0].replace('.service', ''),
                            "load": parts[1] if len(parts) > 1 else "unknown",
                            "active": parts[2] if len(parts) > 2 else "unknown",
                            "sub": parts[3] if len(parts) > 3 else "unknown"
                        })
            
            return services
            
        except Exception as e:
            logger.error(f"Failed to get services for device {device_id}: {e}")
            return []
    
    async def manage_service(self, device_id: int, host: str, port: int, 
                            username: str, password: str, service_name: str, 
                            action: str) -> Dict:
        """Start, stop, or restart a service"""
        client = await self.get_ssh_connection(device_id, host, port, username, password)
        
        if not client:
            return {"success": False, "error": "Failed to connect"}
        
        try:
            if action not in ['start', 'stop', 'restart', 'status']:
                return {"success": False, "error": "Invalid action"}
            
            command = f"sudo systemctl {action} {service_name}"
            output = await self.execute_command(client, command)
            
            # Get updated status
            status_cmd = f"systemctl status {service_name} --no-pager | head -5"
            status_output = await self.execute_command(client, status_cmd)
            
            return {
                "success": True,
                "action": action,
                "service": service_name,
                "output": output,
                "status": status_output
            }
            
        except Exception as e:
            logger.error(f"Failed to manage service {service_name}: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_processes(self, device_id: int, host: str, port: int, 
                           username: str, password: str) -> List[Dict]:
        """Get list of running processes"""
        client = await self.get_ssh_connection(device_id, host, port, username, password)
        
        if not client:
            return []
        
        try:
            # Get top processes by CPU/Memory
            command = "ps aux --sort=-%cpu | head -201 | tail -200 | awk '{printf \"%s|%s|%s|%s|%s\\n\", $2, $1, $3, $4, substr($0, index($0,$11))}'"
            output = await self.execute_command(client, command)
            
            processes = []
            for line in output.strip().split('\n'):
                if line.strip():
                    parts = line.split('|')
                    if len(parts) >= 5:
                        processes.append({
                            "pid": parts[0],
                            "user": parts[1],
                            "cpu": float(parts[2]) if parts[2].replace('.', '').isdigit() else 0.0,
                            "memory": float(parts[3]) if parts[3].replace('.', '').isdigit() else 0.0,
                            "command": parts[4][:100]  # Limit command length
                        })
            
            return processes
            
        except Exception as e:
            logger.error(f"Failed to get processes for device {device_id}: {e}")
            return []
    
    async def manage_process(self, device_id: int, host: str, port: int, 
                            username: str, password: str, pid: str, 
                            action: str) -> Dict:
        """Kill or stop a process"""
        client = await self.get_ssh_connection(device_id, host, port, username, password)
        
        if not client:
            return {"success": False, "error": "Failed to connect"}
        
        try:
            if action == "kill":
                command = f"sudo kill -9 {pid}"
            elif action == "stop":
                command = f"sudo kill -SIGTERM {pid}"
            else:
                return {"success": False, "error": "Invalid action"}
            
            output = await self.execute_command(client, command)
            
            return {
                "success": True,
                "action": action,
                "pid": pid,
                "output": output
            }
            
        except Exception as e:
            logger.error(f"Failed to manage process {pid}: {e}")
            return {"success": False, "error": str(e)}
    
    def close_connection(self, device_id: int):
        """Close SSH connection for a device"""
        if device_id in self.active_connections:
            try:
                self.active_connections[device_id].close()
            except:
                pass
            del self.active_connections[device_id]
    
    def close_all_connections(self):
        """Close all SSH connections"""
        for device_id in list(self.active_connections.keys()):
            self.close_connection(device_id)


# Global instance
device_stats_service = DeviceStatsService()
