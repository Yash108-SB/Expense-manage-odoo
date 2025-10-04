# Quick Deployment Guide

Fast-track deployment instructions for AWS EC2.

## 🚀 One-Command Deployment

After setting up your EC2 instance with Docker and Docker Compose:

```bash
# 1. Clone repository
git clone https://github.com/your-username/expense-management-system.git
cd expense-management-system

# 2. Create environment file
cp .env.production.example .env
nano .env  # Edit with your values

# 3. Deploy
docker-compose up -d --build

# 4. Check status
docker-compose ps
```

## 📋 Minimum Requirements

- **EC2 Instance:** t2.medium (2 vCPU, 4GB RAM)
- **Storage:** 20 GB
- **OS:** Ubuntu 22.04 LTS
- **Ports:** 80 (HTTP), 443 (HTTPS), 22 (SSH)

## 🔧 Essential Commands

```bash
# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Update application
git pull && docker-compose up -d --build

# Backup database
docker-compose exec mongodb mongodump --out /data/backup
```

## 🌐 Access Your App

```
http://your-ec2-public-ip
```

## 📖 Detailed Instructions

See [DEPLOYMENT_AWS_EC2.md](./DEPLOYMENT_AWS_EC2.md) for complete setup guide.

## ⚠️ Before You Deploy

1. **Create .env file** with secure credentials
2. **Configure security group** (ports 80, 443, 22)
3. **Allocate Elastic IP** to prevent IP changes
4. **Set up domain** (optional but recommended)
5. **Configure email** (Gmail App Password required)

## 🔐 Security Checklist

- [ ] Changed default MongoDB password
- [ ] Generated strong JWT secret
- [ ] Configured Gmail App Password
- [ ] Restricted SSH to your IP
- [ ] Set up SSL certificate (for production)
- [ ] Enabled firewall rules

## 🆘 Troubleshooting

**Can't access the app?**
```bash
# Check if services are running
docker-compose ps

# View error logs
docker-compose logs backend
docker-compose logs frontend
```

**Port already in use?**
```bash
sudo netstat -tulpn | grep -E '80|443|5000'
sudo systemctl stop apache2  # If Apache is running
```

**Out of memory?**
```bash
# Clean up Docker
docker system prune -a

# Check resources
docker stats
```

## 💡 Pro Tips

1. **Use Elastic IP** - Prevents IP address changes
2. **Enable Auto-backups** - Set up cron jobs for MongoDB dumps
3. **Monitor logs** - Use `docker-compose logs -f` regularly
4. **Update regularly** - `git pull && docker-compose up -d --build`
5. **Set up alerts** - Configure CloudWatch alarms

---

For detailed documentation, see [DEPLOYMENT_AWS_EC2.md](./DEPLOYMENT_AWS_EC2.md)
