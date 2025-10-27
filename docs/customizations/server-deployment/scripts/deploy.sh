#!/bin/bash
# PieDocs Server Deployment Script
# This script deploys PieDocs with all customizations

set -e

echo "🚀 Starting PieDocs Server Deployment..."

# Configuration
DEPLOY_DIR="/opt/piedocs"
BACKUP_DIR="/opt/piedocs/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   log_error "This script should not be run as root for security reasons"
   exit 1
fi

# Check Docker installation
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check if user is in docker group
if ! groups $USER | grep &>/dev/null '\bdocker\b'; then
    log_error "User is not in docker group. Please add user to docker group and logout/login."
    exit 1
fi

# Create deployment directory
log_info "Creating deployment directory..."
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR
mkdir -p $BACKUP_DIR

# Change to deployment directory
cd $DEPLOY_DIR

# Stop existing containers if running
log_info "Stopping existing containers..."
if [ -f docker-compose.yml ]; then
    docker-compose down --remove-orphans || true
fi

# Backup existing data if present
if [ -d "data" ] || docker volume ls | grep -q piedocs; then
    log_warning "Existing data found. Creating backup..."
    mkdir -p $BACKUP_DIR/pre-deploy-$DATE

    # Backup docker volumes if they exist
    for volume in app elasticsearch postgres rabbitmq redis; do
        if docker volume ls | grep -q "piedocs_$volume"; then
            log_info "Backing up volume: piedocs_$volume"
            docker run --rm -v piedocs_$volume:/data -v $BACKUP_DIR/pre-deploy-$DATE:/backup alpine tar czf /backup/$volume.tar.gz -C /data . || true
        fi
    done
fi

# Copy deployment files
log_info "Copying deployment files..."
cp ../docker/docker-compose.yml .
cp ../docker/.env .
[ -f ../docker/docker-compose.dev.yml ] && cp ../docker/docker-compose.dev.yml .

# Set secure permissions on env file
chmod 600 .env

# Create necessary directories
mkdir -p customizations logs

# Copy customizations
log_info "Installing customizations..."
cp ../customizations/* customizations/ 2>/dev/null || true

# Pull latest images
log_info "Pulling Docker images..."
docker-compose pull

# Start services
log_info "Starting PieDocs services..."
docker-compose --profile all_in_one --profile postgresql --profile rabbitmq --profile redis up -d

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 30

# Check if services are healthy
log_info "Checking service health..."
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
        log_success "PieDocs is ready!"
        break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        log_error "Service failed to start within expected time"
        log_info "Checking logs..."
        docker-compose logs --tail=20 app
        exit 1
    fi

    echo -n "."
    sleep 5
done

# Apply customizations
log_info "Applying customizations..."

# Copy logo and favicon
if [ -f "customizations/PieDocs - New.png" ]; then
    log_info "Installing PieDocs logo and favicon..."
    docker cp "customizations/PieDocs - New.png" piedocs-app-1:/opt/mayan-edms/lib/python3.9/site-packages/mayan/apps/appearance/static/appearance/images/favicon.ico
    log_success "Logo and favicon installed"
fi

# Apply enhanced workflow actions
if [ -f "customizations/workflow_actions.py" ]; then
    log_info "Installing enhanced metadata workflow actions..."
    docker cp "customizations/workflow_actions.py" piedocs-app-1:/opt/mayan-edms/lib/python3.9/site-packages/mayan/apps/metadata/workflow_actions.py
    log_success "Enhanced workflow actions installed"
fi

# Restart to apply customizations
log_info "Restarting application to apply customizations..."
docker-compose restart app

# Wait for restart
sleep 20

# Final health check
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    log_success "✅ PieDocs deployment completed successfully!"
    echo ""
    log_info "🌐 Access your PieDocs system at: http://$(hostname -I | awk '{print $1}'):8080"
    log_info "📁 Admin interface: http://$(hostname -I | awk '{print $1}'):8080/admin/"
    log_info "🔧 Default credentials will be shown on first access"
    echo ""
    log_info "📋 Next steps:"
    echo "   1. Access the web interface"
    echo "   2. Change default admin password"
    echo "   3. Configure document types and metadata"
    echo "   4. Set up workflows and permissions"
    echo "   5. Configure SSL/domain for production"
    echo ""
    log_info "📖 Documentation available in: $DEPLOY_DIR/docs/"
else
    log_error "❌ Deployment completed but service is not responding"
    log_info "Check logs: docker-compose logs app"
    exit 1
fi

# Create maintenance scripts
log_info "Creating maintenance scripts..."
cat > maintenance.sh << 'EOF'
#!/bin/bash
# PieDocs Maintenance Script

case "$1" in
    "backup")
        echo "Creating backup..."
        mkdir -p backups/$(date +%Y%m%d_%H%M%S)
        docker-compose exec -T postgresql pg_dump -U piedocs_user piedocs_db > backups/$(date +%Y%m%d_%H%M%S)/database.sql
        for volume in app elasticsearch postgres rabbitmq redis; do
            docker run --rm -v piedocs_$volume:/data -v $(pwd)/backups/$(date +%Y%m%d_%H%M%S):/backup alpine tar czf /backup/$volume.tar.gz -C /data . 2>/dev/null || true
        done
        echo "Backup completed in backups/$(date +%Y%m%d_%H%M%S)/"
        ;;
    "logs")
        docker-compose logs -f ${2:-app}
        ;;
    "status")
        docker-compose ps
        ;;
    "restart")
        docker-compose restart ${2:-app}
        ;;
    "update")
        docker-compose pull
        docker-compose up -d
        ;;
    *)
        echo "Usage: $0 {backup|logs|status|restart|update}"
        echo "  backup  - Create system backup"
        echo "  logs    - Show logs (optionally specify service)"
        echo "  status  - Show container status"
        echo "  restart - Restart services (optionally specify service)"
        echo "  update  - Update and restart containers"
        ;;
esac
EOF

chmod +x maintenance.sh

log_success "🛠️  Maintenance script created: ./maintenance.sh"
log_info "Use './maintenance.sh status' to check system status"

echo ""
log_success "🎉 PieDocs deployment is complete!"
echo "🌟 Your enterprise document management system is ready to use!"