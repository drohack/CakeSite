# Production Update Guide - Folder Organization Feature

## 🔄 Updating to Folder-Based Organization

This update includes database schema changes. Follow these steps carefully.

---

## ⚠️ Important: Database Schema Changes

**New columns:**
- `images.folder` - Which folder the image belongs to
- `smashpass_sessions.folder` - Which folder the session was created from

**New tables:**
- `folders` - Folder metadata

**Migration behavior:**
- On startup, existing images are automatically moved from `images/` to `images/default/`
- All existing polls and S/P sessions are cleared (clean slate)
- Folder records are created for discovered directories

---

## 📋 Deployment Options

### Option A: Fresh Start (Recommended if no critical data)

**Use if:** You don't need to preserve existing poll results

```bash
# 1. Stop the application
docker-compose down

# 2. Pull latest code
git pull origin main

# 3. Backup images (just in case)
cp -r images images_backup

# 4. Remove old database
rm -f data/fmk_quiz.db

# 5. Rebuild and start
docker-compose build
docker-compose up -d

# 6. Verify migration
docker-compose logs | grep -i "migrat"

# 7. Check that images/ folder now has:
ls -la images/
# Should see: default/ folder with all your images moved there
```

**What happens:**
- New database created with new schema ✅
- Images automatically moved to `images/default/` ✅
- Folder records created ✅
- Fresh start with new features ✅

---

### Option B: Preserve Data (Advanced)

**Use if:** You need to keep existing poll results

**⚠️ Warning:** This is complex and requires SQLite knowledge.

```bash
# 1. Stop application
docker-compose down

# 2. Backup everything
cp data/fmk_quiz.db data/fmk_quiz.db.backup
cp -r images images_backup

# 3. Pull latest code
git pull origin main

# 4. Manually alter database
sqlite3 data/fmk_quiz.db

-- Add folder column to images table
ALTER TABLE images ADD COLUMN folder VARCHAR(255);

-- Create folders table
CREATE TABLE folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add folder column to smashpass_sessions
ALTER TABLE smashpass_sessions ADD COLUMN folder VARCHAR(255);

-- Exit SQLite
.exit

# 5. Start application (migration will run)
docker-compose build
docker-compose up -d

# 6. Verify
docker-compose logs -f
```

**What happens:**
- Database schema manually updated ✅
- Old poll data preserved ✅
- Migration moves images to folders ✅
- All features work with old data ✅

---

### Option C: Test First (Safest)

**Use if:** You want to test before production

```bash
# 1. On a TEST server/machine:
git clone <your-repo>
cd MarryFKill_Quiz

# 2. Copy production images to test
scp -r production:/path/to/images/* ./images/

# 3. Run with fresh database
docker-compose up -d

# 4. Test all features:
- Create folders
- Upload images
- Create polls from specific folders
- Create S/P sessions
- Verify everything works

# 5. If all good, deploy to production using Option A or B
```

---

## 🎯 Recommended: Option A (Fresh Start)

**Why:**
- Simplest and safest
- No manual SQL needed
- Auto-migration handles everything
- Old polls are typically not needed long-term

**Steps:**

```bash
# SSH into production server
ssh user@your-server

# Navigate to project
cd /path/to/MarryFKill_Quiz

# Stop app
docker-compose down

# Backup (optional, but recommended)
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz data/ images/

# Pull updates
git pull origin main

# Remove old database (starts fresh)
rm -f data/fmk_quiz.db

# Rebuild and restart
docker-compose build
docker-compose up -d

# Check logs
docker-compose logs -f
# Look for: "Migrating X images to 'default' folder..."
# Look for: "Migration complete!"

# Verify structure
ls -la images/
# Should see: default/ folder

ls -la images/default/
# Should see: All your images

# Test the application
curl http://localhost:8765/
# Should return 200 OK

# Access admin panel
open http://your-server-ip:8765/admin
```

---

## ✅ Post-Deployment Checklist

After deploying, verify:

- [ ] Application starts without errors
- [ ] `images/default/` folder exists with all images
- [ ] Can access admin panel with credentials
- [ ] Folder Manager works (`/admin/folders/manage`)
- [ ] Can create new folders
- [ ] Can upload images to folders
- [ ] Can create MFK polls from specific folders
- [ ] Can create S/P sessions from specific folders
- [ ] Folder dropdown filters images correctly
- [ ] S/P sessions dropdown filters by folder
- [ ] All images display uncropped
- [ ] Mobile voting works on various screen sizes

---

## 🐛 Troubleshooting

### Application won't start after update

```bash
# Check logs
docker-compose logs

# Common issues:
# 1. Database locked - stop container and wait 10 seconds
docker-compose down
sleep 10
docker-compose up -d

# 2. Migration failed - check logs for errors
docker-compose logs | grep -i error

# 3. Missing images - check they're in images/default/
ls -la images/default/
```

### Migration didn't run

```bash
# Check if default folder exists in database
docker-compose exec fmk-quiz python -c "
from database import db, Folder
from app import app
with app.app_context():
    default = Folder.query.filter_by(name='default').first()
    print('Default folder exists:', default is not None)
"

# If not, manually trigger migration:
docker-compose down
rm -f data/fmk_quiz.db
docker-compose up -d
```

### Images not in default folder

```bash
# Check filesystem
ls images/
# Should see: default/ folder (and maybe others)

# If images are still in root:
mkdir -p images/default
mv images/*.png images/*.jpg images/*.jpeg images/*.gif images/*.webp images/default/ 2>/dev/null
docker-compose restart
```

### Database errors about missing columns

```bash
# Nuclear option: fresh database
docker-compose down
rm -f data/fmk_quiz.db
docker-compose up -d
```

---

## 🔄 Rollback Plan

If something goes wrong:

```bash
# 1. Stop application
docker-compose down

# 2. Restore from backup
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# 3. Checkout previous version
git checkout 879e8ac  # Previous commit

# 4. Rebuild and start
docker-compose build
docker-compose up -d
```

---

## 📊 Expected Migration Output

When starting with the new code, you should see:

```
Migrating 8 images to 'default' folder...
  Moved: image1.png
  Moved: image2.jpg
  Moved: image3.png
  ...
Migration complete!
```

Then normal startup:
```
* Running on http://0.0.0.0:5000
* Restarting with stat
* Debugger is active!
```

---

## 💡 Best Practice: Development → Staging → Production

1. **Development**: Test locally first
2. **Staging**: Deploy to test server
3. **Production**: Deploy only after full testing

For this update:
```bash
# Already tested locally ✅
# Now deploy to production with Option A ✅
```

---

## 🎯 Quick Command Reference

```bash
# Full deployment (fresh start)
docker-compose down && \
  git pull origin main && \
  rm -f data/fmk_quiz.db && \
  docker-compose build && \
  docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f

# Verify images moved
ls -la images/default/

# Test application
curl http://localhost:8765/
```

---

## 📞 Need Help?

If issues occur:
1. Check logs: `docker-compose logs`
2. Verify images are in folders: `ls -la images/`
3. Check database exists: `ls -la data/`
4. Review this guide's Troubleshooting section
5. Consider rollback if critical

---

**Ready to deploy!** Follow Option A for the smoothest upgrade. 🚀
