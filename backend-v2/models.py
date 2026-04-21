"""
Data models for dynamic background agents.

Users can create custom agents by describing them in natural language.
The LLM parses the description into structured tasks that run autonomously.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum
from sqlmodel import SQLModel, Field, JSON, Column
from pydantic import BaseModel


# ── Enums ─────────────────────────────────────────────────────────────────────


class TriggerType(str, Enum):
    """How the agent is triggered."""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    EVENT = "event"


class TaskType(str, Enum):
    """Types of tasks an agent can perform."""
    RESEARCH = "research"          # Fetch and analyze web content
    SUMMARIZE = "summarize"        # Summarize text/data
    GENERATE = "generate"          # Generate content
    FILE_MANAGE = "file_manage"    # File operations
    CUSTOM = "custom"              # Custom LLM-defined task


class TaskStatus(str, Enum):
    """Status of an individual task."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class AgentStatus(str, Enum):
    """Status of the entire agent."""
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class IntegrationType(str, Enum):
    """External integrations available to agents."""
    WEB = "web"                    # HTTP requests
    FILE_SYSTEM = "file_system"    # Local file operations
    DATABASE = "database"          # Database queries
    API = "api"                    # External APIs
    CUSTOM = "custom"


# ── Task Models ───────────────────────────────────────────────────────────────


class AgentTask(BaseModel):
    """A single task within an agent's workflow."""
    id: str
    type: TaskType
    instruction: str                    # Natural language instruction
    input_source: Optional[str] = None  # Task ID to use as input
    output_target: Optional[str] = None # Where to store output
    status: TaskStatus = TaskStatus.PENDING
    result: Optional[str] = None
    error: Optional[str] = None
    attempt: int = 0
    duration_ms: Optional[int] = None


# ── Agent Definition ──────────────────────────────────────────────────────────


class AgentDefinition(BaseModel):
    """Complete definition of a background agent."""
    id: str
    user_id: str
    name: str
    description: str                    # User's natural language description
    tasks: List[AgentTask]
    trigger: TriggerType
    schedule: Optional[str] = None      # Cron expression for scheduled agents
    integrations: List[IntegrationType] = []
    status: AgentStatus = AgentStatus.RUNNING
    created_at: datetime
    updated_at: datetime


# ── Database Models ───────────────────────────────────────────────────────────


class AgentRecord(SQLModel, table=True):
    """SQLite record for agent persistence."""
    __tablename__ = "agents"
    
    id: str = Field(primary_key=True, max_length=36)
    user_id: str = Field(index=True, max_length=36)
    name: str = Field(max_length=200)
    description: str
    tasks: str = Field(sa_column=Column(JSON))  # JSON-serialized List[AgentTask]
    trigger: str = Field(max_length=20)
    schedule: Optional[str] = Field(default=None, max_length=100)
    integrations: str = Field(default="[]", sa_column=Column(JSON))
    status: str = Field(default="running", max_length=20, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class LogEntry(BaseModel):
    """Real-time log entry for agent execution."""
    ts: str
    agent_id: str
    task_id: Optional[str] = None
    task_type: Optional[TaskType] = None
    attempt: Optional[int] = None
    event: str  # 'task_start', 'task_complete', 'task_fail', 'agent_complete', 'agent_fail', 'signal'
    message: str
    duration_ms: Optional[int] = None


# ── API Request/Response Models ───────────────────────────────────────────────


class CreateAgentRequest(BaseModel):
    """Request to create a new agent from natural language."""
    description: str = Field(
        ...,
        description="Natural language description of what the agent should do",
        min_length=10,
        max_length=2000
    )
    trigger: TriggerType = TriggerType.MANUAL
    schedule: Optional[str] = None


class CreateAgentResponse(BaseModel):
    """Response after agent creation."""
    agent_id: str
    name: str
    description: str
    tasks: List[AgentTask]
    status: AgentStatus
    message: str


class SignalRequest(BaseModel):
    """Request to send a signal to an agent."""
    signal: str = Field(..., description="One of: pause, resume, cancel, add_task")
    task: Optional[AgentTask] = None  # Required for add_task signal


class AgentStatusResponse(BaseModel):
    """Response for agent status query."""
    agent: AgentDefinition
    logs: List[LogEntry]


# ── LLM Parsing Response ──────────────────────────────────────────────────────


class LLMAgentParse(BaseModel):
    """Structure the LLM returns when parsing agent descriptions."""
    name: str
    tasks: List[Dict[str, Any]]  # Will be converted to AgentTask objects
    trigger: TriggerType = TriggerType.MANUAL
    schedule: Optional[str] = None
    integrations: List[IntegrationType] = []
