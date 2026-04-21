"""
API endpoint tests.

Tests for job creation, status queries, and error handling.
"""
import pytest
from fastapi.testclient import TestClient
from backend.api import app
from backend.db import init_db


@pytest.fixture(scope="module")
def client():
    """Create a test client for the FastAPI app."""
    init_db()
    return TestClient(app)


def test_create_job_unsupported_flow(client):
    """Test that unsupported flows are rejected with 400 error.
    
    Validates: Requirement that only allowed flows are accepted.
    """
    response = client.post(
        "/jobs",
        json={
            "flow": "write_code",  # Not in ALLOWED_FLOWS
            "payload": {"code": "print('hello')"}
        }
    )
    
    assert response.status_code == 400
    assert "not supported" in response.json()["detail"].lower()
    assert "allowed flows" in response.json()["detail"].lower()


def test_create_job_summarize_text(client):
    """Test successful job creation for summarize_text flow.
    
    Validates: Job creation returns task_id and pending status.
    """
    response = client.post(
        "/jobs",
        json={
            "flow": "summarize_text",
            "payload": {"text": "This is a test paragraph for summarization."}
        }
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "task_id" in data
    assert data["status"] == "pending"
    assert "message" in data


def test_get_job_status_not_found(client):
    """Test that querying a non-existent job returns 404."""
    response = client.get("/jobs/nonexistent-task-id/status")
    
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_health_endpoint(client):
    """Test the health check endpoint."""
    response = client.get("/health")
    
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_root_endpoint(client):
    """Test the root endpoint returns API metadata."""
    response = client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert "service" in data
    assert "allowed_flows" in data
    assert len(data["allowed_flows"]) == 5


def test_metrics_endpoint(client):
    """Test that metrics endpoint returns Prometheus format."""
    response = client.get("/metrics")
    
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]
    assert b"tasks_total" in response.content
