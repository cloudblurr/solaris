# NimbusAI Deployment Automation Guide

This guide covers automated deployment scripts for NimbusAI on DigitalOcean Droplets.

## Quick Start

### Initial Deployment

1. **SSH into your Droplet:**
   ```bash
   ssh root@your_droplet_ip
   ```

2. **Clone the repository and run the deployment script:**
   ```bash
   git clone https://github.com/cloudblurr/NimbusAI.git
   cd NimbusAI
   chmod +x scripts/deploy.sh
   sudo ./scripts/deploy.sh
   ```

3. **Configure environment variables:**
   ```bash
   sudo nano /var/www/myapp/.env.local
   ```

   Required variables:
   - `DATABASE_URL` - Your database connection string
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Your application URL (e.g., `https://yourdomain.com`)
   - `DIGITAL_OCEAN_API_TOKEN` - Your DigitalOcean API token
   - `DO_INFERENCE_API_TOKEN` - Your DigitalOcean AI inference token

4. **Restart the service:**
   ```bash
   sudo systemctl restart nimbusai
   ```

5. **Verify deployment:**
   ```bash
   sudo systemctl status nimbusai
   ```

## Available Scripts

### 1. `deploy.sh` - Initial Deployment
Performs complete setup including:
- System updates
- Node.js runtime installation
- Repository cloning
- Dependencies installation
- Application build
- Database setup
- Systemd service creation
- Service startup

**Usage:**
```bash
sudo ./scripts/deploy.sh
```

**What it does:**
- ✓ Updates system packages
- ✓ Installs Node.js 20 LTS
- ✓ Clones the repository
- ✓ Installs npm dependencies
- ✓ Builds the Next.js application
- ✓ Sets up environment variables
- ✓ Runs database migrations
- ✓ Creates systemd service
- ✓ Starts the application

### 2. `update.sh` - Update to Latest Version
Pulls the latest code from main and redeploys.

**Usage:**
```bash
sudo ./scripts/update.sh
```

**What it does:**
- ✓ Stops the service
- ✓ Pulls latest changes from main branch
- ✓ Installs updated dependencies
- ✓ Rebuilds the application
- ✓ Runs database migrations
- ✓ Restarts the service

### 3. `health-check.sh` - Monitor Application Health
Checks service status, port listening, HTTP response, disk space, and logs.

**Usage:**
```bash
./scripts/health-check.sh
```

**Checks:**
- Service status
- Port 3000 listening
- HTTP response code
- Disk space usage
- Memory usage
- Recent logs
- Environment variables

### 4. `rollback.sh` - Emergency Rollback
Rolls back to the previous commit if deployment fails.

**Usage:**
```bash
sudo ./scripts/rollback.sh
```

**What it does:**
- ✓ Stops the service
- ✓ Reverts to previous commit
- ✓ Rebuilds the application
- ✓ Restarts the service

## Service Management

### View Service Status
```bash
sudo systemctl status nimbusai
```

### Start Service
```bash
sudo systemctl start nimbusai
```

### Stop Service
```bash
sudo systemctl stop nimbusai
```

### Restart Service
```bash
sudo systemctl restart nimbusai
```

### View Live Logs
```bash
sudo journalctl -u nimbusai -f
```

### View Last 50 Log Lines
```bash
sudo journalctl -u nimbusai -n 50
```

## Environment Variables

Create or edit `/var/www/myapp/.env.local`:

```bash
sudo nano /var/www/myapp/.env.local
```

### Required Variables

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/nimbusai

# NextAuth
NEXTAUTH_SECRET=your_secret_here_generate_with_openssl
NEXTAUTH_URL=https://yourdomain.com

# DigitalOcean
DIGITAL_OCEAN_API_TOKEN=your_do_api_token
DO_INFERENCE_API_TOKEN=your_do_inference_token
```

### Generate NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

## Monitoring & Maintenance

### Daily Health Check
```bash
./scripts/health-check.sh
```

### Check Disk Space
```bash
df -h /var/www/myapp
```

### Check Memory Usage
```bash
free -h
```

### View Application Logs
```bash
sudo journalctl -u nimbusai -f
```

### Check Node.js Version
```bash
node --version
npm --version
```

## Troubleshooting

### Service Won't Start
1. Check logs: `sudo journalctl -u nimbusai -n 50`
2. Verify environment variables: `sudo cat /var/www/myapp/.env.local`
3. Check port availability: `sudo netstat -tlnp | grep 3000`
4. Restart service: `sudo systemctl restart nimbusai`

### Port Already in Use
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill -9 <PID>

# Restart service
sudo systemctl restart nimbusai
```

### Database Connection Error
1. Verify DATABASE_URL in `.env.local`
2. Check database is running and accessible
3. Run migrations: `cd /var/www/myapp && npm run setup`

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean npm cache
npm cache clean --force

# Remove old logs
sudo journalctl --vacuum=100M
```

## Deployment Workflow

### For New Features
1. Merge to main branch on GitHub
2. SSH into Droplet
3. Run: `sudo ./scripts/update.sh`
4. Verify: `./scripts/health-check.sh`

### For Emergency Fixes
1. Merge hotfix to main
2. SSH into Droplet
3. Run: `sudo ./scripts/update.sh`
4. If issues occur: `sudo ./scripts/rollback.sh`

### For Major Updates
1. Test locally
2. Merge to main
3. SSH into Droplet
4. Run: `sudo ./scripts/update.sh`
5. Monitor logs: `sudo journalctl -u nimbusai -f`

## Security Best Practices

1. **Keep secrets secure:**
   - Never commit `.env.local` to git
   - Use strong NEXTAUTH_SECRET
   - Rotate API tokens regularly

2. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

3. **Monitor logs regularly:**
   ```bash
   sudo journalctl -u nimbusai -f
   ```

4. **Use HTTPS:**
   - Set up SSL certificate with Let's Encrypt
   - Update NEXTAUTH_URL to use https://

5. **Backup database:**
   - Regular automated backups
   - Test restore procedures

## Performance Tuning

### Increase Node.js Memory
Edit `/etc/systemd/system/nimbusai.service`:
```ini
Environment="NODE_OPTIONS=--max-old-space-size=2048"
```

Then restart:
```bash
sudo systemctl daemon-reload
sudo systemctl restart nimbusai
```

### Enable Compression
Already configured in Next.js, but verify in logs.

### Monitor Performance
```bash
# Check CPU and memory
top

# Check disk I/O
iostat -x 1

# Check network
iftop
```

## Automated Updates (Optional)

Create a cron job for automatic updates:

```bash
sudo crontab -e
```

Add this line to update daily at 2 AM:
```cron
0 2 * * * /var/www/myapp/scripts/update.sh >> /var/log/nimbusai-update.log 2>&1
```

## Support

For issues or questions:
1. Check logs: `sudo journalctl -u nimbusai -f`
2. Run health check: `./scripts/health-check.sh`
3. Review this guide
4. Check GitHub issues: https://github.com/cloudblurr/NimbusAI/issues

## Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Prisma Deployment](https://www.prisma.io/docs/guides/deployment)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [DigitalOcean App Platform](https://www.digitalocean.com/products/app-platform)
