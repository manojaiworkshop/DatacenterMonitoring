from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class DatacenterCreate(BaseModel):
    name: str
    location: Optional[str] = None


class DatacenterResponse(BaseModel):
    id: int
    name: str
    location: Optional[str]
    created_at: datetime
    user_id: int
    
    class Config:
        from_attributes = True


class DeviceCreate(BaseModel):
    name: str
    device_type: str  # pc, server, switch, ups
    ip_address: Optional[str] = None
    ssh_port: int = 22
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    description: Optional[str] = None
    datacenter_id: int


class DeviceUpdate(BaseModel):
    name: Optional[str] = None
    device_type: Optional[str] = None
    ip_address: Optional[str] = None
    ssh_port: Optional[int] = None
    ssh_username: Optional[str] = None
    ssh_password: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class DeviceResponse(BaseModel):
    id: int
    name: str
    device_type: str
    ip_address: Optional[str]
    ssh_port: int
    ssh_username: Optional[str]
    ssh_password: Optional[str] = None  # Include password for SSH connections
    description: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    datacenter_id: int
    
    class Config:
        from_attributes = True


class DatacenterWithDevices(BaseModel):
    id: int
    name: str
    location: Optional[str]
    created_at: datetime
    devices: List[DeviceResponse] = []
    
    class Config:
        from_attributes = True
