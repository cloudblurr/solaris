"""
Worker function tests.

Tests for job execution, flow handlers, and error handling.
"""
import pytest
from unittest.mock import patch, MagicMock
from backend.worker import (
    validate_flow,
    AllowedFlowError,
    summarize_text,
    generate_report,
    extract_entities,
    execute_job,
    ALLOWED_FLOWS
)
from backend.db import init_db, create_job_record, get_job_record


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    """Initialize database before tests."""
    init_db()


def test_validate_flow_allowed():
    """Test that allowed flows pass validation."""
    for flow in ALLOWED_FLOWS:
        try:
            validate_flow(flow)
        except AllowedFlowError:
            pytest.fail(f"validate_flow raised AllowedFlowError for allowed flow: {flow}")


def test_validate_flow_disallowed():
    """Test that disallowed flows raise AllowedFlowError."""
    with pytest.raises(AllowedFlowError) as exc_info:
        validate_flow("run_web_scraper")
    
    assert "not supported" in str(exc_info.value).lower()
    assert "allowed flows" in str(exc_info.value).lower()


def test_summarize_text_missing_field():
    """Test that summarize_text raises ValueError for missing 'text' field."""
    with pytest.raises(ValueError) as exc_info:
        summarize_text({"wrong_field": "value"})
    
    assert "text" in str(exc_info.value).lower()


@patch('backend.worker.call_gpt_inference')
def test_summarize_text_success(mock_gpt):
    """Test successful text summarization."""
    mock_gpt.return_value = "This is a summary."
    
    result = summarize_text({"text": "Long text to summarize..."})
    
    assert "summary" in result
    assert result["summary"] == "This is a summary."
    mock_gpt.assert_called_once()


def test_generate_report_missing_field():
    """Test that generate_report raises ValueError for missing 'data' field."""
    with pytest.raises(ValueError) as exc_info:
        generate_report({"wrong_field": "value"})
    
    assert "data" in str(exc_info.value).lower()


@patch('backend.worker.call_gpt_inference')
def test_generate_report_success(mock_gpt):
    """Test successful report generation."""
    mock_gpt.return_value = "Generated report content."
    
    result = generate_report({"data": {"key": "value"}})
    
    assert "report" in result
    assert result["report"] == "Generated report content."
    mock_gpt.assert_called_once()


def test_extract_entities_missing_field():
    """Test that extract_entities raises ValueError for missing 'text' field."""
    with pytest.raises(ValueError) as exc_info:
        extract_entities({"wrong_field": "value"})
    
    assert "text" in str(exc_info.value).lower()


@patch('backend.worker.call_gpt_inference')
def test_extract_entities_success(mock_gpt):
    """Test successful entity extraction."""
    mock_gpt.return_value = "Person: John Doe, Location: New York"
    
    result = extract_entities({"text": "John Doe lives in New York."})
    
    assert "entities" in result
    assert "John Doe" in result["entities"]
    mock_gpt.assert_called_once()


@patch('backend.worker.call_gpt_inference')
@patch('backend.worker.update_job_status')
def test_execute_job_idempotency(mock_update, mock_gpt):
    """Test that execute_job skips already-completed jobs (idempotency).
    
    Validates: Requirement that workers are idempotent.
    """
    task_id = "test-idempotent-task"
    
    # Create a completed job record
    create_job_record(task_id, "summarize_text", {"text": "test"})
    from backend.db import update_job_status as db_update
    db_update(task_id, "completed", result={"summary": "already done"})
    
    # Execute job - should skip
    execute_job(task_id, "summarize_text", {"text": "test"})
    
    # Verify GPT was not called
    mock_gpt.assert_not_called()


@patch('backend.worker.call_gpt_inference')
def test_execute_job_success_updates_db(mock_gpt):
    """Test that successful job execution updates database status.
    
    Validates: Requirement that job results are stored in DB.
    """
    task_id = "test-success-task"
    mock_gpt.return_value = "Summary result"
    
    # Create job record
    create_job_record(task_id, "summarize_text", {"text": "test text"})
    
    # Execute job
    execute_job(task_id, "summarize_text", {"text": "test text"})
    
    # Verify database was updated
    record = get_job_record(task_id)
    assert record is not None
    assert record.status == "completed"
    assert record.result is not None
    assert "summary" in record.result


@patch('backend.worker.call_gpt_inference')
def test_execute_job_failure_stores_error(mock_gpt):
    """Test that job failures store error messages in DB.
    
    Validates: Requirement that exceptions are caught and stored.
    """
    task_id = "test-failure-task"
    mock_gpt.side_effect = Exception("GPT inference failed")
    
    # Create job record
    create_job_record(task_id, "summarize_text", {"text": "test"})
    
    # Execute job - should catch exception
    with pytest.raises(Exception):
        execute_job(task_id, "summarize_text", {"text": "test"})
    
    # Verify error was stored
    record = get_job_record(task_id)
    assert record is not None
    assert record.status == "failed"
    assert record.error is not None
    assert "GPT inference failed" in record.error
