"""
Streamlit GUI for the background-agent platform.

This web app provides a user-friendly interface for submitting jobs,
monitoring their progress, and viewing results.
"""
import streamlit as st
import requests
import time
import json
from typing import Dict, Any, Optional


# ── Configuration ─────────────────────────────────────────────────────────────


API_BASE_URL = "http://api:8000"  # Docker service name


# ── Helper Functions ──────────────────────────────────────────────────────────


def create_job(flow: str, payload: Dict[str, Any]) -> Optional[Dict]:
    """Submit a job to the API.
    
    Args:
        flow: Workflow type.
        payload: Input parameters.
    
    Returns:
        dict or None: API response if successful, None on error.
    """
    try:
        response = requests.post(
            f"{API_BASE_URL}/jobs",
            json={"flow": flow, "payload": payload},
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        st.error(f"❌ Failed to create job: {str(e)}")
        return None


def get_job_status(task_id: str) -> Optional[Dict]:
    """Query job status from the API.
    
    Args:
        task_id: Unique job identifier.
    
    Returns:
        dict or None: Job status if successful, None on error.
    """
    try:
        response = requests.get(
            f"{API_BASE_URL}/jobs/{task_id}/status",
            timeout=10
        )
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        st.error(f"❌ Failed to fetch status: {str(e)}")
        return None


# ── Streamlit App ─────────────────────────────────────────────────────────────


st.set_page_config(
    page_title="Background Agent Platform",
    page_icon="🤖",
    layout="wide"
)

st.title("🤖 Background Agent Platform")
st.markdown("Submit jobs to the GPT-OSS powered background agent system.")

# ── Sidebar: Flow Selection ───────────────────────────────────────────────────

st.sidebar.header("📋 Job Configuration")

flow = st.sidebar.selectbox(
    "Select Workflow",
    [
        "summarize_text",
        "generate_report",
        "extract_entities",
        "periodic_cleanup",
        "scheduled_backup"
    ],
    help="Choose one of the allowed workflows"
)

st.sidebar.markdown("---")

# ── Dynamic Form Based on Flow ────────────────────────────────────────────────

payload = {}

if flow == "summarize_text":
    st.subheader("📝 Summarize Text")
    st.markdown("Provide a block of text to summarize using GPT-OSS.")
    
    text = st.text_area(
        "Text to Summarize",
        height=200,
        placeholder="Enter the text you want to summarize..."
    )
    payload = {"text": text}

elif flow == "generate_report":
    st.subheader("📊 Generate Report")
    st.markdown("Provide data (JSON or CSV format) to generate a structured report.")
    
    data_format = st.radio("Data Format", ["JSON", "CSV"])
    
    if data_format == "JSON":
        data_input = st.text_area(
            "JSON Data",
            height=200,
            placeholder='{"key": "value", "items": [1, 2, 3]}'
        )
        try:
            data = json.loads(data_input) if data_input else {}
        except json.JSONDecodeError:
            st.warning("⚠️ Invalid JSON format")
            data = {}
    else:
        data_input = st.text_area(
            "CSV Data",
            height=200,
            placeholder="name,age,city\nAlice,30,NYC\nBob,25,LA"
        )
        # Simple CSV parsing
        lines = data_input.strip().split("\n") if data_input else []
        if len(lines) > 1:
            headers = lines[0].split(",")
            rows = [dict(zip(headers, line.split(","))) for line in lines[1:]]
            data = {"headers": headers, "rows": rows}
        else:
            data = {}
    
    payload = {"data": data, "format": data_format.lower()}

elif flow == "extract_entities":
    st.subheader("🔍 Extract Entities")
    st.markdown("Extract named entities (people, organizations, locations) from text.")
    
    text = st.text_area(
        "Text to Analyze",
        height=200,
        placeholder="Enter a paragraph to extract entities from..."
    )
    payload = {"text": text}

elif flow == "periodic_cleanup":
    st.subheader("🗑️ Periodic Cleanup")
    st.markdown("Delete stale files from a directory.")
    
    st.warning("⚠️ For security, only /tmp paths are allowed in production.")
    
    directory = st.text_input(
        "Directory Path",
        value="/tmp/cleanup_test",
        help="Path to the directory to clean up"
    )
    days_old = st.number_input(
        "Delete Files Older Than (days)",
        min_value=1,
        max_value=365,
        value=30,
        help="Files older than this many days will be deleted"
    )
    payload = {"directory": directory, "days_old": days_old}

elif flow == "scheduled_backup":
    st.subheader("💾 Scheduled Backup")
    st.markdown("Archive a folder to DigitalOcean Spaces.")
    
    st.info("ℹ️ Ensure DO_SPACES_KEY and DO_SPACES_SECRET are set in the environment.")
    
    source_folder = st.text_input(
        "Source Folder",
        value="/tmp/backup_source",
        help="Path to the folder to back up"
    )
    backup_name = st.text_input(
        "Backup Name",
        value=f"backup_{int(time.time())}",
        help="Name for the backup archive (without extension)"
    )
    payload = {"source_folder": source_folder, "backup_name": backup_name}

# ── Submit Button ─────────────────────────────────────────────────────────────

st.markdown("---")

if st.button("🚀 Submit Job", type="primary", use_container_width=True):
    # Validate payload
    if not payload or all(v == "" or v == {} for v in payload.values()):
        st.error("❌ Please fill in all required fields.")
    else:
        with st.spinner("Submitting job..."):
            result = create_job(flow, payload)
        
        if result:
            st.success(f"✅ Job created successfully!")
            st.json(result)
            
            # Store task_id in session state for status tracking
            st.session_state["last_task_id"] = result["task_id"]

# ── Status Tracking ───────────────────────────────────────────────────────────

st.markdown("---")
st.subheader("📊 Job Status Tracker")

# Manual task ID input
task_id_input = st.text_input(
    "Task ID",
    value=st.session_state.get("last_task_id", ""),
    placeholder="Enter a task ID to check status"
)

col1, col2 = st.columns([1, 4])

with col1:
    check_status = st.button("🔍 Check Status", use_container_width=True)

with col2:
    auto_refresh = st.checkbox("Auto-refresh (every 3s)", value=False)

if check_status or (auto_refresh and task_id_input):
    if not task_id_input:
        st.warning("⚠️ Please enter a task ID.")
    else:
        status_data = get_job_status(task_id_input)
        
        if status_data:
            # Status badge
            status = status_data["status"]
            if status == "completed":
                st.success(f"✅ Status: **{status.upper()}**")
            elif status == "failed":
                st.error(f"❌ Status: **{status.upper()}**")
            elif status == "running":
                st.info(f"⏳ Status: **{status.upper()}**")
            else:
                st.warning(f"⏸️ Status: **{status.upper()}**")
            
            # Metadata
            col1, col2, col3 = st.columns(3)
            with col1:
                st.metric("Flow", status_data["flow"])
            with col2:
                st.metric("Attempts", status_data["attempts"])
            with col3:
                created = status_data["created_at"].split("T")[0]
                st.metric("Created", created)
            
            # Result or Error
            if status_data.get("result"):
                st.subheader("📄 Result")
                st.json(status_data["result"])
            
            if status_data.get("error"):
                st.subheader("⚠️ Error")
                st.error(status_data["error"])
            
            # Auto-refresh
            if auto_refresh and status in ["pending", "running"]:
                time.sleep(3)
                st.rerun()

# ── Footer ────────────────────────────────────────────────────────────────────

st.markdown("---")
st.markdown(
    "**Background Agent Platform** | Powered by GPT-OSS-120B | "
    "[API Docs](http://api:8000/docs)"
)
