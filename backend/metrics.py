"""
Prometheus metrics exporter.

This module exposes metrics for monitoring job queue health and performance.
"""
from prometheus_client import Counter, Gauge, generate_latest, CONTENT_TYPE_LATEST
from fastapi import Response
from .db import get_engine
from sqlmodel import Session, select, func
from .models import JobRecord


# ── Metrics Definitions ───────────────────────────────────────────────────────


tasks_total = Counter(
    "tasks_total",
    "Total number of tasks created",
    ["flow"]
)

tasks_success = Counter(
    "tasks_success",
    "Total number of successfully completed tasks",
    ["flow"]
)

tasks_failed = Counter(
    "tasks_failed",
    "Total number of failed tasks",
    ["flow"]
)

queue_depth = Gauge(
    "queue_depth",
    "Current number of pending tasks in the queue"
)


# ── Metrics Update Functions ──────────────────────────────────────────────────


def increment_tasks_total(flow: str) -> None:
    """Increment the total tasks counter for a specific flow.
    
    Args:
        flow: The workflow type.
    """
    tasks_total.labels(flow=flow).inc()


def increment_tasks_success(flow: str) -> None:
    """Increment the success counter for a specific flow.
    
    Args:
        flow: The workflow type.
    """
    tasks_success.labels(flow=flow).inc()


def increment_tasks_failed(flow: str) -> None:
    """Increment the failed counter for a specific flow.
    
    Args:
        flow: The workflow type.
    """
    tasks_failed.labels(flow=flow).inc()


def update_queue_depth() -> None:
    """Update the queue depth gauge by counting pending jobs in the database."""
    engine = get_engine()
    with Session(engine) as session:
        statement = select(func.count(JobRecord.task_id)).where(
            JobRecord.status == "pending"
        )
        count = session.exec(statement).one()
        queue_depth.set(count)


# ── Metrics Endpoint ──────────────────────────────────────────────────────────


def get_metrics() -> Response:
    """Generate Prometheus metrics response.
    
    Returns:
        Response: FastAPI response with Prometheus metrics in text format.
    """
    # Update queue depth before generating metrics
    update_queue_depth()
    
    metrics_output = generate_latest()
    return Response(content=metrics_output, media_type=CONTENT_TYPE_LATEST)
