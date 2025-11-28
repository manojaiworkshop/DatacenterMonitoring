from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

from app.core.config import settings
from app.core.database import init_db
from app.api.auth import router as auth_router
from app.api.datacenter import router as datacenter_router
from app.api.device_stats import router as device_stats_router
from app.api.socket_handlers import sio
from app.services.device_monitor import device_monitor

# Import models so SQLAlchemy knows about them
from app.models.user import User  # noqa: F401
from app.models.datacenter import Datacenter, Device  # noqa: F401

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(datacenter_router)
app.include_router(device_stats_router)

# Mount Socket.IO
socket_app = socketio.ASGIApp(sio, app)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    await init_db()
    device_monitor.sio = sio  # Pass Socket.IO instance to monitor
    await device_monitor.start()
    print(f"🚀 {settings.APP_NAME} started successfully!")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    await device_monitor.stop()


@app.get("/")
async def root():
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "status": "running"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
