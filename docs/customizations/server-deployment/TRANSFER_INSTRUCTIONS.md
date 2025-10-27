# How to Transfer PieDocs to Your Server

## Method 1: Using SCP (Recommended)

### From Windows to Linux Server
1. **Install WinSCP or use Windows Subsystem for Linux (WSL)**

2. **Using WinSCP:**
   - Download and install WinSCP
   - Connect to your server using SSH credentials
   - Navigate to the `server-deployment` folder
   - Upload the entire folder to `/tmp/` on your server

3. **Using WSL/PowerShell with SSH:**
   ```powershell
   # From PowerShell in the Pie-Docs directory
   scp -r server-deployment/ user@your-server-ip:/tmp/
   ```

4. **On your server:**
   ```bash
   sudo mv /tmp/server-deployment /opt/piedocs
   sudo chown -R $USER:$USER /opt/piedocs
   cd /opt/piedocs
   ```

## Method 2: Using Git Repository

### Create a Private Repository
1. **Create a private Git repository** (GitHub, GitLab, etc.)

2. **From your Windows machine:**
   ```bash
   cd "C:\Users\Book 3\Desktop\Pivot Pie Projects\Pie-Docs\server-deployment"
   git init
   git add .
   git commit -m "Initial PieDocs deployment package"
   git remote add origin https://github.com/yourusername/piedocs-deployment.git
   git push -u origin main
   ```

3. **On your server:**
   ```bash
   cd /opt
   git clone https://github.com/yourusername/piedocs-deployment.git piedocs
   cd piedocs
   ```

## Method 3: Using Cloud Storage

### Upload to Cloud and Download on Server
1. **Zip the deployment folder:**
   - Right-click on `server-deployment` folder
   - Select "Send to" → "Compressed folder"

2. **Upload to cloud storage** (Google Drive, Dropbox, etc.)

3. **On your server:**
   ```bash
   # Download from cloud (example with wget)
   cd /tmp
   wget "https://your-cloud-link/piedocs-deployment.zip"
   unzip piedocs-deployment.zip
   sudo mv server-deployment /opt/piedocs
   sudo chown -R $USER:$USER /opt/piedocs
   ```

## Method 4: Direct Docker Registry (Advanced)

### Create Custom Docker Image
1. **Build custom image with your modifications:**
   ```bash
   # Create Dockerfile in server-deployment directory
   cat > Dockerfile << EOF
   FROM mayanedms/mayanedms:s4.3
   COPY customizations/workflow_actions.py /opt/mayan-edms/lib/python3.9/site-packages/mayan/apps/metadata/
   COPY customizations/PieDocs\ -\ New.png /opt/mayan-edms/lib/python3.9/site-packages/mayan/apps/appearance/static/appearance/images/favicon.ico
   EOF

   docker build -t your-registry/piedocs:latest .
   docker push your-registry/piedocs:latest
   ```

2. **Update docker-compose.yml to use your image**

## Server Preparation Commands

Regardless of transfer method, run these on your server first:

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

# Create deployment directory
sudo mkdir -p /opt/piedocs
sudo chown $USER:$USER /opt/piedocs

# Install useful tools
sudo apt install -y htop curl wget unzip git

# Configure firewall
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8080
sudo ufw --force enable

# Logout and login to apply Docker group
exit
```

## Quick Verification

After transfer, verify files are in place:

```bash
cd /opt/piedocs
ls -la

# You should see:
# README.md
# docker/
# customizations/
# scripts/
# docs/

# Verify script permissions
chmod +x scripts/*.sh

# Check environment file
ls -la docker/.env
```

## Security Notes

⚠️ **IMPORTANT**: Before deployment, edit `docker/.env` and change all default passwords:

```bash
nano docker/.env

# Change these lines:
MAYAN_DATABASE_PASSWORD=Your_Secure_Password_Here
MAYAN_RABBITMQ_PASSWORD=Your_Secure_Password_Here
MAYAN_REDIS_PASSWORD=Your_Secure_Password_Here
```

## Next Steps

Once files are transferred and passwords changed:

```bash
cd /opt/piedocs
./scripts/deploy.sh
```

The deployment script will handle everything else automatically!

## Troubleshooting Transfer Issues

### Permission Problems
```bash
sudo chown -R $USER:$USER /opt/piedocs
chmod +x scripts/*.sh
```

### Large File Transfer Issues
```bash
# If transfer is slow/fails, try rsync:
rsync -avz --progress server-deployment/ user@server:/opt/piedocs/
```

### Network Issues
```bash
# Test connectivity first:
ping your-server-ip
ssh user@your-server-ip "echo 'Connection successful'"
```

Choose the method that works best for your setup. Method 1 (SCP) is usually the most straightforward for most users.