# NimbusAI Deployment Quick Reference

## One-Line Initial Deployment

```bash
git clone https://github.com/cloudblurr/NimbusAI.git && cd NimbusAI && chmod +x scripts/deploy.sh && sudo ./scripts/deploy.sh
```

## Essential Commands

### First Time Setup
```bash
sudo ./scripts/deploy.sh
sudo nano /var/www/myapp/.env.local  # Configure environment
sudo systemctl restart nimbusai
```

### Update to Latest Version
```bash
sudo ./scripts/update.sh
```

### Check Application Health
```bash
./scripts/health-check.sh
```

### Emergency Rollback
```bash
sudo ./scripts/rollback.sh
```

### View Live Logs
```bash
sudo journalctl -u nimbusai -f
```

### Service Control
```bash
sudo systemctl status nimbusai    # Check status
sudo systemctl restart nimbusai   # Restart
sudo systemctl stop nimbusai      # Stop
sudo systemctl start nimbusai     # Start
```

## Environment Variables (Required)

```env
DATABASE_URL=postgresql://user:password@host:5432/nimbusai
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://yourdomain.com
DIGITAL_OCEAN_API_TOKEN=your_token
DO_INFERENCE_API_TOKEN=your_token
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Service won't start | `sudo journalctl -u nimbusai -n 50` |
| Port 3000 in use | `sudo lsof -i :3000` then `sudo kill -9 <PID>` |
| Database error | Verify DATABASE_URL, run `npm run setup` |
| Out of disk space | `df -h` then clean with `npm cache clean --force` |
| Need to rollback | `sudo ./scripts/rollback.sh` |

## File Locations

- **Application**: `/var/www/myapp`
- **Environment**: `/var/www/myapp/.env.local`
- **Service**: `/etc/systemd/system/nimbusai.service`
- **Logs**: `journalctl -u nimbusai`

## Deployment Workflow

1. **Merge to main** on GitHub
2. **SSH to Droplet**: `ssh root@your_ip`
3. **Update**: `sudo ./scripts/update.sh`
4. **Verify**: `./scripts/health-check.sh`
5. **Monitor**: `sudo journalctl -u nimbusai -f`

## Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## Performance Monitoring

```bash
# CPU and Memory
top

# Disk Space
df -h /var/www/myapp

# Memory Usage
free -h

# Network
iftop
```

## Useful Links

- [Full Documentation](./DEPLOYMENT_AUTOMATION.md)
- [GitHub Repository](https://github.com/cloudblurr/NimbusAI)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
