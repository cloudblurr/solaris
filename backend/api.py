"""
FastAPI entry-point for the background-agent platform.

This module provides HTTP endpoints for job creation, status queries,
and Prometheus metrics.
"""
from uuid import uuid4
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from .models import JobRequest, JobResponse, JobStatus
from .worker import enqueue_job, AllowedFlowError
from .db import init_db, create_job_record, get_job_record
from .metrics import (
    get_metrics,
    increment_tasks_total,
    increment_tasks_success,
    increment_tasks_failed
)


# ── FastAPI App ───────────────────────────────────────────────────────────────


app = FastAPI(
    title="Background Agent API",
    description="Production-ready background job platform with GPT-OSS integration",
    version="1.0.0"
)


# ── Startup Event ─────────────────────────────────────────────────────────────


@app.on_event("startup")
def startup_event():
    """Initialize database on application startup."""
    init_db()


# ── Endpoints ─────────────────────────────────────────────────────────────────


@app.post("/jobs", response_model=JobResponse, status_code=201)
def create_job(req: JobRequest):
    """Create a new background job.
    
    Args:
        req: Job request containing flow type and payload.
    
    Returns:
        JobResponse: Contains task_id, status, and confirmation message.
    
    Raises:
        HTTPException: 400 if the flow is not allowed or validation fails.
        HTTPException: 500 if job creation fails.
    """
    try:
        # Generate unique task ID
        task_id = str(uuid4())
        
        # Create database record
        create_job_record(task_id, req.flow, req.payload)
        
        # Enqueue job in Redis
        enqueue_job(task_id, req.flow, req.payload)
        
        # Update metrics
        increment_tasks_total(req.flow)
        
        return JobResponse(
            task_id=task_id,
            status="pending",
            message=f"Job created successfully. Use GET /jobs/{task_id}/status to check progress."
        )
        
    except AllowedFlowError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create job: {str(e)}"
        )


@app.get("/jobs/{task_id}/status", response_model=JobStatus)
def get_job_status(task_id: str):
    """Query the status of a job.
    
    Args:
        task_id: Unique identifier for the job.
    
    Returns:
        JobStatus: Current job status, result, and metadata.
    
    Raises:
        HTTPException: 404 if the job is not found.
    """
    record = get_job_record(task_id)
    
    if not record:
        raise HTTPException(status_code=404, detail=f"Job {task_id} not found")
    
    # Parse result if available
    import json
    result = None
    if record.result:
        try:
            result = json.loads(record.result)
        except json.JSONDecodeError:
            result = {"raw": record.result}
    
    # Update success/failure metrics if terminal state
    if record.status == "completed":
        increment_tasks_success(record.flow)
    elif record.status == "failed":
        increment_tasks_failed(record.flow)
    
    return JobStatus(
        task_id=record.task_id,
        flow=record.flow,
        status=record.status,
        result=result,
        error=record.error,
        created_at=record.created_at,
        updated_at=record.updated_at,
        attempts=record.attempts
    )


@app.get("/metrics")
def metrics_endpoint():
    """Expose Prometheus metrics.
    
    Returns:
        Response: Prometheus-formatted metrics.
    """
    return get_metrics()


@app.get("/health")
def health_check():
    """Health check endpoint.
    
    Returns:
        dict: Status message.
    """
    return {"status": "healthy", "service": "background-agent-api"}


@app.get("/")
def root():
    """Root endpoint with API information.
    
    Returns:
        dict: API metadata and available endpoints.
    """
    return {
        "service": "Background Agent API",
        "version": "1.0.0",
        "endpoints": {
            "create_job": "POST /jobs",
            "get_status": "GET /jobs/{task_id}/status",
            "metrics": "GET /metrics",
            "health": "GET /health"
        },
        "allowed_flows": [
            "summarize_text",
            "generate_report",
            "extract_entities",
            "periodic_cleanup",
            "scheduled_backup"
        ]
    }
