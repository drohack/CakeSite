# Load Testing Guide

## Quick Test for 50 Concurrent Users

### Prerequisites

Install the testing dependency:
```bash
pip install aiohttp
```

### Running the Test

**1. Start your application:**
```bash
docker-compose up -d
```

**2. Create an active poll:**
- Go to http://localhost:5000/admin
- Either:
  - Start a **Smash or Pass** session, OR
  - Start an **MFK poll**

**3. Run the load test:**
```bash
python load_test.py
```

### What It Tests

The script will:
- ✅ Detect which poll type is active
- ✅ Simulate 50 users connecting simultaneously
- ✅ Each user fetches current vote and submits
- ✅ Measure response times
- ✅ Track success/failure rates
- ✅ Report detailed statistics

### Understanding Results

**Success Rate:**
- **100%** = Perfect! All votes submitted successfully
- **95-99%** = Excellent, minor issues
- **80-94%** = Good, some database contention
- **<80%** = Server struggling with load

**Response Times:**
- **<0.5s average** = Excellent performance
- **0.5-1s average** = Good performance
- **1-2s average** = Acceptable
- **>2s average** = Slow, needs optimization

### Example Output

```
======================================================================
FMK QUIZ - LOAD TESTING TOOL
======================================================================
Testing server at: http://localhost:5000
Concurrent users:  50
Started at:        2026-01-27 10:30:45

Checking for active polls...
✓ Smash or Pass session is active

======================================================================
SMASH OR PASS LOAD TEST
======================================================================
Simulating 50 concurrent users voting on Smash or Pass...

RESULTS:
----------------------------------------------------------------------
Total Users:        50
Successful Votes:   50 (100.0%)
Failed Votes:       0 (0.0%)
Total Time:         1.23 seconds

RESPONSE TIMES:
  Min:     0.045s
  Max:     0.892s
  Average: 0.234s
  Median:  0.198s

======================================================================

LOAD TEST COMPLETED!

RECOMMENDATIONS:
✓ All votes successful! Server handled the load perfectly.
✓ Fast response times (< 0.5s average)
```

### Customizing the Test

**Change number of users:**
Edit `load_test.py` line 14:
```python
NUM_USERS = 100  # Test with 100 users
```

**Change server URL:**
Edit line 13:
```python
BASE_URL = 'http://your-server-ip:5000'
```

### Stress Testing (Advanced)

**Test 100 users:**
```bash
# Edit load_test.py, set NUM_USERS = 100
python load_test.py
```

**Test repeated voting:**
Run the test multiple times in quick succession:
```bash
for i in {1..5}; do
    echo "Run $i"
    python load_test.py
    sleep 2
done
```

**Monitor server during test:**
```bash
# In another terminal
docker-compose logs -f
```

### Expected Performance

**Current Setup (1 worker, SQLite):**
- **50 users:** Should handle easily (95-100% success)
- **100 users:** May see some database locks (80-95% success)
- **200+ users:** Will struggle (needs PostgreSQL)

### Troubleshooting

**"No active voting session found!"**
- Make sure you started a poll/session from the admin panel
- The test only works when voting is active

**High failure rate:**
- Check Docker logs: `docker-compose logs`
- Look for "database is locked" errors
- May need to increase workers or switch to PostgreSQL

**Slow response times:**
- Normal for SQLite under heavy write load
- Consider PostgreSQL for production

### Production Recommendations

**For 100+ concurrent users:**

1. **Use PostgreSQL:**
```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: fmk_quiz
      POSTGRES_USER: fmk
      POSTGRES_PASSWORD: your-password
```

2. **Increase workers:**
```yaml
# docker-compose.yml - fmk-quiz service
command: gunicorn --worker-class eventlet -w 4 --bind 0.0.0.0:5000 app:app
```

3. **Add Redis for sessions:**
```yaml
services:
  redis:
    image: redis:7-alpine
```

4. **Use connection pooling:**
Update `app.py` to use SQLAlchemy connection pooling

### Monitoring

**Watch logs during test:**
```bash
docker-compose logs -f | grep -i error
```

**Check resource usage:**
```bash
docker stats fmk-quiz
```

**Monitor database:**
```bash
# Check database size
ls -lh data/fmk_quiz.db

# Check for locks
sqlite3 data/fmk_quiz.db "PRAGMA busy_timeout;"
```

---

## Summary

Your current setup should easily handle 50 concurrent users for a party or event. The load test will prove it! 🚀
