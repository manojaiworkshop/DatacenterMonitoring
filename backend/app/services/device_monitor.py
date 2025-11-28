import asyncio
import logging
from datetime import datetime
from typing import Dict, Set, Optional
import subprocess
import platform

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.core.database import async_session
from app.models.datacenter import Device

logger = logging.getLogger(__name__)

# Will be set by main.py
sio_instance = None


class DeviceMonitor:
    """Background service to monitor device status via ping"""
    
    def __init__(self, sio=None):
        self.running = False
        self.monitored_devices: Set[int] = set()
        self.status_cache: Dict[int, str] = {}
        self.sio = sio
        
    async def start(self):
        """Start the monitoring service"""
        if self.running:
            return
            
        self.running = True
        logger.info("Device monitoring service started")
        
        # Start monitoring loop
        asyncio.create_task(self._monitoring_loop())
        
    async def stop(self):
        """Stop the monitoring service"""
        self.running = False
        logger.info("Device monitoring service stopped")
        
    async def _monitoring_loop(self):
        """Main monitoring loop - checks devices every 30 seconds"""
        while self.running:
            try:
                await self._check_all_devices()
                await asyncio.sleep(30)  # Check every 30 seconds
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}", exc_info=True)
                await asyncio.sleep(10)  # Wait before retrying
                
    async def _check_all_devices(self):
        """Check status of all devices with IP addresses"""
        async with async_session() as db:
            try:
                # Get all devices with IP addresses
                result = await db.execute(
                    select(Device).where(Device.ip_address != None, Device.ip_address != "")
                )
                devices = result.scalars().all()
                
                if not devices:
                    return
                    
                logger.debug(f"Checking {len(devices)} devices")
                
                # Check each device
                tasks = [self._check_device(db, device) for device in devices]
                await asyncio.gather(*tasks, return_exceptions=True)
                
                await db.commit()
                
            except Exception as e:
                logger.error(f"Error checking devices: {e}", exc_info=True)
                await db.rollback()
                
    async def _check_device(self, db: AsyncSession, device: Device):
        """Check a single device status"""
        try:
            if not device.ip_address:
                return
                
            # Ping the device
            is_online = await self._ping_device(device.ip_address)
            
            # Update status if changed
            new_status = "online" if is_online else "offline"
            if device.status != new_status:
                logger.info(f"Device {device.name} ({device.ip_address}) status changed: {device.status} -> {new_status}")
                device.status = new_status
                device.last_checked = datetime.utcnow()
                
                # Cache the status
                self.status_cache[device.id] = new_status
                
                # Emit real-time status update via Socket.IO
                if self.sio:
                    await self.sio.emit('device_status_update', {
                        'device_id': device.id,
                        'datacenter_id': device.datacenter_id,
                        'status': new_status,
                        'timestamp': datetime.utcnow().isoformat()
                    })
                
        except Exception as e:
            logger.error(f"Error checking device {device.id}: {e}")
            device.status = "error"
            
    async def _ping_device(self, ip_address: str, timeout: int = 2) -> bool:
        """
        Ping a device to check if it's reachable
        
        Args:
            ip_address: IP address to ping
            timeout: Timeout in seconds
            
        Returns:
            True if device is reachable, False otherwise
        """
        try:
            # Determine ping command based on OS
            param = '-n' if platform.system().lower() == 'windows' else '-c'
            wait_param = '-w' if platform.system().lower() == 'windows' else '-W'
            
            # Build ping command
            command = ['ping', param, '1', wait_param, str(timeout * 1000) if platform.system().lower() == 'windows' else str(timeout), ip_address]
            
            # Execute ping in subprocess
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout + 1
            )
            
            # Check return code
            return process.returncode == 0
            
        except asyncio.TimeoutError:
            logger.debug(f"Ping timeout for {ip_address}")
            return False
        except Exception as e:
            logger.error(f"Error pinging {ip_address}: {e}")
            return False
            
    def get_device_status(self, device_id: int) -> str:
        """Get cached status for a device"""
        return self.status_cache.get(device_id, "unknown")


# Global instance
device_monitor = DeviceMonitor()
