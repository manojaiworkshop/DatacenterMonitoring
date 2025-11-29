#!/bin/bash
# Build and Run Script for Data Center Monitoring App

set -e

echo "======================================"
echo "Data Center Monitoring App - Docker Build"
echo "======================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Build the Docker image
print_info "Building Docker image..."
docker-compose build --no-cache

if [ $? -eq 0 ]; then
    print_success "Docker image built successfully!"
else
    print_error "Failed to build Docker image"
    exit 1
fi

# Start the container
print_info "Starting container..."
docker-compose up -d

if [ $? -eq 0 ]; then
    print_success "Container started successfully!"
    echo ""
    print_info "Application is running at: http://localhost"
    print_info "To view logs: docker-compose logs -f"
    print_info "To stop: docker-compose down"
else
    print_error "Failed to start container"
    exit 1
fi

# Wait a bit and check health
sleep 5
print_info "Checking application health..."
if curl -f http://localhost/health > /dev/null 2>&1; then
    print_success "Application is healthy and running!"
else
    print_error "Application health check failed. Check logs with: docker-compose logs"
fi

echo ""
print_success "Setup complete! Visit http://localhost to access the application."
