"""
LLM-based agent definition parser.

Converts natural language agent descriptions into structured AgentDefinition objects.
"""
import json
import logging
from typing import Dict, Any
from uuid import uuid4
from datetime import datetime
import requests

from .models import (
    AgentDefinition,
    AgentTask,
    TaskType,
    TaskStatus,
    TriggerType,
    IntegrationType,
    AgentStatus,
    LLMAgentParse
)


logger = logging.getLogger(__name__)


# ── Configuration ─────────────────────────────────────────────────────────────


GPT_INFERENCE_URL = "http://localhost:8000/generate"  # Override with env var
INFERENCE_TIMEOUT = 120


# ── LLM Client ────────────────────────────────────────────────────────────────


def call_llm(prompt: str, max_tokens: int = 512) -> str:
    """Call the GPT-OSS inference endpoint.
    
    Args:
        prompt: Input prompt for the model.
        max_tokens: Maximum tokens to generate.
    
    Returns:
        str: Generated text from the model.
    
    Raises:
        requests.RequestException: If the request fails.
    """
    payload = {
        "prompt": prompt,
        "max_new_tokens": max_tokens,
        "temperature": 0.7
    }
    
    response = requests.post(
        GPT_INFERENCE_URL,
        json=payload,
        timeout=INFERENCE_TIMEOUT
    )
    response.raise_for_status()
    
    result = response.json()
    return result.get("generated_text", result.get("text", ""))


# ── Agent Parser ──────────────────────────────────────────────────────────────


def parse_agent_description(description: str, user_id: str) -> AgentDefinition:
    """Parse a natural language agent description into a structured AgentDefinition.
    
    This function uses the LLM to understand what the user wants and creates
    a structured agent with tasks, triggers, and integrations.
    
    Args:
        description: Natural language description from the user.
        user_id: ID of the user creating the agent.
    
    Returns:
        AgentDefinition: Structured agent ready for execution.
    
    Raises:
        ValueError: If the LLM response cannot be parsed.
    
    Examples:
        >>> parse_agent_description(
        ...     "Monitor my GitHub repo and summarize new issues daily",
        ...     "user123"
        ... )
        AgentDefinition(
            name="GitHub Issue Monitor",
            tasks=[
                AgentTask(type="research", instruction="Fetch new GitHub issues"),
                AgentTask(type="summarize", instruction="Summarize the issues")
            ],
            trigger="scheduled",
            schedule="0 9 * * *"
        )
    """
    system_prompt = """You are an AI agent planner. Given a natural-language description of what a background agent should do, return a JSON object with this structure:

{
  "name": "Short descriptive name for the agent",
  "tasks": [
    {
      "type": "research" | "summarize" | "generate" | "file_manage" | "custom",
      "instruction": "Detailed instruction for this task",
      "input_source": "optional: task_id to use as input",
      "output_target": "optional: where to store output"
    }
  ],
  "trigger": "manual" | "scheduled" | "event",
  "schedule": "optional: cron expression like '0 9 * * *' for daily at 9am",
  "integrations": ["web", "file_system", "database", "api", "custom"]
}

Task types:
- research: Fetch and analyze information from the web or APIs
- summarize: Condense text or data into a summary
- generate: Create new content (reports, emails, etc.)
- file_manage: Read, write, or organize files
- custom: Any other operation

Always include at least one task. Break complex operations into multiple tasks.
Return ONLY valid JSON, no markdown formatting."""

    user_prompt = f"Create an agent definition for: {description}"
    
    full_prompt = f"{system_prompt}\n\nUser request: {user_prompt}\n\nJSON:"
    
    logger.info(f"Parsing agent description with LLM: {description[:100]}...")
    
    # Call LLM
    raw_response = call_llm(full_prompt, max_tokens=512)
    
    # Clean up response (remove markdown code blocks if present)
    json_text = raw_response.strip()
    if json_text.startswith("```"):
        json_text = json_text.split("```")[1]
        if json_text.startswith("json"):
            json_text = json_text[4:]
    json_text = json_text.strip()
    
    # Parse JSON
    try:
        parsed_data = json.loads(json_text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {raw_response}")
        raise ValueError(f"LLM returned invalid JSON: {str(e)}")
    
    # Validate with Pydantic
    try:
        llm_parse = LLMAgentParse(**parsed_data)
    except Exception as e:
        logger.error(f"Failed to validate LLM response: {parsed_data}")
        raise ValueError(f"LLM response validation failed: {str(e)}")
    
    # Convert to AgentDefinition
    now = datetime.utcnow()
    agent_id = str(uuid4())
    
    # Convert task dicts to AgentTask objects
    tasks = []
    for task_data in llm_parse.tasks:
        task = AgentTask(
            id=str(uuid4()),
            type=TaskType(task_data.get("type", "custom")),
            instruction=task_data["instruction"],
            input_source=task_data.get("input_source"),
            output_target=task_data.get("output_target"),
            status=TaskStatus.PENDING,
            attempt=0
        )
        tasks.append(task)
    
    # Ensure at least one task
    if not tasks:
        raise ValueError("Agent must have at least one task")
    
    agent = AgentDefinition(
        id=agent_id,
        user_id=user_id,
        name=llm_parse.name,
        description=description,
        tasks=tasks,
        trigger=llm_parse.trigger,
        schedule=llm_parse.schedule,
        integrations=llm_parse.integrations,
        status=AgentStatus.RUNNING,
        created_at=now,
        updated_at=now
    )
    
    logger.info(f"Successfully parsed agent: {agent.name} with {len(tasks)} tasks")
    
    return agent


# ── Validation ────────────────────────────────────────────────────────────────


def validate_agent_definition(agent: AgentDefinition) -> None:
    """Validate that an agent definition is complete and valid.
    
    Args:
        agent: Agent definition to validate.
    
    Raises:
        ValueError: If validation fails with a descriptive message.
    """
    if not agent.name:
        raise ValueError("Agent must have a name")
    
    if not agent.tasks:
        raise ValueError("Agent must have at least one task")
    
    if agent.trigger == TriggerType.SCHEDULED and not agent.schedule:
        raise ValueError("Scheduled agents must have a schedule (cron expression)")
    
    # Validate task dependencies
    task_ids = {task.id for task in agent.tasks}
    for task in agent.tasks:
        if task.input_source and task.input_source not in task_ids:
            raise ValueError(
                f"Task {task.id} references non-existent input_source: {task.input_source}"
            )
    
    logger.info(f"Agent validation passed: {agent.name}")
