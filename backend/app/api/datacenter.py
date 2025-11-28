from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import logging

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.datacenter import Datacenter, Device
from app.schemas.datacenter import (
    DatacenterCreate,
    DatacenterResponse,
    DatacenterWithDevices,
    DeviceCreate,
    DeviceUpdate,
    DeviceResponse
)

# Setup logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/datacenters", tags=["datacenters"])


@router.post("/", response_model=DatacenterResponse)
async def create_datacenter(
    datacenter_data: DatacenterCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new datacenter"""
    try:
        logger.info(f"Creating datacenter: {datacenter_data.name} for user {current_user.id}")
        
        new_datacenter = Datacenter(
            name=datacenter_data.name,
            location=datacenter_data.location,
            user_id=current_user.id
        )
        db.add(new_datacenter)
        await db.commit()
        await db.refresh(new_datacenter)
        
        logger.info(f"Successfully created datacenter: {new_datacenter.id}")
        return new_datacenter
        
    except Exception as e:
        logger.error(f"Error creating datacenter: {str(e)}", exc_info=True)
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create datacenter: {str(e)}"
        )


@router.get("/", response_model=List[DatacenterWithDevices])
async def get_datacenters(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all datacenters for current user"""
    result = await db.execute(
        select(Datacenter)
        .where(Datacenter.user_id == current_user.id)
    )
    datacenters = result.scalars().all()
    
    # Load devices for each datacenter
    response = []
    for dc in datacenters:
        devices_result = await db.execute(
            select(Device).where(Device.datacenter_id == dc.id)
        )
        devices = devices_result.scalars().all()
        dc_dict = {
            "id": dc.id,
            "name": dc.name,
            "location": dc.location,
            "created_at": dc.created_at,
            "devices": devices
        }
        response.append(dc_dict)
    
    return response


@router.get("/{datacenter_id}", response_model=DatacenterWithDevices)
async def get_datacenter(
    datacenter_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific datacenter with its devices"""
    result = await db.execute(
        select(Datacenter)
        .where(Datacenter.id == datacenter_id)
        .where(Datacenter.user_id == current_user.id)
    )
    datacenter = result.scalar_one_or_none()
    
    if not datacenter:
        raise HTTPException(status_code=404, detail="Datacenter not found")
    
    # Load devices
    devices_result = await db.execute(
        select(Device).where(Device.datacenter_id == datacenter.id)
    )
    devices = devices_result.scalars().all()
    
    return {
        "id": datacenter.id,
        "name": datacenter.name,
        "location": datacenter.location,
        "created_at": datacenter.created_at,
        "devices": devices
    }


@router.delete("/{datacenter_id}")
async def delete_datacenter(
    datacenter_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a datacenter"""
    result = await db.execute(
        select(Datacenter)
        .where(Datacenter.id == datacenter_id)
        .where(Datacenter.user_id == current_user.id)
    )
    datacenter = result.scalar_one_or_none()
    
    if not datacenter:
        raise HTTPException(status_code=404, detail="Datacenter not found")
    
    await db.delete(datacenter)
    await db.commit()
    return {"message": "Datacenter deleted successfully"}


# Device endpoints
@router.post("/{datacenter_id}/devices", response_model=DeviceResponse)
async def create_device(
    datacenter_id: int,
    device_data: DeviceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add a device to a datacenter"""
    # Verify datacenter ownership
    result = await db.execute(
        select(Datacenter)
        .where(Datacenter.id == datacenter_id)
        .where(Datacenter.user_id == current_user.id)
    )
    datacenter = result.scalar_one_or_none()
    
    if not datacenter:
        raise HTTPException(status_code=404, detail="Datacenter not found")
    
    new_device = Device(
        name=device_data.name,
        device_type=device_data.device_type,
        ip_address=device_data.ip_address,
        ssh_port=device_data.ssh_port,
        ssh_username=device_data.ssh_username,
        ssh_password=device_data.ssh_password,  # TODO: Encrypt in production
        description=device_data.description,
        datacenter_id=datacenter_id
    )
    db.add(new_device)
    await db.commit()
    await db.refresh(new_device)
    return new_device


@router.put("/{datacenter_id}/devices/{device_id}", response_model=DeviceResponse)
async def update_device(
    datacenter_id: int,
    device_id: int,
    device_data: DeviceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a device"""
    # Verify datacenter ownership
    result = await db.execute(
        select(Datacenter)
        .where(Datacenter.id == datacenter_id)
        .where(Datacenter.user_id == current_user.id)
    )
    datacenter = result.scalar_one_or_none()
    
    if not datacenter:
        raise HTTPException(status_code=404, detail="Datacenter not found")
    
    # Get device
    device_result = await db.execute(
        select(Device)
        .where(Device.id == device_id)
        .where(Device.datacenter_id == datacenter_id)
    )
    device = device_result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    # Update fields
    update_data = device_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)
    
    await db.commit()
    await db.refresh(device)
    return device


@router.delete("/{datacenter_id}/devices/{device_id}")
async def delete_device(
    datacenter_id: int,
    device_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a device"""
    # Verify datacenter ownership
    result = await db.execute(
        select(Datacenter)
        .where(Datacenter.id == datacenter_id)
        .where(Datacenter.user_id == current_user.id)
    )
    datacenter = result.scalar_one_or_none()
    
    if not datacenter:
        raise HTTPException(status_code=404, detail="Datacenter not found")
    
    # Get device
    device_result = await db.execute(
        select(Device)
        .where(Device.id == device_id)
        .where(Device.datacenter_id == datacenter_id)
    )
    device = device_result.scalar_one_or_none()
    
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    await db.delete(device)
    await db.commit()
    return {"message": "Device deleted successfully"}
