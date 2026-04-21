"""
SQLite database initialization and helper functions.

This module sets up the database engine, creates tables, and provides
utility functions for querying and updating job records.
"""
import json
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, create_engine, Session, select
from .models import JobRecord, engine as models_engine


# ── Database Setup ────────────────────────────────────────────────────────────


DATABASE_URL = "sqlite:///./jobs.db"


def init_db() -> None:
    """Initialize the SQLite database and create all tables.
    
    This function should be called once at application startup.
    """
    global models_engine
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
    SQLModel.metadata.create_all(engine)
    
    # Update the global engine in models.py
    import backend.models as models
    models.engine = engine
    
    print(f"[DB] Initialized database at {DATABASE_URL}")


def get_engine():
    """Get the database engine instance.
    
    Returns:
        Engine: SQLModel database engine.
    """
    import backend.models as models
    return models.engine


# ── Helper Functions ──────────────────────────────────────────────────────────


def create_job_record(
    task_id: str,
    flow: str,
    payload: dict
) -> JobRecord:
    """Create a new job record in the database.
    
    Args:
        task_id: Unique identifier for the job.
        flow: Workflow type.
        payload: Input parameters as a dictionary.
    
    Returns:
        JobRecord: The created database record.
    """
    engine = get_engine()
    with Session(engine) as session:
        record = JobRecord(
            task_id=task_id,
            flow=flow,
            status="pending",
            payload=json.dumps(payload),
            attempts=0
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record


def get_job_record(task_id: str) -> Optional[JobRecord]:
    """Retrieve a job record by task_id.
    
    Args:
        task_id: Unique identifier for the job.
    
    Returns:
        JobRecord or None: The job record if found, else None.
    """
    engine = get_engine()
    with Session(engine) as session:
        statement = select(JobRecord).where(JobRecord.task_id == task_id)
        return session.exec(statement).first()


def update_job_status(
    task_id: str,
    status: str,
    result: Optional[dict] = None,
    error: Optional[str] = None,
    increment_attempts: bool = False
) -> None:
    """Update the status and result of a job.
    
    Args:
        task_id: Unique identifier for the job.
        status: New status ('running', 'completed', 'failed').
        result: Output data if completed.
        error: Error message if failed.
        increment_attempts: Whether to increment the attempts counter.
    """
    engine = get_engine()
    with Session(engine) as session:
        statement = select(JobRecord).where(JobRecord.task_id == task_id)
        record = session.exec(statement).first()
        
        if record:
            record.status = status
            record.updated_at = datetime.utcnow()
            
            if result is not None:
                record.result = json.dumps(result)
            
            if error is not None:
                record.error = error
            
            if increment_attempts:
                record.attempts += 1
            
            session.add(record)
            session.commit()


def job_exists(task_id: str) -> bool:
    """Check if a job record already exists (for idempotency).
    
    Args:
        task_id: Unique identifier for the job.
    
    Returns:
        bool: True if the job exists, False otherwise.
    """
    return get_job_record(task_id) is not None
