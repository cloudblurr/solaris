# 🚀 Deployment Guide

Complete step-by-step guide for deploying the Background Agent Platform.

## 📋 Prerequisites

- Docker Engine 20.10+ and Docker Compose 2.0+
- 2GB+ RAM available
- Port 8000, 8501, and 6379 available
- (Optional) DigitalOcean Spaces account for backup functionality
- (Optional) GPT-OSS-120B inference endpoint

## 🔧 Step 1: Initial Setup

### Clone the Repository

```bash
git clone <repository-url>
cd background-agent-platform
```

### Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Required: GPT-OSS Inference Endpoint
GPT_INFERENCE_URL=http://your-gpt-server:8000/generate

# Optional: DigitalOcean Spaces (for scheduled_backup flow)
DO_SPACES_KEY=your_access_key
DO_SPACES_SECRET=your_secret_key
DO_SPACES_BUCKET=backups
DO_SPACES_REGION=nyc3
```

**Note**: If you don't have a GPT-OSS endpoint, you can use a mock server for testing (see Testing section below).

## 🐳 Step 2: Build and Start Services

### Build All Containers

```bash
docker compose build
```

Expected output:
```
[+] Building 45.2s (12/12) FINISHED
 => [internal] load build definition from Dockerfile
 => => transferring dockerfile: 32B
 ...
```

### Start All Services

```bash
docker compose up -d
```

Expected output:
```
[+] Running 4/4
 ✔ Container bg-agent-redis   Started
 ✔ Container bg-agent-api     Started
 ✔ Container bg-agent-worker  Started
 ✔ Container bg-agent-gui     Started
```

## ✅ Step 3: Verify Services

### Check Container Status

```bash
docker compose ps
```

Expected output:
```
NAME                IMAGE                      STATUS
bg-agent-redis      redis:7-alpine             Up 30 seconds (healthy)
bg-agent-api        background-agent-api       Up 28 seconds
bg-agent-worker     background-agent-worker    Up 28 seconds
bg-agent-gui        python:3.11-slim           Up 27 seconds
```

### Verify Redis

```bash
docker logs bg-agent-redis
```

Look for:
```
* Ready to accept connections
```

### Verify API

```bash
docker logs bg-agent-api
```

Look for:
```
INFO:     Started server process
INFO:     Waiting for application startup.
[DB] Initialized database at sqlite:///./jobs.db
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

Test the API:
```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status":"healthy","service":"background-agent-api"}
```

### Verify Worker

```bash
docker logs bg-agent-worker
```

Look for:
```
{"time": "...", "level": "INFO", "message": {"action": "worker_start", "queue": "default"}}
```

### Verify GUI

```bash
docker logs bg-agent-gui
```

Look for:
```
You can now view your Streamlit app in your browser.
  URL: http://0.0.0.0:8501
```

## 🌐 Step 4: Access the Application

### Open the Streamlit GUI

Navigate to:
```
http://localhost:8501
```

You should see the Background Agent Platform interface with:
- Workflow selection dropdown
- Dynamic input forms
- Job submission button
- Status tracker

### Test the API Directly

Create a test job:

```bash
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "flow": "summarize_text",
    "payload": {
      "text": "This is a test paragraph. It contains multiple sentences. We want to summarize it."
    }
  }'
```

Expected response:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Job created successfully. Use GET /jobs/{task_id}/status to check progress."
}
```

Check job status:
```bash
curl http://localhost:8000/jobs/{task_id}/status
```

## 📊 Step 5: Monitor with Prometheus (Optional)

### View Metrics

```bash
curl http://localhost:8000/metrics
```

Expected output:
```
# HELP tasks_total Total number of tasks created
# TYPE tasks_total counter
tasks_total{flow="summarize_text"} 1.0
...
```

### Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'background-agent'
    static_configs:
      - targets: ['localhost:8000']
```

Start Prometheus:

```bash
docker run -d \
  --name prometheus \
  --network background-agent-platform_default \
  -p 9090:9090 \
  -v $(pwd)/prometheus.yml:/etc/prometheus/prometheus.yml \
  prom/prometheus
```

Access Prometheus UI at `http://localhost:9090`

## 🧪 Step 6: Run Tests

### Install Test Dependencies

```bash
pip install pytest pytest-asyncio
```

### Run Test Suite

```bash
pytest tests/ -v
```

Expected output:
```
tests/test_api.py::test_create_job_unsupported_flow PASSED
tests/test_api.py::test_create_job_summarize_text PASSED
tests/test_api.py::test_get_job_status_not_found PASSED
tests/test_api.py::test_health_endpoint PASSED
tests/test_api.py::test_root_endpoint PASSED
tests/test_api.py::test_metrics_endpoint PASSED
tests/test_worker.py::test_validate_flow_allowed PASSED
tests/test_worker.py::test_validate_flow_disallowed PASSED
tests/test_worker.py::test_summarize_text_missing_field PASSED
tests/test_worker.py::test_summarize_text_success PASSED
tests/test_worker.py::test_generate_report_missing_field PASSED
tests/test_worker.py::test_generate_report_success PASSED
tests/test_worker.py::test_extract_entities_missing_field PASSED
tests/test_worker.py::test_extract_entities_success PASSED
tests/test_worker.py::test_execute_job_idempotency PASSED
tests/test_worker.py::test_execute_job_success_updates_db PASSED
tests/test_worker.py::test_execute_job_failure_stores_error PASSED

==================== 17 passed in 2.34s ====================
```

## 🔄 Step 7: Test End-to-End Workflow

### 1. Submit a Job via GUI

1. Open `http://localhost:8501`
2. Select "summarize_text" from dropdown
3. Enter text: "The quick brown fox jumps over the lazy dog. This is a classic pangram used in typography."
4. Click "Submit Job"
5. Note the task_id

### 2. Monitor Job Progress

1. Enable "Auto-refresh" checkbox
2. Watch status change: `pending` → `running` → `completed`
3. View the generated summary in the Result section

### 3. Verify Database

```bash
docker exec bg-agent-api sqlite3 /app/jobs.db "SELECT task_id, flow, status FROM JobRecord LIMIT 5;"
```

## 🛠️ Troubleshooting

### Issue: Worker not processing jobs

**Symptoms**: Jobs stay in `pending` status

**Solution**:
```bash
# Check worker logs
docker logs bg-agent-worker

# Restart worker
docker compose restart worker

# Verify Redis connection
docker exec bg-agent-redis redis-cli ping
```

### Issue: API returns 502 errors

**Symptoms**: GUI shows "Failed to create job"

**Solution**:
```bash
# Check API logs
docker logs bg-agent-api

# Verify API is running
curl http://localhost:8000/health

# Restart API
docker compose restart api
```

### Issue: GPT inference timeout

**Symptoms**: Jobs fail with "Request timeout" error

**Solution**:
1. Verify GPT endpoint is accessible:
   ```bash
   curl -X POST $GPT_INFERENCE_URL \
     -H "Content-Type: application/json" \
     -d '{"prompt": "test", "max_new_tokens": 10}'
   ```

2. Increase timeout in `backend/worker.py`:
   ```python
   INFERENCE_TIMEOUT = 240  # Increase to 4 minutes
   ```

3. Rebuild and restart:
   ```bash
   docker compose up -d --build
   ```

### Issue: Permission denied for /tmp operations

**Symptoms**: `periodic_cleanup` or `scheduled_backup` fails

**Solution**:
```bash
# Create test directories with proper permissions
mkdir -p /tmp/cleanup_test /tmp/backup_source
chmod 777 /tmp/cleanup_test /tmp/backup_source

# Verify worker has access
docker exec bg-agent-worker ls -la /tmp
```

## 🔒 Production Deployment

### Security Hardening

1. **Use secrets management**:
   ```bash
   # Use Docker secrets instead of environment variables
   echo "your_secret" | docker secret create do_spaces_key -
   ```

2. **Enable HTTPS**:
   Add nginx reverse proxy:
   ```yaml
   # docker-compose.yml
   nginx:
     image: nginx:alpine
     ports:
       - "443:443"
     volumes:
       - ./nginx.conf:/etc/nginx/nginx.conf
       - ./ssl:/etc/nginx/ssl
   ```

3. **Restrict network access**:
   ```yaml
   # docker-compose.yml
   services:
     redis:
       networks:
         - internal
     api:
       networks:
         - internal
         - external
   ```

### Performance Tuning

1. **Scale workers**:
   ```bash
   docker compose up -d --scale worker=3
   ```

2. **Increase Redis memory**:
   ```yaml
   # docker-compose.yml
   redis:
     command: redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
   ```

3. **Use PostgreSQL instead of SQLite**:
   Update `backend/db.py`:
   ```python
   DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:pass@db:5432/jobs")
   ```

## 📝 Maintenance

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f worker

# Last 100 lines
docker compose logs --tail=100 api
```

### Backup Database

```bash
# Copy database file
docker cp bg-agent-api:/app/jobs.db ./backup-$(date +%Y%m%d).db

# Or use scheduled_backup flow via GUI
```

### Update Application

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build
```

### Clean Up

```bash
# Stop all services
docker compose down

# Remove volumes (WARNING: deletes data)
docker compose down -v

# Remove images
docker compose down --rmi all
```

## 🎯 Next Steps

1. **Add custom workflows** - See README.md "Adding a New Workflow"
2. **Set up monitoring** - Configure Prometheus + Grafana
3. **Enable authentication** - Add API key validation
4. **Scale horizontally** - Deploy multiple worker instances
5. **Implement rate limiting** - Protect against abuse

---

**Need help?** Check the [README.md](README.md) or open an issue on GitHub.
