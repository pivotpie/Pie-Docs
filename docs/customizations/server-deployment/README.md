# PieDocs Server Deployment Package

This package contains everything needed to deploy your complete PieDocs system to a remote server.

## 📦 Package Contents

```
server-deployment/
├── README.md                    # This file
├── docker/
│   ├── docker-compose.yml      # Main Docker Compose configuration
│   ├── docker-compose.dev.yml  # Development overrides
│   └── .env                     # Environment variables (EDIT PASSWORDS!)
├── customizations/
│   ├── PieDocs - New.png        # PieDocs logo and favicon
│   └── workflow_actions.py      # Enhanced metadata workflow actions
├── scripts/
│   ├── deploy.sh               # Automated deployment script
│   └── backup.sh               # Backup script
└── docs/
    ├── SERVER_DEPLOYMENT_GUIDE.md
    └── AUTO_METADATA_WORKFLOW_ANALYSIS.md
```

## 🚀 Quick Deployment

### Step 1: Prepare Your Server
```bash
# On your remote server (Ubuntu/Debian):
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply group changes
exit
```

### Step 2: Transfer Deployment Package
```bash
# From your local machine, copy this entire folder to your server:
scp -r server-deployment/ user@your-server:/tmp/

# On your server:
sudo mv /tmp/server-deployment /opt/piedocs
sudo chown -R $USER:$USER /opt/piedocs
cd /opt/piedocs
```

### Step 3: Configure Security
**⚠️ IMPORTANT: Change default passwords before deployment!**

Edit the `.env` file:
```bash
nano docker/.env
```

Change these lines:
```bash
MAYAN_DATABASE_PASSWORD=Your_Secure_DB_Password_Here!
MAYAN_RABBITMQ_PASSWORD=Your_Secure_MQ_Password_Here!
MAYAN_REDIS_PASSWORD=Your_Secure_Redis_Password_Here!
MAYAN_ELASTICSEARCH_PASSWORD=Your_Secure_ES_Password_Here!
```

### Step 4: Deploy PieDocs
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

The deployment script will:
- ✅ Check system requirements
- ✅ Pull Docker images
- ✅ Start all services
- ✅ Apply PieDocs customizations
- ✅ Install enhanced workflows
- ✅ Verify deployment

### Step 5: Configure Firewall
```bash
# Allow web traffic
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080  # Temporary for setup
sudo ufw enable
```

## 🌐 Access Your PieDocs System

After successful deployment:
- **Web Interface**: `http://your-server-ip:8080`
- **Admin Interface**: `http://your-server-ip:8080/admin/`
- **Default Credentials**: Shown on first access

## 🔧 Production Configuration

### SSL/Domain Setup
For production with custom domain, edit `docker/.env`:
```bash
MAYAN_TRAEFIK_EXTERNAL_DOMAIN=piedocs.yourdomain.com
MAYAN_TRAEFIK_LETS_ENCRYPT_EMAIL=admin@yourdomain.com
MAYAN_TRAEFIK_LETS_ENCRYPT_SERVER=https://acme-v02.api.letsencrypt.org/directory
MAYAN_TRAEFIK_LETS_ENCRYPT_TLS_CHALLENGE=true
```

Then add Traefik profile:
```bash
cd /opt/piedocs
docker-compose --profile all_in_one --profile postgresql --profile rabbitmq --profile redis --profile traefik up -d
```

### Performance Tuning
Adjust resource limits in `docker/.env` based on your server:
```bash
MAYAN_MEMORY_LIMIT=4g        # Increase for more RAM
MAYAN_CPU_LIMIT=4.0          # Increase for more CPU cores
MAYAN_WORKER_CONCURRENCY=8   # Increase for better performance
```

## 🛠️ Maintenance

### Daily Operations
```bash
cd /opt/piedocs

# Check status
./maintenance.sh status

# View logs
./maintenance.sh logs

# Restart services
./maintenance.sh restart

# Create backup
./maintenance.sh backup
```

### Automated Backups
Set up daily backups:
```bash
# Add to crontab
crontab -e

# Add this line for daily backups at 2 AM
0 2 * * * cd /opt/piedocs && ./scripts/backup.sh >> /var/log/piedocs-backup.log 2>&1
```

## 🔍 Troubleshooting

### Check Service Status
```bash
docker-compose ps
docker-compose logs app
```

### Common Issues
1. **Port conflicts**: Change port in `docker-compose.yml`
2. **Memory issues**: Increase server RAM or reduce `MAYAN_MEMORY_LIMIT`
3. **Disk space**: Monitor with `df -h` and clean old backups
4. **Network issues**: Check firewall settings and DNS

### Get Help
- Check logs: `docker-compose logs [service-name]`
- System resources: `htop`, `free -h`, `df -h`
- Network: `netstat -tlnp | grep 8080`

## 📋 Post-Deployment Checklist

- [ ] Change default admin password
- [ ] Configure SSL certificate (production)
- [ ] Set up automated backups
- [ ] Configure email notifications
- [ ] Create user accounts and permissions
- [ ] Configure document types and metadata
- [ ] Set up auto metadata workflows
- [ ] Test document upload and processing
- [ ] Configure retention policies
- [ ] Set up monitoring (optional)

## 🎯 What's Included

### PieDocs Customizations
- **Branding**: PieDocs logo and title
- **Favicon**: Custom PieDocs favicon
- **Enhanced Workflows**: Auto metadata assignment
- **Template Support**: Dynamic metadata values

### Enterprise Features
- **Document Management**: Upload, organize, search
- **OCR Processing**: Automatic text extraction
- **Workflow Automation**: Document state management
- **User Management**: Roles and permissions
- **API Access**: REST API for integrations
- **Backup/Restore**: Automated data protection

## 🌟 Success!

Your PieDocs enterprise document management system is now running on your server with all customizations and enhanced workflow capabilities!

For detailed documentation, see `docs/SERVER_DEPLOYMENT_GUIDE.md`.

---
**Need Support?** Check the logs and documentation first, then contact your system administrator.