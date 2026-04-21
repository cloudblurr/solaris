"""
Pydantic schemas and SQLModel ORM for job tracking.

This module defines the data models for job requests, responses, and database records.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, create_engine, Session, select
from pydantic import BaseModel


# ── Database Models ───────────────────────────────────────────────────────────


class JobRecord(SQLModel, table=True):
    """SQLite record for tracking job status and results.
    
    Attributes:
        task_id: Unique identifier for the job (UUID).
        flow: The workflow type (e.g., 'summarize_text').
        status: Current status ('pending', 'running', 'completed', 'failed').
        payload: JSON-serialized input parameters.
        result: JSON-serialized output or None if not completed.
        error: Error message if status is 'failed', else None.
        created_at: Timestamp when the job was created.
        updated_at: Timestamp of last status update.
        attempts: Number of retry attempts made.
    """
    
    task_id: str = Field(primary_key=True, max_length=36)
    flow: str = Field(max_length=50, index=True)
    status: str = Field(default="pending", max_length=20, index=True)
    payload: str = Field(default="{}")  # JSON string
    result: Optional[str] = Field(default=None)  # JSON string
    error: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    attempts: int = Field(default=0)


# ── Pydantic Schemas ──────────────────────────────────────────────────────────


class JobRequest(BaseModel):
    """Request schema for creating a new job.
    
    Attributes:
        flow: One of the allowed workflow types.
        payload: Flow-specific parameters as a dictionary.
    """
    
    flow: str = Field(
        ...,
        description="One of: summarize_text, generate_report, extract_entities, periodic_cleanup, scheduled_backup"
    )
    payload: dict = Field(..., description="Flow-specific parameters")


class JobResponse(BaseModel):
    """Response schema after job creation.
    
    Attributes:
        task_id: Unique identifier for the created job.
        status: Initial status (always 'pending').
        message: Human-readable confirmation message.
    """
    
    task_id: str
    status: str
    message: str


class JobStatus(BaseModel):
    """Response schema for job status queries.
    
    Attributes:
        task_id: Unique identifier for the job.
        flow: The workflow type.
        status: Current status.
        result: Output data if completed, else None.
        error: Error message if failed, else None.
        created_at: Job creation timestamp.
        updated_at: Last update timestamp.
        attempts: Number of retry attempts.
    """
    
    task_id: str
    flow: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    attempts: int


# ── Database Engine ───────────────────────────────────────────────────────────


# Global engine instance (initialized in db.py)
engine = None


def get_session() -> Session:
    """Dependency for FastAPI to get a database session.
    
    Yields:
        Session: SQLModel database session.
    """
    with Session(engine) as session:
        yield session
