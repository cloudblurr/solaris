"""
RQ worker and job execution functions.

This module defines the worker process that pulls jobs from Redis,
executes them by calling the GPT-OSS inference endpoint, and updates
the database with results.
"""
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any, Dict
import requests
from redis import Redis
from rq import Queue, Retry, Worker
from rq.job import Job

from .db import (
    init_db,
    get_job_record,
    update_job_status,
    job_exists
)

# ── Configuration ─────────────────────────────────────────────────────────────

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
GPT_INFERENCE_URL = os.getenv("GPT_INFERENCE_URL", "http://localhost:8000/generate")
INFERENCE_TIMEOUT = 120  # seconds

# ── Logging Setup ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format='{"time": "%(asctime)s", "level": "%(levelname)s", "message": %(message)s}',
    stream=sys.stdout
)
logger = logging.getLogger(__name__)


# ── Custom Exceptions ─────────────────────────────────────────────────────────


class AllowedFlowError(Exception):
    """Raised when a requested flow is not in the allowed list."""
    pass


# ── Allowed Flows ─────────────────────────────────────────────────────────────


ALLOWED_FLOWS = {
    "summarize_text",
    "generate_report",
    "extract_entities",
    "periodic_cleanup",
    "scheduled_backup"
}


def validate_flow(flow: str) -> None:
    """Validate that the requested flow is allowed.
    
    Args:
        flow: The workflow type to validate.
    
    Raises:
        AllowedFlowError: If the flow is not in ALLOWED_FLOWS.
    """
    if flow not in ALLOWED_FLOWS:
        raise AllowedFlowError(
            f"Sorry, that operation is not supported by this platform. "
            f"Please choose one of the allowed flows: {', '.join(sorted(ALLOWED_FLOWS))}"
        )


# ── GPT Inference Helper ──────────────────────────────────────────────────────


def call_gpt_inference(prompt: str, max_tokens: int = 256, temperature: float = 0.7) -> str:
    """Call the GPT-OSS inference endpoint.
    
    Args:
        prompt: The input prompt for the model.
        max_tokens: Maximum number of tokens to generate.
        temperature: Sampling temperature.
    
    Returns:
        str: The generated text from the model.
    
    Raises:
        requests.RequestException: If the HTTP request fails.
    """
    payload = {
        "prompt": prompt,
        "max_new_tokens": max_tokens,
        "temperature": temperature
    }
    
    logger.info(json.dumps({"action": "gpt_inference_start", "prompt_length": len(prompt)}))
    
    response = requests.post(
        GPT_INFERENCE_URL,
        json=payload,
        timeout=INFERENCE_TIMEOUT
    )
    response.raise_for_status()
    
    result = response.json()
    generated_text = result.get("generated_text", result.get("text", ""))
    
    logger.info(json.dumps({"action": "gpt_inference_complete", "output_length": len(generated_text)}))
    
    return generated_text


# ── Flow Implementations ──────────────────────────────────────────────────────


def summarize_text(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Summarize a block of text using GPT-OSS.
    
    Args:
        payload: Must contain 'text' key with the text to summarize.
    
    Returns:
        dict: Contains 'summary' key with the generated summary.
    
    Raises:
        ValueError: If 'text' is missing from payload.
    """
    text = payload.get("text")
    if not text:
        raise ValueError("Missing required field: 'text'")
    
    prompt = f"Summarize the following text concisely:\n\n{text}\n\nSummary:"
    summary = call_gpt_inference(prompt, max_tokens=256)
    
    return {"summary": summary.strip()}


def generate_report(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a structured report from CSV/JSON data.
    
    Args:
        payload: Must contain 'data' (dict or list) and optional 'format' ('csv' or 'json').
    
    Returns:
        dict: Contains 'report' key with the generated report text.
    
    Raises:
        ValueError: If 'data' is missing from payload.
    """
    data = payload.get("data")
    if not data:
        raise ValueError("Missing required field: 'data'")
    
    data_str = json.dumps(data, indent=2)
    prompt = f"Generate a structured report from the following data:\n\n{data_str}\n\nReport:"
    report = call_gpt_inference(prompt, max_tokens=512)
    
    return {"report": report.strip()}


def extract_entities(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Extract named entities from a paragraph.
    
    Args:
        payload: Must contain 'text' key with the paragraph to analyze.
    
    Returns:
        dict: Contains 'entities' key with extracted entities as a string.
    
    Raises:
        ValueError: If 'text' is missing from payload.
    """
    text = payload.get("text")
    if not text:
        raise ValueError("Missing required field: 'text'")
    
    prompt = (
        f"Extract all named entities (people, organizations, locations, dates) "
        f"from the following text:\n\n{text}\n\nEntities:"
    )
    entities = call_gpt_inference(prompt, max_tokens=256)
    
    return {"entities": entities.strip()}


def periodic_cleanup(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Delete stale files from a configured directory.
    
    Args:
        payload: Must contain 'directory' and 'days_old' (int).
    
    Returns:
        dict: Contains 'deleted_count' and 'deleted_files' list.
    
    Raises:
        ValueError: If required fields are missing or invalid.
    """
    directory = payload.get("directory")
    days_old = payload.get("days_old")
    
    if not directory:
        raise ValueError("Missing required field: 'directory'")
    if days_old is None or not isinstance(days_old, int):
        raise ValueError("Missing or invalid field: 'days_old' (must be an integer)")
    
    # Sanitize path
    dir_path = Path(directory).resolve()
    if not dir_path.exists() or not dir_path.is_dir():
        raise ValueError(f"Directory does not exist or is not a directory: {directory}")
    
    # Security check: prevent absolute paths outside allowed directories
    if os.path.isabs(directory) and not str(dir_path).startswith("/tmp"):
        raise ValueError("Absolute paths are only allowed under /tmp for security reasons")
    
    from datetime import datetime, timedelta
    cutoff_date = datetime.now() - timedelta(days=days_old)
    
    deleted_files = []
    for file_path in dir_path.glob("*"):
        if file_path.is_file():
            file_mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
            if file_mtime < cutoff_date:
                file_path.unlink()
                deleted_files.append(str(file_path))
    
    logger.info(json.dumps({
        "action": "periodic_cleanup",
        "directory": str(dir_path),
        "deleted_count": len(deleted_files)
    }))
    
    return {
        "deleted_count": len(deleted_files),
        "deleted_files": deleted_files
    }


def scheduled_backup(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Archive a folder to DigitalOcean Spaces.
    
    Args:
        payload: Must contain 'source_folder' and 'backup_name'.
    
    Returns:
        dict: Contains 'backup_url' and 'size_bytes'.
    
    Raises:
        ValueError: If required fields are missing or DO credentials are not set.
    """
    source_folder = payload.get("source_folder")
    backup_name = payload.get("backup_name")
    
    if not source_folder:
        raise ValueError("Missing required field: 'source_folder'")
    if not backup_name:
        raise ValueError("Missing required field: 'backup_name'")
    
    # Sanitize path
    source_path = Path(source_folder).resolve()
    if not source_path.exists() or not source_path.is_dir():
        raise ValueError(f"Source folder does not exist: {source_folder}")
    
    # Check for DO Spaces credentials
    do_spaces_key = os.getenv("DO_SPACES_KEY")
    do_spaces_secret = os.getenv("DO_SPACES_SECRET")
    do_spaces_bucket = os.getenv("DO_SPACES_BUCKET", "backups")
    do_spaces_region = os.getenv("DO_SPACES_REGION", "nyc3")
    
    if not do_spaces_key or not do_spaces_secret:
        raise ValueError("DO_SPACES_KEY and DO_SPACES_SECRET environment variables must be set")
    
    # Create tarball
    import tarfile
    import tempfile
    
    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp_file:
        tar_path = tmp_file.name
    
    with tarfile.open(tar_path, "w:gz") as tar:
        tar.add(source_path, arcname=source_path.name)
    
    tar_size = Path(tar_path).stat().st_size
    
    # Upload to DO Spaces using boto3
    import boto3
    
    session = boto3.session.Session()
    client = session.client(
        's3',
        region_name=do_spaces_region,
        endpoint_url=f'https://{do_spaces_region}.digitaloceanspaces.com',
        aws_access_key_id=do_spaces_key,
        aws_secret_access_key=do_spaces_secret
    )
    
    object_key = f"{backup_name}.tar.gz"
    client.upload_file(tar_path, do_spaces_bucket, object_key)
    
    # Clean up temp file
    Path(tar_path).unlink()
    
    backup_url = f"https://{do_spaces_bucket}.{do_spaces_region}.digitaloceanspaces.com/{object_key}"
    
    logger.info(json.dumps({
        "action": "scheduled_backup",
        "source": str(source_path),
        "backup_url": backup_url,
        "size_bytes": tar_size
    }))
    
    return {
        "backup_url": backup_url,
        "size_bytes": tar_size
    }


# ── Job Dispatcher ────────────────────────────────────────────────────────────


FLOW_HANDLERS = {
    "summarize_text": summarize_text,
    "generate_report": generate_report,
    "extract_entities": extract_entities,
    "periodic_cleanup": periodic_cleanup,
    "scheduled_backup": scheduled_backup
}


def execute_job(task_id: str, flow: str, payload: Dict[str, Any]) -> None:
    """Main job execution function called by RQ worker.
    
    This function is idempotent: if a job with the same task_id already exists
    and is completed, it will skip execution.
    
    Args:
        task_id: Unique identifier for the job.
        flow: Workflow type.
        payload: Input parameters.
    
    Raises:
        AllowedFlowError: If the flow is not allowed.
        Exception: Any exception from the flow handler.
    """
    logger.info(json.dumps({
        "action": "job_start",
        "task_id": task_id,
        "flow": flow
    }))
    
    # Idempotency check
    existing_record = get_job_record(task_id)
    if existing_record and existing_record.status == "completed":
        logger.info(json.dumps({
            "action": "job_skip_duplicate",
            "task_id": task_id
        }))
        return
    
    # Validate flow
    validate_flow(flow)
    
    # Update status to running
    update_job_status(task_id, "running", increment_attempts=True)
    
    try:
        # Execute the flow handler
        handler = FLOW_HANDLERS[flow]
        result = handler(payload)
        
        # Update status to completed
        update_job_status(task_id, "completed", result=result)
        
        logger.info(json.dumps({
            "action": "job_complete",
            "task_id": task_id,
            "flow": flow
        }))
        
    except Exception as e:
        error_msg = f"{type(e).__name__}: {str(e)}"
        update_job_status(task_id, "failed", error=error_msg)
        
        logger.error(json.dumps({
            "action": "job_failed",
            "task_id": task_id,
            "flow": flow,
            "error": error_msg
        }))
        
        raise  # Re-raise for RQ retry mechanism


# ── Queue Management ──────────────────────────────────────────────────────────


def get_redis_connection() -> Redis:
    """Get a Redis connection instance.
    
    Returns:
        Redis: Redis client instance.
    """
    return Redis.from_url(REDIS_URL)


def get_queue() -> Queue:
    """Get the RQ queue instance.
    
    Returns:
        Queue: RQ queue for job management.
    """
    redis_conn = get_redis_connection()
    return Queue(connection=redis_conn)


def enqueue_job(task_id: str, flow: str, payload: Dict[str, Any]) -> str:
    """Enqueue a job for background execution.
    
    Args:
        task_id: Unique identifier for the job.
        flow: Workflow type.
        payload: Input parameters.
    
    Returns:
        str: The RQ job ID.
    
    Raises:
        AllowedFlowError: If the flow is not allowed.
    """
    validate_flow(flow)
    
    queue = get_queue()
    
    # Enqueue with retry policy
    job = queue.enqueue(
        execute_job,
        task_id,
        flow,
        payload,
        job_id=task_id,
        retry=Retry(max=5, interval=[10, 30, 60, 120, 300])  # Exponential backoff
    )
    
    logger.info(json.dumps({
        "action": "job_enqueued",
        "task_id": task_id,
        "flow": flow,
        "rq_job_id": job.id
    }))
    
    return job.id


# ── Worker Entry Point ────────────────────────────────────────────────────────


if __name__ == "__main__":
    # Initialize database
    init_db()
    
    # Start RQ worker
    redis_conn = get_redis_connection()
    queue = Queue(connection=redis_conn)
    
    logger.info(json.dumps({"action": "worker_start", "queue": "default"}))
    
    worker = Worker([queue], connection=redis_conn)
    worker.work()
