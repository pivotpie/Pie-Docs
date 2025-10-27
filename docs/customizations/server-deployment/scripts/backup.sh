#!/bin/bash
# PieDocs Backup Script
# Creates comprehensive backups of all PieDocs data

set -e

# Configuration
BACKUP_BASE_DIR="/opt/piedocs/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE_DIR/$DATE"
RETENTION_DAYS=30

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

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

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    log_error "docker-compose.yml not found. Please run this script from the PieDocs directory."
    exit 1
fi

log_info "🚀 Starting PieDocs backup process..."

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Get container name
APP_CONTAINER=$(docker-compose ps -q app)
DB_CONTAINER=$(docker-compose ps -q postgresql)

if [ -z "$APP_CONTAINER" ] || [ -z "$DB_CONTAINER" ]; then
    log_error "PieDocs containers are not running. Please start the services first."
    exit 1
fi

# Backup database
log_info "📊 Backing up PostgreSQL database..."
docker exec "$DB_CONTAINER" pg_dump -U piedocs_user -h localhost piedocs_db > "$BACKUP_DIR/database.sql"
gzip "$BACKUP_DIR/database.sql"
log_success "Database backup completed"

# Backup Docker volumes
log_info "💾 Backing up Docker volumes..."

VOLUMES=("app" "postgres" "redis" "rabbitmq")
[ -n "$(docker volume ls -q | grep elasticsearch)" ] && VOLUMES+=("elasticsearch")

for volume in "${VOLUMES[@]}"; do
    volume_name="piedocs_$volume"
    if docker volume ls | grep -q "$volume_name"; then
        log_info "Backing up volume: $volume_name"
        docker run --rm \
            -v "${volume_name}:/data:ro" \
            -v "$BACKUP_DIR:/backup" \
            alpine:latest \
            tar czf "/backup/$volume.tar.gz" -C /data . 2>/dev/null
        log_success "Volume $volume backed up"
    else
        log_warning "Volume $volume_name not found, skipping"
    fi
done

# Backup configuration files
log_info "⚙️  Backing up configuration files..."
cp docker-compose.yml "$BACKUP_DIR/"
cp .env "$BACKUP_DIR/env-backup"
[ -f docker-compose.dev.yml ] && cp docker-compose.dev.yml "$BACKUP_DIR/"

# Create backup manifest
log_info "📋 Creating backup manifest..."
cat > "$BACKUP_DIR/backup-manifest.txt" << EOF
PieDocs Backup Manifest
======================
Backup Date: $(date)
Backup Location: $BACKUP_DIR

Contents:
- database.sql.gz: PostgreSQL database dump
- app.tar.gz: Application data and documents
- postgres.tar.gz: PostgreSQL data directory
- redis.tar.gz: Redis data
- rabbitmq.tar.gz: RabbitMQ data
$([ -f "$BACKUP_DIR/elasticsearch.tar.gz" ] && echo "- elasticsearch.tar.gz: Elasticsearch data")
- docker-compose.yml: Docker Compose configuration
- env-backup: Environment variables (passwords masked)

Docker Information:
$(docker --version)
$(docker-compose --version)

Container Status at Backup Time:
$(docker-compose ps)

Volume Information:
$(docker volume ls | grep piedocs)

System Information:
Hostname: $(hostname)
Disk Usage: $(df -h | grep -E "/$|/opt")
Memory: $(free -h | grep Mem)
EOF

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Backup Size: $BACKUP_SIZE" >> "$BACKUP_DIR/backup-manifest.txt"

# Create restoration script
log_info "🔧 Creating restoration script..."
cat > "$BACKUP_DIR/restore.sh" << 'EOF'
#!/bin/bash
# PieDocs Restore Script
# Restores PieDocs from this backup

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

BACKUP_DIR="$(dirname "$0")"

log_warning "⚠️  This will restore PieDocs from backup and OVERWRITE current data!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    log_info "Restore cancelled"
    exit 0
fi

log_info "🔄 Starting PieDocs restore process..."

# Stop services
log_info "Stopping PieDocs services..."
docker-compose down

# Restore configuration files
log_info "Restoring configuration files..."
cp "$BACKUP_DIR/docker-compose.yml" .
cp "$BACKUP_DIR/env-backup" .env
[ -f "$BACKUP_DIR/docker-compose.dev.yml" ] && cp "$BACKUP_DIR/docker-compose.dev.yml" .

# Remove existing volumes
log_info "Removing existing volumes..."
docker volume rm piedocs_app piedocs_postgres piedocs_redis piedocs_rabbitmq 2>/dev/null || true
docker volume rm piedocs_elasticsearch 2>/dev/null || true

# Start database service only
log_info "Starting database service..."
docker-compose up -d postgresql
sleep 10

# Restore database
log_info "Restoring database..."
gunzip -c "$BACKUP_DIR/database.sql.gz" | docker-compose exec -T postgresql psql -U piedocs_user -d piedocs_db

# Restore volumes
log_info "Restoring volumes..."
for volume_file in "$BACKUP_DIR"/*.tar.gz; do
    if [[ -f "$volume_file" && ! "$volume_file" =~ database ]]; then
        volume_name=$(basename "$volume_file" .tar.gz)
        docker_volume="piedocs_$volume_name"

        log_info "Restoring volume: $docker_volume"
        docker volume create "$docker_volume"
        docker run --rm \
            -v "$docker_volume:/data" \
            -v "$BACKUP_DIR:/backup" \
            alpine:latest \
            tar xzf "/backup/$volume_name.tar.gz" -C /data
    fi
done

# Start all services
log_info "Starting all services..."
docker-compose --profile all_in_one --profile postgresql --profile rabbitmq --profile redis up -d

# Wait for services
log_info "Waiting for services to start..."
sleep 30

# Verify restoration
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    log_success "✅ PieDocs restoration completed successfully!"
    log_info "🌐 Access your restored system at: http://localhost:8080"
else
    log_error "❌ Restoration completed but service is not responding"
    log_info "Check logs: docker-compose logs app"
fi
EOF

chmod +x "$BACKUP_DIR/restore.sh"

# Cleanup old backups
log_info "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_BASE_DIR" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# Final summary
log_success "✅ Backup completed successfully!"
echo ""
log_info "📊 Backup Summary:"
echo "   Location: $BACKUP_DIR"
echo "   Size: $BACKUP_SIZE"
echo "   Files: $(ls -1 "$BACKUP_DIR" | wc -l) files created"
echo ""
log_info "🔄 To restore from this backup:"
echo "   cd $BACKUP_DIR"
echo "   ./restore.sh"
echo ""
log_info "📋 View backup details:"
echo "   cat $BACKUP_DIR/backup-manifest.txt"

# Create latest symlink
rm -f "$BACKUP_BASE_DIR/latest"
ln -s "$BACKUP_DIR" "$BACKUP_BASE_DIR/latest"
log_info "🔗 Latest backup symlink updated"