# FMK Quiz - Deployment Guide

## Quick Deployment Options

### Option 1: Docker Compose (Easiest)

```bash
# 1. Add images to the images/ folder

# 2. Start the application
docker-compose up -d

# 3. Access the application
open http://localhost:5000

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Option 2: Unraid Deployment

#### Method A: Using Docker Compose on Unraid

1. **Copy project to Unraid**:
   ```bash
   scp -r MarryFKill_Quiz root@unraid-ip:/mnt/user/appdata/
   ```

2. **SSH into Unraid**:
   ```bash
   ssh root@unraid-ip
   cd /mnt/user/appdata/MarryFKill_Quiz
   ```

3. **Add images**:
   ```bash
   # Copy images to the images/ folder
   cp /path/to/your/images/* ./images/
   ```

4. **Start with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

#### Method B: Using Unraid Docker UI

1. **Build the image** (on your PC or Unraid):
   ```bash
   cd MarryFKill_Quiz
   docker build -t fmk-quiz .
   ```

2. **Create directories on Unraid**:
   ```bash
   mkdir -p /mnt/user/appdata/fmk-quiz/images
   mkdir -p /mnt/user/appdata/fmk-quiz/data
   ```

3. **Add images**:
   ```bash
   # Copy your images
   cp /path/to/images/* /mnt/user/appdata/fmk-quiz/images/
   ```

4. **In Unraid Docker UI**, add container:
   - **Name**: fmk-quiz
   - **Repository**: fmk-quiz
   - **Network Type**: bridge
   - **Console shell command**: bash
   - **Port**: 5000 (container) → 5000 (host)
   - **Path 1**: /mnt/user/appdata/fmk-quiz/images → /app/images
   - **Path 2**: /mnt/user/appdata/fmk-quiz/data → /app/data
   - **Variable**: SECRET_KEY → your-secret-key-here
   - **Auto-start**: Yes

5. **Start the container**

### Option 3: Development Mode (Local Testing)

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Add images to images/ folder

# 3. Run the development server
python run_dev.py

# Or
python app.py
```

Access at: http://localhost:5000

## Network Configuration

### Local Network Access

For users to access via QR code on same network:

1. **Find server IP**:
   ```bash
   # Linux/Mac
   ifconfig | grep "inet "

   # Windows
   ipconfig
   ```

2. **Users access**: `http://YOUR-SERVER-IP:5000/poll`

### External Access (Behind Router)

1. **Port forwarding** on router:
   - External: Any port (e.g., 5000)
   - Internal: 5000
   - Protocol: TCP
   - IP: Your server's local IP

2. **Dynamic DNS** (if IP changes):
   - Use service like DuckDNS, No-IP
   - Update QR code with domain name

3. **Firewall rules**:
   ```bash
   # Allow port 5000
   sudo ufw allow 5000/tcp
   ```

### Reverse Proxy Setup (Recommended for Production)

#### Using Nginx

1. **Install Nginx**:
   ```bash
   sudo apt install nginx
   ```

2. **Create config** `/etc/nginx/sites-available/fmk-quiz`:
   ```nginx
   server {
       listen 80;
       server_name fmk.yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       location /socket.io {
           proxy_pass http://localhost:5000/socket.io;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
       }
   }
   ```

3. **Enable and restart**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/fmk-quiz /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

4. **Add SSL with Let's Encrypt**:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d fmk.yourdomain.com
   ```

#### Using Traefik (Docker)

1. **Add to docker-compose.yml**:
   ```yaml
   version: '3.8'

   services:
     fmk-quiz:
       build: .
       container_name: fmk-quiz
       volumes:
         - ./images:/app/images
         - ./data:/app/data
       environment:
         - SECRET_KEY=change-this-secret-key
       labels:
         - "traefik.enable=true"
         - "traefik.http.routers.fmk.rule=Host(`fmk.yourdomain.com`)"
         - "traefik.http.routers.fmk.entrypoints=websecure"
         - "traefik.http.routers.fmk.tls.certresolver=letsencrypt"
         - "traefik.http.services.fmk.loadbalancer.server.port=5000"
       networks:
         - traefik

   networks:
     traefik:
       external: true
   ```

## Environment Variables

### Available Options

```bash
# Required in production
SECRET_KEY=your-very-secret-key-here-use-random-string

# Optional
FLASK_ENV=production
FLASK_DEBUG=0
```

### Setting Variables

**Docker Compose**:
```yaml
environment:
  - SECRET_KEY=your-secret-key
  - FLASK_ENV=production
```

**Docker CLI**:
```bash
docker run -e SECRET_KEY='your-secret-key' fmk-quiz
```

**Development**:
```bash
export SECRET_KEY='your-secret-key'
python app.py
```

## Data Persistence

### Important: Backup Your Data

The SQLite database is stored in `data/fmk_quiz.db`. To backup:

```bash
# Copy database
cp data/fmk_quiz.db backup/fmk_quiz_$(date +%Y%m%d).db

# Or backup entire data folder
tar -czf fmk_backup_$(date +%Y%m%d).tar.gz data/ images/
```

### Volume Management

**Docker volumes persist** data across container restarts/rebuilds:
- `./images:/app/images` - Your images
- `./data:/app/data` - Database and runtime data

To reset everything:
```bash
docker-compose down
rm -rf data/*
docker-compose up -d
```

## Monitoring & Logs

### View Logs

**Docker Compose**:
```bash
docker-compose logs -f
docker-compose logs -f --tail=100
```

**Docker**:
```bash
docker logs -f fmk-quiz
```

**Development**:
- Logs print to console

### Health Checks

The docker-compose.yml includes health checks:
```bash
# Check health status
docker ps
# Look for "healthy" in STATUS column
```

Manual health check:
```bash
curl http://localhost:5000/
```

## Performance Tuning

### For Larger Events (100+ users)

1. **Increase workers** (edit docker-compose.yml):
   ```yaml
   command: gunicorn --worker-class eventlet -w 4 --bind 0.0.0.0:5000 app:app
   ```

2. **Use PostgreSQL** instead of SQLite:
   - Add PostgreSQL service to docker-compose.yml
   - Update SQLALCHEMY_DATABASE_URI in app.py

3. **Add Redis** for session storage and Socket.IO scaling

4. **Resource limits** in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '2'
         memory: 2G
   ```

### Optimize Images

Before adding to `images/` folder:
```bash
# Resize large images
mogrify -resize 1000x1000\> -quality 85 images/*.jpg

# Or use ImageMagick
for img in images/*; do
  convert "$img" -resize 1000x1000\> -quality 85 "optimized_$img"
done
```

## Security Hardening

### Production Checklist

- [ ] Change SECRET_KEY to random string
- [ ] Use HTTPS (reverse proxy with SSL)
- [ ] Add admin authentication
- [ ] Restrict CORS origins
- [ ] Disable debug mode
- [ ] Use strong firewall rules
- [ ] Regular backups
- [ ] Keep dependencies updated
- [ ] Monitor logs for issues
- [ ] Rate limit API endpoints

### Adding Admin Authentication (Basic)

Edit `app.py`, add:
```python
from functools import wraps
from flask import request, Response

def check_auth(username, password):
    return username == 'admin' and password == 'your-password'

def authenticate():
    return Response('Login required', 401,
        {'WWW-Authenticate': 'Basic realm="Login Required"'})

def requires_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)
    return decorated

# Apply to admin routes
@app.route('/admin')
@requires_auth
def admin():
    return render_template('admin.html')
```

## Updating the Application

### Update Code

```bash
# Pull latest code
git pull

# Rebuild Docker image
docker-compose down
docker-compose build
docker-compose up -d
```

### Update Dependencies

```bash
# Update requirements.txt
pip install --upgrade -r requirements.txt
pip freeze > requirements.txt

# Rebuild Docker
docker-compose build
```

## Troubleshooting Deployment

### Container won't start
```bash
docker-compose logs
# Check for errors

# Verify image built correctly
docker images | grep fmk-quiz

# Rebuild
docker-compose build --no-cache
```

### Can't access from other devices
- Check firewall settings
- Verify port is open: `netstat -an | grep 5000`
- Test from server: `curl http://localhost:5000`
- Ensure devices are on same network

### Database errors
```bash
# Stop container
docker-compose down

# Remove database
rm data/fmk_quiz.db

# Restart
docker-compose up -d
```

### WebSocket issues
- Hard refresh browser (Ctrl+Shift+R)
- Check browser console for errors
- Verify Socket.IO connection in Network tab
- Ensure reverse proxy forwards WebSocket correctly

## Unraid-Specific Tips

### Template for Unraid

Save as `fmk-quiz.xml`:
```xml
<?xml version="1.0"?>
<Container version="2">
  <Name>fmk-quiz</Name>
  <Repository>fmk-quiz</Repository>
  <Registry>https://hub.docker.com/r/youruser/fmk-quiz</Registry>
  <Network>bridge</Network>
  <Shell>bash</Shell>
  <Privileged>false</Privileged>
  <Support>https://github.com/youruser/fmk-quiz</Support>
  <Project>https://github.com/youruser/fmk-quiz</Project>
  <Overview>Marry F Kill Quiz Application</Overview>
  <Category>Tools:</Category>
  <WebUI>http://[IP]:[PORT:5000]</WebUI>
  <Icon>https://raw.githubusercontent.com/youruser/fmk-quiz/main/icon.png</Icon>
  <Config Name="WebUI" Target="5000" Default="5000" Mode="tcp" Description="Web UI Port" Type="Port" Display="always" Required="true" Mask="false">5000</Config>
  <Config Name="Images" Target="/app/images" Default="/mnt/user/appdata/fmk-quiz/images" Mode="rw" Description="Images Directory" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/fmk-quiz/images</Config>
  <Config Name="Data" Target="/app/data" Default="/mnt/user/appdata/fmk-quiz/data" Mode="rw" Description="Data Directory" Type="Path" Display="always" Required="true" Mask="false">/mnt/user/appdata/fmk-quiz/data</Config>
  <Config Name="Secret Key" Target="SECRET_KEY" Default="change-this-in-production" Mode="" Description="Flask Secret Key" Type="Variable" Display="always" Required="true" Mask="true">change-this-in-production</Config>
</Container>
```

### Auto-start on Unraid Boot

In Docker settings:
- Set **Autostart** to Yes
- Set **Start Order** (optional)

## Support & Resources

- **Documentation**: README.md, QUICKSTART.md, PROJECT_OVERVIEW.md
- **Test Installation**: `python test_install.py`
- **Logs**: Check Docker logs for errors
- **Database**: SQLite browser to inspect data

For issues, check logs and verify:
1. All files present
2. Dependencies installed
3. Ports available
4. Images in correct folder
5. Permissions correct on volumes

---

**Ready to deploy!** Choose your method above and follow the steps.
