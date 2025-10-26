# VPS Deployment Guide - Gemini CLI OpenAI Worker

This guide explains how to deploy the Gemini CLI OpenAI Worker on a VPS without using Cloudflare Workers. This setup runs on traditional Node.js with local storage.

## 🚀 Quick Start

### Prerequisites

- Ubuntu/Debian VPS with root access
- Domain name (optional, but recommended for production)
- At least 512MB RAM, 1GB recommended

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker and Docker Compose (optional, for containerized deployment)
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Install nginx (for reverse proxy)
sudo apt install -y nginx certbot python3-certbot-nginx

# Install PM2 for process management (alternative to systemd)
sudo npm install -g pm2
```

### 2. Get OAuth2 Credentials

Follow the same steps as the Cloudflare deployment:

1. Install Gemini CLI: `npm install -g @google/gemini-cli`
2. Run `gemini` and authenticate
3. Copy credentials from `~/.gemini/oauth_creds.json`

### 3. Deploy the Application

#### Option A: Direct Node.js Deployment

```bash
# Clone the repository
git clone https://github.com/GewoonJaap/gemini-cli-openai.git
cd gemini-cli-openai

# Install dependencies
npm install

# Build the application
npm run build:node

# Create environment file
cp .env.example .env
# Edit .env with your credentials
```

Edit `.env`:
```bash
# Required: OAuth2 credentials
GCP_SERVICE_ACCOUNT={"access_token":"ya29...","refresh_token":"1//...","scope":"...","token_type":"Bearer","id_token":"eyJ...","expiry_date":1750927763467}

# Optional: API key for authentication
OPENAI_API_KEY=sk-your-secret-api-key-here

# Optional: Thinking features
ENABLE_REAL_THINKING=true
ENABLE_FAKE_THINKING=false
STREAM_THINKING_AS_CONTENT=true

# Server configuration
PORT=8787
NODE_ENV=production
```

#### Option B: Docker Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/GewoonJaap/gemini-cli-openai.git
cd gemini-cli-openai

# Create environment file
cp .env.example .env
# Edit .env with your credentials

# Build and start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

#### Option C: PM2 Process Management

```bash
# Install dependencies and build
npm install
npm run build:node

# Start with PM2
pm2 start dist/server.js --name "gemini-worker"
pm2 startup
pm2 save

# Check status
pm2 status
pm2 logs gemini-worker
```

#### Option D: Systemd Service

```bash
# Create a dedicated user
sudo useradd -r -s /bin/false gemini-worker

# Create application directory
sudo mkdir -p /opt/gemini-cli-openai
sudo chown gemini-worker:gemini-worker /opt/gemini-cli-openai

# Copy application files
sudo cp -r . /opt/gemini-cli-openai/
sudo chown -R gemini-worker:gemini-worker /opt/gemini-cli-openai

# Copy systemd service file
sudo cp gemini-worker.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start the service
sudo systemctl enable gemini-worker
sudo systemctl start gemini-worker

# Check status
sudo systemctl status gemini-worker
sudo journalctl -u gemini-worker -f
```

### 4. Configure Nginx Reverse Proxy

```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/gemini-worker

# Edit the configuration
sudo nano /etc/nginx/sites-available/gemini-worker
# Change 'your-domain.com' to your actual domain

# Enable the site
sudo ln -s /etc/nginx/sites-available/gemini-worker /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

### 5. SSL Certificate (Let's Encrypt)

```bash
# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test renewal
sudo certbot renew --dry-run
```

### 6. Test the Deployment

```bash
# Test health endpoint
curl https://your-domain.com/health

# Test API
curl https://your-domain.com/v1/models

# Test with authentication (if enabled)
curl -H "Authorization: Bearer sk-your-api-key" \
     https://your-domain.com/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{"model":"gemini-2.0-flash-exp","messages":[{"role":"user","content":"Hello!"}]}'
```

## 📁 File Structure

After deployment, your application structure should look like:

```
/opt/gemini-cli-openai/
├── dist/                 # Compiled JavaScript files
├── src/                  # TypeScript source (for development)
├── data/                 # Local KV storage (persistent)
├── .env                  # Environment variables
├── package.json
├── tsconfig.node.json
└── gemini-worker.service # Systemd service file
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GCP_SERVICE_ACCOUNT` | ✅ | OAuth2 credentials JSON string |
| `OPENAI_API_KEY` | ❌ | API key for authentication |
| `PORT` | ❌ | Server port (default: 8787) |
| `NODE_ENV` | ❌ | Environment (development/production) |

### All Available Environment Variables

```bash
# Core Configuration
GCP_SERVICE_ACCOUNT={"access_token":"...","refresh_token":"...","scope":"...","token_type":"Bearer","id_token":"...","expiry_date":1750927763467}
GEMINI_PROJECT_ID=your-project-id
OPENAI_API_KEY=sk-your-secret-api-key
PORT=8787
NODE_ENV=production

# Thinking & Reasoning
ENABLE_FAKE_THINKING=false
ENABLE_REAL_THINKING=true
STREAM_THINKING_AS_CONTENT=true

# Model & Feature Flags
ENABLE_AUTO_MODEL_SWITCHING=true
ENABLE_GEMINI_NATIVE_TOOLS=true
ENABLE_GOOGLE_SEARCH=true
ENABLE_URL_CONTEXT=true
GEMINI_TOOLS_PRIORITY=native_first
ALLOW_REQUEST_TOOL_CONTROL=false
ENABLE_INLINE_CITATIONS=true
INCLUDE_GROUNDING_METADATA=false

# Content Safety
GEMINI_MODERATION_HARASSMENT_THRESHOLD=BLOCK_ONLY_HIGH
GEMINI_MODERATION_HATE_SPEECH_THRESHOLD=BLOCK_ONLY_HIGH
GEMINI_MODERATION_SEXUALLY_EXPLICIT_THRESHOLD=BLOCK_ONLY_HIGH
GEMINI_MODERATION_DANGEROUS_CONTENT_THRESHOLD=BLOCK_ONLY_HIGH
```

## 🔍 Troubleshooting

### Application Won't Start

```bash
# Check application logs
sudo journalctl -u gemini-worker -f

# Check PM2 logs
pm2 logs gemini-worker

# Check Docker logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Permission Issues

```bash
# Fix data directory permissions
sudo chown -R gemini-worker:gemini-worker /opt/gemini-cli-openai/data

# Fix systemd service permissions
sudo chmod 644 /etc/systemd/system/gemini-worker.service
```

### Port Already in Use

```bash
# Find what's using the port
sudo lsof -i :8787

# Change port in .env
echo "PORT=8788" >> .env
```

### SSL Issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew

# Check nginx configuration
sudo nginx -t
```

## 🔄 Updates

### Update Application

```bash
cd /opt/gemini-cli-openai

# Pull latest changes
git pull origin main

# Rebuild and restart
npm install
npm run build:node

# Restart service
sudo systemctl restart gemini-worker
# OR
pm2 restart gemini-worker
# OR
docker-compose -f docker-compose.prod.yml up -d --build
```

### Update SSL Certificate

```bash
# Renew Let's Encrypt certificate
sudo certbot renew
sudo systemctl reload nginx
```

## 📊 Monitoring

### Health Checks

```bash
# Application health
curl https://your-domain.com/health

# System resources
htop
df -h
free -h
```

### Log Monitoring

```bash
# Systemd logs
sudo journalctl -u gemini-worker -f

# Nginx access logs
sudo tail -f /var/log/nginx/access.log

# Application logs with PM2
pm2 logs gemini-worker --lines 100
```

## 🔒 Security Considerations

1. **Keep dependencies updated**: `npm audit` and `npm update`
2. **Use strong API keys**: Generate random keys for authentication
3. **Firewall**: Configure UFW to only allow necessary ports
4. **SSL**: Always use HTTPS in production
5. **Regular backups**: Backup the `data/` directory
6. **Monitor logs**: Set up log rotation and monitoring

## 🚀 Performance Tuning

### System Limits

```bash
# Increase file descriptors
echo "gemini-worker soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "gemini-worker hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Reload systemd
sudo systemctl daemon-reload
```

### Nginx Optimization

```nginx
# In nginx.conf
worker_processes auto;
worker_connections 1024;

# Buffer settings for streaming
proxy_buffering off;
proxy_request_buffering off;
```

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/GewoonJaap/gemini-cli-openai/issues)
- **Documentation**: [README](https://github.com/GewoonJaap/gemini-cli-openai/blob/main/README.md)
- **Debug endpoints**: `/v1/debug/cache`, `/v1/debug/token-test`

## 🎯 Integration Examples

### Open WebUI

```bash
# Configure Open WebUI to use your VPS
Base URL: https://your-domain.com/v1
API Key: sk-your-api-key
```

### Cline VS Code Extension

```json
{
  "openai": {
    "baseURL": "https://your-domain.com/v1",
    "apiKey": "sk-your-api-key"
  }
}
```

### Python Client

```python
import openai

client = openai.OpenAI(
    base_url="https://your-domain.com/v1",
    api_key="sk-your-api-key"
)

response = client.chat.completions.create(
    model="gemini-2.0-flash-exp",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

**Note**: This VPS deployment provides the same OpenAI-compatible API as the Cloudflare Workers version, but with local storage instead of Cloudflare KV. All features are supported including streaming, thinking models, and tool calling.