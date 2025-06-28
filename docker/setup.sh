#!/bin/bash
# Quick setup script for Paperless-ngx + POCOmeta deployment

set -e

echo "=== Paperless-ngx + POCOmeta Setup ==="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo "✓ Docker found"

# Create environment file if it doesn't exist
if [ ! -f paperless.env ]; then
    echo "📝 Creating paperless.env from template..."
    cp paperless.env.example paperless.env
    
    # Generate secret key
    SECRET_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    sed -i "s/change-me-to-a-random-string/$SECRET_KEY/" paperless.env
    
    echo "✓ Created paperless.env with random secret key"
    echo "⚠️  Please edit paperless.env to customize settings"
else
    echo "✓ paperless.env already exists"
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p /home/paperless/paperless-ngx/{data,media,export,consume,db,redisdata}
echo "✓ Directories created"

# Build the image
echo "🔨 Building Paperless + POCOmeta image..."
docker compose build

echo "✓ Image built successfully"

# Ask if user wants to start services
read -p "🚀 Start services now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting services..."
    docker compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    echo "✅ Services started!"
    echo
    echo "Next steps:"
    echo "1. Create admin user: docker compose run --rm webserver createsuperuser"
    echo "2. Access Paperless at: http://localhost:8000"
    echo "3. Upload documents and tag them with 'NEW' for POCOmeta processing"
    echo "4. Check logs: docker compose logs -f webserver"
else
    echo "Services not started. Run 'docker compose up -d' when ready."
fi

echo
echo "=== Setup Complete ==="
echo "Configuration file: paperless.env"
echo "Add your rules to: ../rules/"
echo "Documentation: DEPLOYMENT.md"