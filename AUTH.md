# HTTP Basic Authentication

## 🔒 Security Implementation

All admin pages and API endpoints now require HTTP Basic Authentication.

### Protected Routes:

**Admin Pages:**
- `/admin` - Home page
- `/admin/mfk` - MFK Admin panel
- `/admin/smashpass` - Smash or Pass Admin panel
- `/admin/images/manage` - Image Manager (Upload/Rename/Delete)
- `/slideshow` - Image Slideshow

**Admin API Endpoints:**
- All `/admin/*` routes
- All `/smashpass/session/*` management routes
- All `/smashpass/sessions/*` routes

### Public Routes (No Auth Required):

**User Voting Pages:**
- `/` - Unified voting page (S/P or MFK)
- `/poll` - MFK voting (redirects to `/`)
- `/smashpass` - S/P voting (redirects to `/`)

**Public API:**
- `/vote/current` - Get active vote
- `/poll/current` - Get active MFK poll
- `/poll/submit` - Submit MFK vote
- `/smashpass/current` - Get active S/P session
- `/smashpass/vote` - Submit S/P vote
- `/smashpass/qr` - Get QR code
- `/admin/qr` - Get MFK QR code
- `/images/*` - Serve image files

---

## 🔑 Credentials

**Default Credentials:**
- **Username:** `admin`
- **Password:** `admin123`

### Setting Custom Password:

**Method 1: Environment Variable (Recommended)**

Edit `docker-compose.yml`:
```yaml
environment:
  - ADMIN_PASSWORD=your-secure-password-here
```

**Method 2: Docker Run Command**
```bash
docker run -e ADMIN_PASSWORD='your-password' ...
```

**Method 3: .env File**
```bash
# Create .env file
echo "ADMIN_PASSWORD=your-secure-password" > .env

# Docker-compose automatically loads it
docker-compose up -d
```

---

## 🌐 Using the Application

### First Time Access:

1. **Visit any admin page** (e.g., http://localhost:8765/admin)
2. **Browser prompts for credentials:**
   - Username: `admin`
   - Password: `admin123` (or your custom password)
3. **Check "Remember me"** to stay logged in
4. **Click Login**

### Subsequent Visits:

- Browser remembers credentials
- No need to login again (until you close browser or logout)

### Logout:

Most browsers:
- Clear browsing data
- Or restart browser

Chrome/Edge:
- Click lock icon → Clear site data

---

## 📱 Mobile Users (QR Codes):

**Users scanning QR codes DON'T need authentication:**
- QR codes point to `/` (public voting page)
- Users can vote without any login
- Only admins managing the event need credentials

---

## 🔐 Security Features

### File Upload Protection:

**1. Authentication Required:**
- Only authenticated admins can upload

**2. File Type Validation:**
- Only image files allowed: PNG, JPG, JPEG, GIF, WEBP
- Validated by extension AND file content (magic bytes)

**3. File Size Limit:**
- Maximum 10MB per file
- Prevents large file attacks

**4. Filename Sanitization:**
- Special characters removed
- Path traversal prevented
- No directory escapes

**5. Duplicate Prevention:**
- Can't upload file with existing name
- Must rename or delete existing first

**6. Active Poll Protection:**
- Can't delete images in active polls
- Prevents breaking ongoing votes

### Image Operations:

**Upload:**
- Multi-file support
- Real-time validation
- Progress feedback

**Rename:**
- Click image name to edit inline
- Enter to save, Escape to cancel
- Duplicate name checking
- File extension preserved

**Delete:**
- Confirmation dialog required
- Checks for active poll usage
- Removes from database AND disk

---

## 🚀 Deployment Best Practices

### Development:
```yaml
environment:
  - ADMIN_PASSWORD=admin123
```

### Production:
```yaml
environment:
  - ADMIN_PASSWORD=${ADMIN_PASSWORD}  # Load from environment
```

Then set on server:
```bash
export ADMIN_PASSWORD="super-secure-random-password-here"
docker-compose up -d
```

### Behind Reverse Proxy (HTTPS):

**Nginx Example:**
```nginx
server {
    listen 443 ssl;
    server_name cakesite.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8765;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🎯 Usage Examples

### Accessing Admin Panels:

**From browser:**
```
http://your-unraid-ip:8765/admin
→ Prompts for username/password
→ Enter: admin / admin123
→ Access granted to all admin features
```

**From command line (testing):**
```bash
# Test authentication
curl -u admin:admin123 http://localhost:8765/admin/images

# Upload image
curl -u admin:admin123 -F "file=@photo.jpg" http://localhost:8765/admin/images/upload
```

### User Voting (No Auth):

**Mobile users:**
```
Scan QR code → http://your-ip:8765/
→ Vote immediately (no login needed)
```

---

## 🛡️ Security Considerations

### Current Security Level:

**✅ Good for:**
- Private networks (home, office)
- Trusted environments (parties, events)
- Unraid local network

**⚠️ Additional Security Needed For:**
- Public internet exposure
- Untrusted networks
- Production websites

### Recommendations for Public Deployment:

1. **Use HTTPS** (required!)
   - HTTP Basic Auth sends credentials in headers
   - HTTPS encrypts the connection
   - Use Let's Encrypt for free SSL

2. **Strong Password**
   - Minimum 16 characters
   - Random generated password
   - Store in environment variable

3. **Firewall Rules**
   - Limit access to specific IPs if possible
   - Use Cloudflare or similar for DDoS protection

4. **Rate Limiting**
   - Add Flask-Limiter to prevent brute force
   - Limit login attempts

5. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories

---

## 🔍 Troubleshooting

**"401 Unauthorized" Error:**
- Check username is exactly `admin` (lowercase)
- Check password matches ADMIN_PASSWORD env var
- Try clearing browser cache/cookies

**Can't Access Admin Pages:**
- Verify Docker container is running
- Check ADMIN_PASSWORD environment variable is set
- Check browser isn't blocking auth dialogs

**Users Can't Vote:**
- Voting pages (/, /poll) should NOT require auth
- If they do, check route configuration
- QR codes should point to public URLs

**Upload Not Working:**
- Check file size < 10MB
- Check file type is image (PNG/JPG/GIF/WEBP)
- Check browser console for errors

---

## 📝 Summary

✅ All admin functions protected by HTTP Basic Auth
✅ User voting remains public (no login needed)
✅ Secure file upload with validation
✅ Easy to deploy with environment variables
✅ Works great on local networks
✅ Can be upgraded to HTTPS for public use

**Default Credentials:** admin / admin123
**Change in:** docker-compose.yml → ADMIN_PASSWORD

Enjoy your secure image management! 🎉
