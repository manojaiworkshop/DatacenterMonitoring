# ====================================
# Multi-Stage Dockerfile: Dual Terminal Application
# Combined Backend (FastAPI + Socket.IO) + Frontend (React + Vite)
# ====================================

# ====================================
# Stage 1: Build Frontend
# ====================================
FROM node:18-alpine AS frontend-builder

WORKDIR /build

# Copy package files
COPY frontend/package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy frontend source files
COPY frontend/ ./

# Build frontend for production
ENV VITE_API_URL=/api
ENV VITE_WS_URL=
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.html

# ====================================
# Stage 2: Build Backend with PyInstaller
# ====================================
FROM python:3.11-slim AS backend-builder

WORKDIR /build

# Install system dependencies for building
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libffi-dev \
    libssl-dev \
    binutils \
    upx-ucl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install PyInstaller
RUN pip install --no-cache-dir pyinstaller==6.3.0

# Copy backend source code
COPY backend/ ./backend/

# Build the executable with PyInstaller
WORKDIR /build/backend
RUN pyinstaller --clean dual-terminal.spec

# Verify the executable was created
RUN ls -la /build/backend/dist/ && test -f /build/backend/dist/dual-terminal-backend

# ====================================
# Stage 3: Final Combined Image (Minimal Runtime - NO PYTHON!)
# ====================================
FROM python:3.11-slim

# Install only runtime dependencies (no Python needed!)
RUN apt-get update && apt-get install -y \
    nginx \
    curl \
    supervisor \
    openssh-client \
    ca-certificates \
    iputils-ping \
    && rm -rf /var/lib/apt/lists/*

# Create application directory
WORKDIR /app

# Copy the compiled executable from builder (NO SOURCE CODE!)
COPY --from=backend-builder /build/backend/dist/dual-terminal-backend /app/dual-terminal-backend

# Make it executable
RUN chmod +x /app/dual-terminal-backend

# Copy environment template
COPY backend/.env.example /app/.env

# Copy frontend build to nginx
COPY --from=frontend-builder /build/dist /usr/share/nginx/html

# Remove default nginx configuration
RUN rm -f /etc/nginx/sites-enabled/default

# Create nginx configuration for the dual terminal app
RUN cat > /etc/nginx/conf.d/default.conf <<'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;

    # Frontend - Serve static files
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
        
        # No cache for HTML files
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
            add_header Pragma "no-cache";
            add_header Expires "0";
        }
    }

    # Backend API proxy (REST endpoints)
    location /api/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
    
    # API docs endpoints
    location ~ ^/(docs|redoc|openapi.json) {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO WebSocket proxy
    location /socket.io/ {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeout settings
        proxy_read_timeout 3600;
        proxy_connect_timeout 3600;
        proxy_send_timeout 3600;
        
        # Buffering
        proxy_buffering off;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# Create supervisord configuration
RUN cat > /etc/supervisord.conf <<'EOF'
[supervisord]
nodaemon=true
user=root
logfile=/dev/stdout
logfile_maxbytes=0
loglevel=info
pidfile=/var/run/supervisord.pid

[program:backend]
command=/app/dual-terminal-backend
directory=/app
autostart=true
autorestart=true
startretries=5
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
priority=10

[program:nginx]
command=nginx -g 'daemon off;'
autostart=true
autorestart=true
startretries=3
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
priority=999
EOF

# Create directories for logs and data
RUN mkdir -p /app/data /app/logs

# Create database directory (for SQLite)
RUN mkdir -p /app/data/db

# Copy .env.example to .env (can be overridden with volume mount)
COPY backend/.env.example /app/backend/.env

# Set DATABASE_URL to use /app/data directory
RUN sed -i 's|DATABASE_URL=sqlite+aiosqlite:///./app.db|DATABASE_URL=sqlite+aiosqlite:////app/data/db/app.db|g' /app/backend/.env

# ====================================
# Security: Clean up unnecessary files
# ====================================
RUN echo "Cleaning up unnecessary files..." && \
    # Clean up frontend source maps and TypeScript files
    find /usr/share/nginx/html -type f \( -name "*.map" -o -name "*.ts" -o -name "*.tsx" \) -delete 2>/dev/null || true && \
    # Clean up temporary files
    rm -rf /tmp/* && \
    echo "Cleanup completed - Backend is now a standalone executable!"

# Expose port 80 (nginx serves both frontend and proxies backend)
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Set environment variables (no Python needed!)
ENV SERVER_PORT=8000 \
    SERVER_HOST=0.0.0.0

# Create a volume for persistent data
VOLUME ["/app/data"]

# Start supervisord to manage both backend executable and nginx
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
