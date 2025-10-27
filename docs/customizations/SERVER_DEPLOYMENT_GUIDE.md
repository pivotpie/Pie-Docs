# PieDocs Server Deployment Guide

## Overview
This guide provides complete instructions for deploying your customized PieDocs (Mayan EDMS) system to a remote server with all current configurations, customizations, and enhancements.

## System Components

### 1. Core Application
- **Base**: Mayan EDMS 4.3 (mayanedms/mayanedms:s4.3)
- **Brand**: PieDocs customization
- **Port**: 8080 (configurable)

### 2. Infrastructure Services
- **Database**: PostgreSQL 12.10-alpine
- **Message Broker**: RabbitMQ 3.10-management-alpine
- **Cache**: Redis 6.2-alpine
- **Search**: Elasticsearch (optional)

### 3. Custom Enhancements
- Enhanced metadata workflow actions (from v4.6)
- PieDocs branding and favicon
- Auto metadata workflows
- Volume mounting for development

## Pre-requisites

### Server Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended)
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB, Recommended 50GB+
- **CPU**: 2+ cores recommended

### Software Requirements
- Docker Engine 20.10+
- Docker Compose 2.0+
- Git (for deployment)

## Deployment Files Structure

```
piedocs-server/
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── .env
├── customizations/
│   ├── PieDocs - New.png
│   └── workflow_actions.py
├── scripts/
│   ├── deploy.sh
│   ├── backup.sh
│   └── restore.sh
└── docs/
    ├── SERVER_DEPLOYMENT_GUIDE.md
    └── AUTO_METADATA_WORKFLOW_ANALYSIS.md
```

## Server Installation Steps

### Step 1: Prepare Server Environment
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply group changes
```

### Step 2: Deploy PieDocs
```bash
# Create deployment directory
mkdir -p /opt/piedocs
cd /opt/piedocs

# Copy deployment files (details below)
# Run deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### Step 3: Configure Firewall
```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080  # For direct access during setup
sudo ufw enable
```

## Environment Configuration

### Production Environment Variables
```env
# Project Configuration
COMPOSE_PROJECT_NAME=piedocs
COMPOSE_PROFILES=all_in_one,postgresql,rabbitmq,redis

# PieDocs Branding
MAYAN_COMMON_PROJECT_TITLE=PieDocs

# Database Security
MAYAN_DATABASE_NAME=piedocs_db
MAYAN_DATABASE_PASSWORD=<SECURE_PASSWORD>
MAYAN_DATABASE_USER=piedocs_user

# Message Broker Security
MAYAN_RABBITMQ_USER=piedocs_mq
MAYAN_RABBITMQ_PASSWORD=<SECURE_PASSWORD>
MAYAN_RABBITMQ_VHOST=piedocs

# Cache Security
MAYAN_REDIS_PASSWORD=<SECURE_PASSWORD>

# Search Engine (if using)
MAYAN_ELASTICSEARCH_PASSWORD=<SECURE_PASSWORD>

# SSL/Domain Configuration (for production)
MAYAN_TRAEFIK_EXTERNAL_DOMAIN=your-domain.com
MAYAN_TRAEFIK_LETS_ENCRYPT_EMAIL=admin@your-domain.com
MAYAN_TRAEFIK_LETS_ENCRYPT_SERVER=https://acme-v02.api.letsencrypt.org/directory
MAYAN_TRAEFIK_LETS_ENCRYPT_TLS_CHALLENGE=true
```

## Security Considerations

### 1. Password Security
- Use strong, unique passwords for all services
- Consider using Docker secrets for production
- Regular password rotation

### 2. Network Security
- Use reverse proxy (Traefik) for SSL termination
- Disable direct port access in production
- Configure proper firewall rules

### 3. Data Security
- Regular automated backups
- Encrypted storage volumes
- Access logs monitoring

## Backup and Recovery

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/opt/piedocs/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec piedocs-postgresql-1 pg_dump -U piedocs_user piedocs_db > $BACKUP_DIR/db_$DATE.sql

# Backup volumes
docker run --rm -v piedocs_app:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/app_$DATE.tar.gz -C /data .
docker run --rm -v piedocs_elasticsearch:/data -v $BACKUP_DIR:/backup alpine tar czf /backup/elasticsearch_$DATE.tar.gz -C /data .

# Cleanup old backups (keep 7 days)
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

## Monitoring and Maintenance

### Health Checks
```bash
# Check container status
docker ps

# Check logs
docker-compose logs -f app

# Check disk usage
df -h
docker system df
```

### Regular Maintenance
- Weekly log rotation
- Monthly Docker image updates
- Quarterly security updates
- Regular backup verification

## Troubleshooting

### Common Issues
1. **Container startup failures**: Check logs and resource availability
2. **Database connection issues**: Verify network and credentials
3. **Storage issues**: Monitor disk space and volume permissions
4. **Performance issues**: Check resource utilization and scaling options

### Support Resources
- Container logs: `docker-compose logs [service]`
- System resources: `htop`, `iostat`, `free -h`
- Network connectivity: `docker network ls`, `netstat -tlnp`

## Next Steps After Deployment

1. **Initial Setup**: Access web interface and complete initial configuration
2. **User Management**: Create user accounts and permissions
3. **Document Types**: Configure document types and metadata
4. **Workflows**: Set up auto metadata workflows
5. **Integration**: Configure any external integrations
6. **Training**: Train users on PieDocs functionality

## Production Checklist

- [ ] Server security hardening
- [ ] SSL certificate configuration
- [ ] Automated backup setup
- [ ] Monitoring configuration
- [ ] User access controls
- [ ] Document retention policies
- [ ] Disaster recovery testing
- [ ] Performance optimization
- [ ] Security audit
- [ ] Documentation handover