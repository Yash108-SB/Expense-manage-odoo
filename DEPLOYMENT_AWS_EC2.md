# AWS EC2 Deployment Guide

This guide will help you deploy the Expense Management System on an AWS EC2 instance using Docker Compose.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [AWS EC2 Setup](#aws-ec2-setup)
3. [Security Group Configuration](#security-group-configuration)
4. [Server Setup](#server-setup)
5. [Application Deployment](#application-deployment)
6. [SSL/HTTPS Setup (Optional)](#ssl-https-setup)
7. [Maintenance & Monitoring](#maintenance--monitoring)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- AWS Account
- Basic knowledge of AWS EC2
- SSH key pair for EC2 access
- Domain name (optional, for custom domain and SSL)

## AWS EC2 Setup

### 1. Launch EC2 Instance

1. **Log in to AWS Console** and navigate to EC2
2. **Click "Launch Instance"**
3. **Configure Instance:**
   - **Name:** expense-management-system
   - **AMI:** Ubuntu Server 22.04 LTS (HVM)
   - **Instance Type:** t2.medium or t3.medium (minimum 2 vCPU, 4GB RAM)
   - **Key Pair:** Select or create a new key pair
   - **Network Settings:** Create security group (see below)
   - **Storage:** 20 GB gp3 (minimum)

### 2. Allocate Elastic IP (Recommended)

1. Navigate to **EC2 > Elastic IPs**
2. Click **"Allocate Elastic IP address"**
3. Associate it with your EC2 instance
4. This ensures your IP address doesn't change on restart

## Security Group Configuration

Configure your security group to allow the following inbound traffic:

| Type | Protocol | Port Range | Source | Description |
|------|----------|------------|--------|-------------|
| SSH | TCP | 22 | Your IP | SSH access |
| HTTP | TCP | 80 | 0.0.0.0/0 | Web traffic |
| HTTPS | TCP | 443 | 0.0.0.0/0 | Secure web traffic |
| Custom TCP | TCP | 5000 | Your IP | Backend API (optional, for testing) |

**Security Best Practice:** For SSH, restrict source to your IP address instead of 0.0.0.0/0

## Server Setup

### 1. Connect to EC2 Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add current user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Verify installation
docker --version
```

### 4. Install Docker Compose

```bash
# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make it executable
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker-compose --version
```

### 5. Install Git

```bash
sudo apt install git -y
```

### 6. Log out and log back in

```bash
exit
# Then SSH back in for docker group changes to take effect
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-ip
```

## Application Deployment

### 1. Clone Repository

```bash
cd ~
git clone https://github.com/your-username/expense-management-system.git
cd expense-management-system
```

### 2. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.production.example .env

# Edit the .env file
nano .env
```

**Update the following values:**

```env
# MongoDB Configuration
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=YourSecurePassword123!

# JWT Configuration
JWT_SECRET=YourVerySecureJWTSecretKey123!@#
JWT_EXPIRE=7d

# Frontend URL (use your EC2 public IP or domain)
FRONTEND_URL=http://your-ec2-public-ip

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
EMAIL_FROM=noreply@expensehub.com
EMAIL_FROM_NAME=Expense Management System
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### 3. Build and Start Services

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Press Ctrl+C to exit logs
```

### 4. Verify Deployment

```bash
# Check running containers
docker-compose ps

# All services should be "Up" and healthy
```

### 5. Access Your Application

Open your browser and navigate to:
```
http://your-ec2-public-ip
```

## SSL/HTTPS Setup (Optional but Recommended)

### Prerequisites
- Domain name pointing to your EC2 Elastic IP
- Certbot for Let's Encrypt SSL certificates

### 1. Install Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Update docker-compose.yml

Add nginx-proxy service for SSL termination:

```bash
nano docker-compose.yml
```

Add this service before the frontend service:

```yaml
  nginx-proxy:
    image: nginx:alpine
    container_name: nginx-proxy
    restart: unless-stopped
    ports:
      - "443:443"
    volumes:
      - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt:ro
    depends_on:
      - frontend
    networks:
      - expense-network
```

Update frontend ports section:

```yaml
  frontend:
    # ... other config
    ports:
      - "8080:80"  # Change from "80:80" to "8080:80"
```

### 3. Obtain SSL Certificate

```bash
# Stop docker services temporarily
docker-compose down

# Obtain certificate
sudo certbot certonly --standalone -d your-domain.com

# Restart services
docker-compose up -d
```

### 4. Auto-renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot will auto-renew via cron
```

## Maintenance & Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f mongodb
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Remove unused images
docker image prune -a
```

### Backup MongoDB Data

```bash
# Create backup
docker-compose exec mongodb mongodump --username admin --password your-password --authenticationDatabase admin --out /data/backup

# Copy backup to host
docker cp expense-mongodb:/data/backup ./mongodb-backup-$(date +%Y%m%d)

# Upload to S3 (optional)
aws s3 cp ./mongodb-backup-$(date +%Y%m%d) s3://your-backup-bucket/ --recursive
```

### Restore MongoDB Data

```bash
# Copy backup to container
docker cp ./mongodb-backup-20240101 expense-mongodb:/data/backup

# Restore
docker-compose exec mongodb mongorestore --username admin --password your-password --authenticationDatabase admin /data/backup
```

### Monitor Resource Usage

```bash
# Container stats
docker stats

# Disk usage
df -h

# Docker disk usage
docker system df
```

## Troubleshooting

### 1. Services Won't Start

```bash
# Check logs
docker-compose logs

# Check if ports are in use
sudo netstat -tulpn | grep -E '80|443|5000|27017'

# Remove containers and try again
docker-compose down
docker-compose up -d --build
```

### 2. Cannot Access Application

```bash
# Check if services are running
docker-compose ps

# Check firewall
sudo ufw status

# Allow ports if needed
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check security group in AWS Console
```

### 3. MongoDB Connection Issues

```bash
# Check MongoDB logs
docker-compose logs mongodb

# Verify MongoDB is healthy
docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"

# Check environment variables
docker-compose exec backend env | grep MONGODB
```

### 4. Out of Disk Space

```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a --volumes

# Remove old logs
sudo journalctl --vacuum-time=3d
```

### 5. Performance Issues

```bash
# Check resource usage
docker stats

# Consider upgrading EC2 instance type
# t3.medium → t3.large

# Increase MongoDB memory
# Edit docker-compose.yml and add under mongodb service:
# mem_limit: 2g
```

### 6. Email Not Sending

```bash
# Check email logs
docker-compose logs backend | grep -i email

# Test email configuration
docker-compose exec backend npm run test:email

# Verify Gmail app password
# - Must use App Password, not regular password
# - Enable 2FA on Gmail account first
```

## Scaling & Production Considerations

### 1. Use Managed MongoDB

Consider using **MongoDB Atlas** instead of containerized MongoDB for better reliability:

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/expense_management
```

### 2. Use AWS RDS or DocumentDB

For enterprise deployments, use AWS managed databases.

### 3. Load Balancing

For high availability, use:
- AWS Application Load Balancer
- Multiple EC2 instances
- Auto Scaling Groups

### 4. Monitoring

Set up monitoring with:
- **CloudWatch** for AWS metrics
- **Prometheus + Grafana** for application metrics
- **ELK Stack** for log aggregation

### 5. Backup Strategy

Implement automated backups:
- Daily MongoDB snapshots
- Store in S3 with lifecycle policies
- Test restore procedures regularly

## Cost Optimization

- Use **Reserved Instances** for long-term deployments
- Enable **Auto Scaling** to handle variable load
- Use **Spot Instances** for non-critical environments
- Set up **billing alarms** in AWS CloudWatch

## Security Best Practices

1. **Never commit .env files** to version control
2. **Rotate credentials** regularly
3. **Enable VPC** for network isolation
4. **Use IAM roles** instead of access keys
5. **Enable AWS WAF** for web application firewall
6. **Regular security updates**: `sudo apt update && sudo apt upgrade -y`
7. **Monitor logs** for suspicious activity
8. **Use strong passwords** for all services

## Support

For issues or questions:
- Check application logs: `docker-compose logs`
- Review this documentation
- Check GitHub repository issues
- Contact your system administrator

---

**Last Updated:** 2025-10-04
**Version:** 1.0.0
