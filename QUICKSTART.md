# ⚡ Quick Start Guide

Get the Background Agent Platform running in 5 minutes.

## 🎯 Prerequisites

- Docker & Docker Compose installed
- 2GB RAM available
- Ports 8000, 8501, 6379 free

## 🚀 Launch in 3 Commands

```bash
# 1. Clone and enter directory
git clone <repo-url> && cd background-agent-platform

# 2. Create environment file
cp .env.example .env

# 3. Start everything
docker compose up -d --build
```

## ✅ Verify It's Working

```bash
# Check all services are running
docker compose ps

# Test the API
curl http://localhost:8000/health

# Open the GUI
open http://localhost:8501  # or visit in browser
```

## 🎮 Try Your First Job

### Option 1: Using the GUI

1. Open http://localhost:8501
2. Select "summarize_text" from dropdown
3. Enter text: "The quick brown fox jumps over the lazy dog. This is a test."
4. Click "Submit Job"
5. Watch it process in real-time!

### Option 2: Using curl

```bash
# Create a job
curl -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{
    "flow": "summarize_text",
    "payload": {"text": "Your text here..."}
  }'

# Copy the task_id from response, then check status
curl http://localhost:8000/jobs/{task_id}/status
```

## 📊 View Metrics

```bash
curl http://localhost:8000/metrics
```

## 🛑 Stop Everything

```bash
docker compose down
```

## 🔧 Common Issues

### "Port already in use"

```bash
# Find what's using the port
lsof -i :8000  # or :8501, :6379

# Kill it or change ports in docker-compose.yml
```

### "Cannot connect to Docker daemon"

```bash
# Start Docker Desktop (Mac/Windows)
# Or start Docker service (Linux)
sudo systemctl start docker
```

### "Worker not processing jobs"

```bash
# Check worker logs
docker logs bg-agent-worker

# Restart worker
docker compose restart worker
```

## 📚 Next Steps

- Read [README.md](README.md) for full documentation
- See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
- Check [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for architecture details
- Add custom workflows (see README "Adding a New Workflow")

## 🎓 Example Workflows

### Summarize Text

```json
{
  "flow": "summarize_text",
  "payload": {
    "text": "Long article or document text..."
  }
}
```

### Generate Report

```json
{
  "flow": "generate_report",
  "payload": {
    "data": {
      "sales": [100, 200, 150],
      "months": ["Jan", "Feb", "Mar"]
    }
  }
}
```

### Extract Entities

```json
{
  "flow": "extract_entities",
  "payload": {
    "text": "Apple Inc. CEO Tim Cook announced new products in Cupertino."
  }
}
```

### Periodic Cleanup

```json
{
  "flow": "periodic_cleanup",
  "payload": {
    "directory": "/tmp/test_cleanup",
    "days_old": 30
  }
}
```

### Scheduled Backup

```json
{
  "flow": "scheduled_backup",
  "payload": {
    "source_folder": "/tmp/backup_test",
    "backup_name": "my_backup"
  }
}
```

## 🐛 Debug Mode

```bash
# Run with logs visible
docker compose up

# Or follow logs after starting
docker compose logs -f
```

## 🧪 Run Tests

```bash
# Install pytest
pip install pytest pytest-asyncio

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_api.py -v
```

## 💡 Tips

- Use the GUI for interactive testing
- Use the API for automation
- Check `/metrics` for monitoring
- Enable auto-refresh in GUI for real-time updates
- Set `GPT_INFERENCE_URL` in `.env` to your actual GPT endpoint

---

**Need help?** Open an issue or check the full [README.md](README.md)
