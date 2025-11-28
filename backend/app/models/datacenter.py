from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Datacenter(Base):
    __tablename__ = "datacenters"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Relationships
    devices = relationship("Device", back_populates="datacenter", cascade="all, delete-orphan")
    user = relationship("User", back_populates="datacenters")


class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    device_type = Column(String, nullable=False)  # pc, server, switch, ups
    ip_address = Column(String, nullable=True)
    ssh_port = Column(Integer, default=22)
    ssh_username = Column(String, nullable=True)
    ssh_password = Column(String, nullable=True)  # Encrypted in production
    description = Column(Text, nullable=True)
    status = Column(String, default="offline")  # online, offline, error
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    datacenter_id = Column(Integer, ForeignKey("datacenters.id"), nullable=False)
    
    # Relationships
    datacenter = relationship("Datacenter", back_populates="devices")
