# Background Agent Platform

A production-ready background job platform powered by GPT-OSS-120B, built with FastAPI, RQ (Redis Queue), and Streamlit.

## 🏗️ Architecture

- **FastAPI** HTTP service for job submission and status queries
- **RQ Worker** for background job execution with retry logic
- **Redis** as the job queue backend
- **SQLite** for job status persistence
- **Streamlit** GUI for user-friendly job management
- **Prometheus** metrics for monitoring

## 📋 Allowed Workflows

The platform supports **only** the following pre-approved workflows:

1. **`summarize_text`** – Summarize a block of text
2. **`generate_report`** – Generate structured reports from CSV/JSON data
3. **`extract_entities`** – Extract named entities from text
4. **`periodic_cleanup`** – Delete stale files from a directory
5. **`scheduled_backup`** – Archive folders to DigitalOcean Spaces

Any request for unsupported operations will be rejected with a clear error message.

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- (Optional) DigitalOcean Spaces credentials for backup functionality

### 1. Clone and Configure

```bash
git clone <repository-url>
cd background-agent-platform
```

Create a `.env` file with your configuration:

```env
# GPT-OSS Inference Endpoint
GPT_INFERENCE_URL=http://localhost:8000/generate

# DigitalOcean Spaces (optional, for scheduled_backup flow)
DO_SPACES_KEY=your_spaces_key
DO_SPACES_SECRET=your_spaces_secret
DO_SPACES_BUCKET=backups
DO_SPACES_REGION=nyc3
```

### 2. Start All Services

```bash
docker compose up -d --build
```

This will start:
- **Redis** on port 6379
- **FastAPI API** on port 8000
- **RQ Worker** (background process)
- **Streamlit GUI** on port 8501

### 3. Verify Services

Check logs for each service:

```bash
# Redis
docker logs bg-agent-redis

# API
docker logs bg-agent-api

# Worker
docker logs bg-agent-worker

# GUI
docker logs bg-agent-gui
```

### 4. Access the GUI

Open your browser to:

```
http://localhost:8501
```

You can now:
- Select a workflow from the dropdown
- Fill in the required parameters
- Submit jobs and monitor their progress in real-time

## 📡 API Endpoints

### Create a Job

```bash
POST http://localhost:8000/jobs
Content-Type: application/json

{
  "flow": "summarize_text",
  "payload": {
    "text": "Your text to summarize here..."
  }
}
```

Response:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Job created successfully. Use GET /jobs/{task_id}/status to check progress."
}
```

### Check Job Status

```bash
GET http://localhost:8000/jobs/{task_id}/status
```

Response:
```json
{
  "task_id": "550e8400-e29b-41d4-a716-446655440000",
  "flow": "summarize_text",
  "status": "completed",
  "result": {
    "summary": "Generated summary text..."
  },
  "error": null,
  "created_at": "2024-01-15T10:30:00",
  "updated_at": "2024-01-15T10:30:45",
  "attempts": 1
}
```

### Prometheus Metrics

```bash
GET http://localhost:8000/metrics
```

Exposed metrics:
- `tasks_total{flow="..."}` – Total tasks created per flow
- `tasks_success{flow="..."}` – Successful completions per flow
- `tasks_failed{flow="..."}` – Failed tasks per flow
- `queue_depth` – Current number of pending tasks

## 🔧 Adding a New Workflow

To add a new allowed workflow:

### 1. Update `backend/worker.py`

Add the flow name to `ALLOWED_FLOWS`:

```python
ALLOWED_FLOWS = {
    "summarize_text",
    "generate_report",
    "extract_entities",
    "periodic_cleanup",
    "scheduled_backup",
    "your_new_flow"  # Add here
}
```

Create a handler function:

```python
def your_new_flow(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Your flow description.
    
    Args:
        payload: Must contain required fields.
    
    Returns:
        dict: Output data.
    
    Raises:
        ValueError: If validation fails.
    """
    # Validate inputs
    required_field = payload.get("required_field")
    if not required_field:
        raise ValueError("Missing required field: 'required_field'")
    
    # Call GPT-OSS or perform operations
    result = call_gpt_inference(f"Your prompt: {required_field}")
    
    return {"output": result}
```

Register the handler:

```python
FLOW_HANDLERS = {
    # ... existing handlers ...
    "your_new_flow": your_new_flow
}
```

### 2. Update `gui/app.py`

Add the flow to the dropdown and create a form:

```python
flow = st.sidebar.selectbox(
    "Select Workflow",
    [
        # ... existing flows ...
        "your_new_flow"
    ]
)

# Add form section
elif flow == "your_new_flow":
    st.subheader("🆕 Your New Flow")
    st.markdown("Description of what this flow does.")
    
    required_field = st.text_input("Required Field", placeholder="Enter value...")
    payload = {"required_field": required_field}
```

### 3. Restart Services

```bash
docker compose restart api worker gui
```

## 🛡️ Security Features

- **Path Sanitization**: All file paths are validated using `pathlib.Path` and `os.path.isabs`
- **Allowed Paths**: Filesystem operations restricted to `/tmp` for security
- **Input Validation**: Pydantic schemas enforce type safety
- **Idempotency**: Duplicate task IDs are detected and skipped
- **Secrets Management**: All credentials read from environment variables

## 📊 Monitoring

### View Metrics

```bash
curl http://localhost:8000/metrics
```

### Integrate with Prometheus

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'background-agent'
    static_configs:
      - targets: ['localhost:8000']
```

## 🧪 Testing

Run the test suite:

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/ -v
```

## 📁 Project Structure

```
background-agent-platform/
├── backend/
│   ├── __init__.py
│   ├── api.py            # FastAPI application
│   ├── worker.py         # RQ worker and job handlers
│   ├── models.py         # Pydantic schemas and SQLModel ORM
│   ├── db.py             # Database initialization and helpers
│   └── metrics.py        # Prometheus metrics
├── gui/
│   └── app.py            # Streamlit web interface
├── tests/
│   ├── test_api.py       # API endpoint tests
│   └── test_worker.py    # Worker function tests
├── docker-compose.yml    # Multi-container orchestration
├── Dockerfile            # Backend container image
├── requirements.txt      # Python dependencies
└── README.md             # This file
```

## 🔄 Retry Logic

Jobs automatically retry on failure with exponential backoff:

- **Attempt 1**: Immediate
- **Attempt 2**: 10 seconds delay
- **Attempt 3**: 30 seconds delay
- **Attempt 4**: 60 seconds delay
- **Attempt 5**: 120 seconds delay
- **Attempt 6**: 300 seconds delay (final)

After 5 retries, the job is marked as `failed` with the error message stored in the database.

## 🐛 Troubleshooting

### Worker not processing jobs

```bash
# Check worker logs
docker logs bg-agent-worker

# Verify Redis connection
docker exec bg-agent-redis redis-cli ping
```

### API returns 500 errors

```bash
# Check API logs
docker logs bg-agent-api

# Verify database exists
ls -la jobs.db
```

### GUI can't connect to API

```bash
# Check if API is running
curl http://localhost:8000/health

# Verify Docker network
docker network inspect background-agent-platform_default
```

## 📝 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Submit a pull request

---

**Built with ❤️ using FastAPI, RQ, and Streamlit**
