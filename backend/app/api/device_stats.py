"""
API endpoints for device statistics and monitoring
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.datacenter import Device
from app.services.device_stats_service import device_stats_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/devices", tags=["device-stats"])


@router.get("/{device_id}/stats")
async def get_device_stats(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """Get real-time device statistics (CPU, RAM, Disk)"""
    # Verify device ownership
    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Verify user owns the datacenter
    from app.models.datacenter import Datacenter
    dc_result = await db.execute(
        select(Datacenter).where(
            Datacenter.id == device.datacenter_id,
            Datacenter.user_id == current_user.id
        )
    )
    if not dc_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get stats via SSH
    if not device.ip_address or not device.ssh_username:
        raise HTTPException(status_code=400, detail="Device SSH configuration incomplete")
    
    stats = await device_stats_service.get_system_stats(
        device_id=device.id,
        host=device.ip_address,
        port=device.ssh_port or 22,
        username=device.ssh_username,
        password=device.ssh_password or ""
    )
    
    return stats


@router.get("/{device_id}/services")
async def get_device_services(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict]:
    """Get list of services running on device"""
    # Verify device ownership
    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Verify user owns the datacenter
    from app.models.datacenter import Datacenter
    dc_result = await db.execute(
        select(Datacenter).where(
            Datacenter.id == device.datacenter_id,
            Datacenter.user_id == current_user.id
        )
    )
    if not dc_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not device.ip_address or not device.ssh_username:
        raise HTTPException(status_code=400, detail="Device SSH configuration incomplete")
    
    services = await device_stats_service.get_services(
        device_id=device.id,
        host=device.ip_address,
        port=device.ssh_port or 22,
        username=device.ssh_username,
        password=device.ssh_password or ""
    )
    
    return services


@router.get("/{device_id}/processes")
async def get_device_processes(
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> List[Dict]:
    """Get list of processes running on device"""
    # Verify device ownership
    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Verify user owns the datacenter
    from app.models.datacenter import Datacenter
    dc_result = await db.execute(
        select(Datacenter).where(
            Datacenter.id == device.datacenter_id,
            Datacenter.user_id == current_user.id
        )
    )
    if not dc_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not device.ip_address or not device.ssh_username:
        raise HTTPException(status_code=400, detail="Device SSH configuration incomplete")
    
    processes = await device_stats_service.get_processes(
        device_id=device.id,
        host=device.ip_address,
        port=device.ssh_port or 22,
        username=device.ssh_username,
        password=device.ssh_password or ""
    )
    
    return processes


@router.post("/{device_id}/services/{service_name}/{action}")
async def manage_device_service(
    device_id: int,
    service_name: str,
    action: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """Manage a service (start, stop, restart)"""
    # Verify device ownership
    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Verify user owns the datacenter
    from app.models.datacenter import Datacenter
    dc_result = await db.execute(
        select(Datacenter).where(
            Datacenter.id == device.datacenter_id,
            Datacenter.user_id == current_user.id
        )
    )
    if not dc_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not device.ip_address or not device.ssh_username:
        raise HTTPException(status_code=400, detail="Device SSH configuration incomplete")
    
    result = await device_stats_service.manage_service(
        device_id=device.id,
        host=device.ip_address,
        port=device.ssh_port or 22,
        username=device.ssh_username,
        password=device.ssh_password or "",
        service_name=service_name,
        action=action
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    
    return result


@router.post("/{device_id}/processes/{pid}/{action}")
async def manage_device_process(
    device_id: int,
    pid: str,
    action: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Dict:
    """Manage a process (kill, stop)"""
    # Verify device ownership
    result = await db.execute(
        select(Device).where(Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Verify user owns the datacenter
    from app.models.datacenter import Datacenter
    dc_result = await db.execute(
        select(Datacenter).where(
            Datacenter.id == device.datacenter_id,
            Datacenter.user_id == current_user.id
        )
    )
    if not dc_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not device.ip_address or not device.ssh_username:
        raise HTTPException(status_code=400, detail="Device SSH configuration incomplete")
    
    result = await device_stats_service.manage_process(
        device_id=device.id,
        host=device.ip_address,
        port=device.ssh_port or 22,
        username=device.ssh_username,
        password=device.ssh_password or "",
        pid=pid,
        action=action
    )
    
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Unknown error"))
    
    return result
