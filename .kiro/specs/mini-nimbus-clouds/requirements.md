# Requirements Document

## Introduction

mini-NimbusClouds is a full-stack feature within the existing NimbusAI Agent Platform that enables users to create, configure, and deploy persistent background AI agents. Each agent (a "mini-NimbusCloud") is defined by a natural-language description, a trigger type, and a set of integrations. Agents are orchestrated via Temporal.io workflows, exposed through a Cloudflare Workers API gateway with Durable Objects for per-agent edge state, powered by a DigitalOcean-hosted GPT OSS 120B inference endpoint, and can read/write files through the existing Cloudreve integration. The feature integrates into the existing Next.js/Tailwind NimbusAI platform UI.

---

## Glossary

- **mini-NimbusCloud**: A single persistent background AI agent instance, defined by an `AgentDefinition`, orchestrated by a Temporal workflow.
- **AgentDefinition**: A structured JSON object describing an agent's identity, tasks, trigger, integrations, and status.
- **AgentTask**: A discrete unit of work within an `AgentDefinition` (research, summarize, generate, file_manage, or custom).
- **Temporal_Worker**: The self-hosted or Temporal Cloud worker process that executes `NimbusCloudWorkflow` and its Activities.
- **NimbusCloudWorkflow**: The Temporal workflow that accepts an `AgentDefinition` and executes its `AgentTask` list.
- **Activity**: A Temporal activity function — one of `researchActivity`, `summarizeActivity`, `generateActivity`, `fileManageActivity`, or `customActivity`.
- **CF_Worker**: The Cloudflare Worker that acts as the API gateway at `/api/nimbus/*`.
- **Durable_Object**: A Cloudflare Durable Object instance that maintains per-agent state and SSE log streams at the edge.
- **LLM_Client**: The TypeScript module (`llmClient.ts`) that wraps the DigitalOcean GPT OSS 120B OpenAI-compatible inference endpoint.
- **Cloudreve_Client**: The TypeScript module (`cloudreveClient.ts`) that wraps the Cloudreve v3 REST API for file operations.
- **Dashboard**: The Agent Dashboard UI page within the NimbusAI platform showing all mini-NimbusClouds.
- **Detail_View**: The per-agent detail page showing task list, live log stream, results, and controls.
- **Create_Modal**: The "Create mini-NimbusCloud" modal/page in the frontend.
- **IntegrationType**: One of `cloudreve | github | web | custom`.
- **TriggerType**: One of `manual | scheduled | event`.
- **SSE**: Server-Sent Events — the mechanism used to stream live logs from a Durable Object to the Detail View.
- **Signal**: A Temporal workflow signal (`pause`, `resume`, `cancel`, `addTask`) sent to a running `NimbusCloudWorkflow`.
- **Webhook**: An HTTP POST to `/api/nimbus/webhooks/:agentId` that triggers or feeds data into a specific agent workflow.

---

## Requirements

### Requirement 1: Agent Creation UI

**User Story:** As a platform user, I want a creation form to define a new mini-NimbusCloud, so that I can launch a persistent background agent with a natural-language description, name, trigger, and integrations.

#### Acceptance Criteria

1. THE Create_Modal SHALL include a natural-language text input field labelled "Describe what you want this agent to do".
2. THE Create_Modal SHALL include an agent name text input field.
3. THE Create_Modal SHALL include a trigger type selector with options `Manual`, `Scheduled (cron)`, and `Event-Driven (webhook)`.
4. WHEN the user selects `Scheduled (cron)` as the trigger type, THE Create_Modal SHALL display a cron expression input field.
5. THE Create_Modal SHALL include an integrations multi-select with options `Cloudreve`, `Web Research`, `GitHub Repo`, `URL/Doc`, and `Custom`.
6. THE Create_Modal SHALL include a "Launch Agent" button.
7. WHEN the user submits the form with all required fields populated, THE Create_Modal SHALL call `POST /api/nimbus/agents` with the form payload as JSON.
8. IF the `POST /api/nimbus/agents` call returns an error, THEN THE Create_Modal SHALL display the error message to the user without closing the modal.
9. WHEN the `POST /api/nimbus/agents` call succeeds, THE Create_Modal SHALL close and THE Dashboard SHALL display the newly created agent.

---

### Requirement 2: Cloudflare Worker API Gateway

**User Story:** As the platform backend, I want a Cloudflare Worker to act as the API gateway for all mini-NimbusCloud operations, so that agent creation, listing, signalling, and webhook ingestion are handled at the edge.

#### Acceptance Criteria

1. THE CF_Worker SHALL handle `POST /api/nimbus/agents` by accepting an agent creation payload, calling THE LLM_Client to parse the natural-language description into an `AgentDefinition`, and starting a `NimbusCloudWorkflow` via the Temporal client.
2. THE CF_Worker SHALL handle `GET /api/nimbus/agents` by returning a JSON array of all `AgentDefinition` records for the authenticated user, including their current `status`.
3. THE CF_Worker SHALL handle `POST /api/nimbus/agents/:id/signal` by accepting a signal payload (`pause`, `resume`, `cancel`, or `addTask`) and forwarding it as a Temporal signal to the corresponding running `NimbusCloudWorkflow`.
4. THE CF_Worker SHALL handle `POST /api/nimbus/webhooks/:agentId` by accepting an external HTTP POST and forwarding the payload as a Temporal signal to the corresponding `NimbusCloudWorkflow`.
5. THE CF_Worker SHALL handle `GET /api/nimbus/health` by returning a JSON health status object with HTTP 200.
6. IF a request to any `/api/nimbus/*` route is unauthenticated, THEN THE CF_Worker SHALL return HTTP 401 with a standardised error envelope.
7. IF an internal error occurs in THE CF_Worker, THEN THE CF_Worker SHALL return a standardised JSON error envelope containing a `code`, `message`, and `requestId` field.
8. THE CF_Worker SHALL use a Durable_Object instance per agent to maintain per-agent state at the edge.
9. WHEN a Durable_Object receives a log entry, THE Durable_Object SHALL append it to the agent's log buffer and broadcast it to all active SSE connections for that agent.

---

### Requirement 3: AgentDefinition Schema

**User Story:** As a developer integrating the system, I want a canonical TypeScript `AgentDefinition` schema, so that all components share a consistent data contract for agent configuration and state.

#### Acceptance Criteria

1. THE AgentDefinition SHALL contain the fields: `id` (string), `userId` (string), `name` (string), `description` (string), `tasks` (array of `AgentTask`), `trigger` (`'manual' | 'scheduled' | 'event'`), `schedule` (optional string), `integrations` (array of `IntegrationType`), `status` (`'running' | 'paused' | 'completed' | 'failed'`), and `createdAt` (ISO 8601 string).
2. THE AgentTask SHALL contain the fields: `type` (`'research' | 'summarize' | 'generate' | 'file_manage' | 'custom'`), `instruction` (string), `inputSource` (optional string), and `outputTarget` (optional string).
3. THE CF_Worker SHALL validate that any incoming `AgentDefinition` payload contains all required fields before processing.
4. IF an incoming payload is missing a required `AgentDefinition` field, THEN THE CF_Worker SHALL return HTTP 400 with a descriptive error message identifying the missing field.
5. THE AgentDefinition schema SHALL be defined as a TypeScript interface in a shared types file importable by both the CF_Worker and the Temporal_Worker.

---

### Requirement 4: Temporal Workflow — NimbusCloudWorkflow

**User Story:** As the orchestration layer, I want a Temporal workflow that executes an agent's task list reliably, so that tasks are retried on failure, can be paused/resumed/cancelled, and completion is reported back to the edge.

#### Acceptance Criteria

1. THE NimbusCloudWorkflow SHALL accept an `AgentDefinition` as its sole input parameter.
2. THE NimbusCloudWorkflow SHALL execute each `AgentTask` in the `tasks` array sequentially by default.
3. WHEN two or more `AgentTask` items have no data dependency on each other, THE NimbusCloudWorkflow SHALL execute them in parallel.
4. THE NimbusCloudWorkflow SHALL implement Temporal signal handlers for `pause`, `resume`, `cancel`, and `addTask`.
5. WHEN THE NimbusCloudWorkflow receives a `pause` signal, THE NimbusCloudWorkflow SHALL suspend execution after the current in-flight Activity completes.
6. WHEN THE NimbusCloudWorkflow receives a `resume` signal, THE NimbusCloudWorkflow SHALL continue execution from the point of suspension.
7. WHEN THE NimbusCloudWorkflow receives a `cancel` signal, THE NimbusCloudWorkflow SHALL terminate execution and set the agent status to `failed`.
8. WHEN THE NimbusCloudWorkflow receives an `addTask` signal, THE NimbusCloudWorkflow SHALL append the new `AgentTask` to the remaining task queue.
9. THE NimbusCloudWorkflow SHALL apply a retry policy of maximum 3 attempts with exponential backoff to each Activity execution.
10. WHEN all tasks complete successfully, THE NimbusCloudWorkflow SHALL send a completion webhook to the configured endpoint and update the Durable_Object status to `completed`.
11. IF an Activity exhausts all retries, THEN THE NimbusCloudWorkflow SHALL record the failure reason and set the agent status to `failed`.

---

### Requirement 5: LLM Client — GPT 120B Integration

**User Story:** As the inference layer, I want a typed LLM client module that wraps the DigitalOcean GPT OSS 120B endpoint, so that agent definition parsing and task execution can call the model consistently.

#### Acceptance Criteria

1. THE LLM_Client SHALL read the inference base URL from the `DO_INFERENCE_URL` environment variable and the API key from the `DO_INFERENCE_API_KEY` environment variable.
2. THE LLM_Client SHALL expose a `parseAgentDefinition(naturalLanguage: string, userId: string): Promise<AgentDefinition>` function that calls the GPT 120B endpoint and returns a structured `AgentDefinition`.
3. THE LLM_Client SHALL expose a `runTaskInstruction(task: AgentTask, context: string): Promise<string>` function that calls the GPT 120B endpoint and returns the task result as a string.
4. THE LLM_Client SHALL expose tool-calling wrappers: `webFetch(url: string): Promise<string>`, `cloudreve_listFiles(path: string): Promise<string>`, and `cloudreve_writeFile(path: string, content: string): Promise<void>`.
5. IF the GPT 120B endpoint returns a non-2xx HTTP status, THEN THE LLM_Client SHALL throw a typed error containing the status code and response body.
6. THE LLM_Client SHALL use the OpenAI-compatible chat completions API format (`/v1/chat/completions`) for all requests.
7. FOR ALL valid natural-language inputs, `parseAgentDefinition` SHALL return an `AgentDefinition` whose `tasks` array contains at least one `AgentTask` (round-trip property: the parsed definition re-serialised to JSON and re-parsed SHALL produce an equivalent object).

---

### Requirement 6: Cloudreve Client

**User Story:** As the file management layer, I want a typed Cloudreve client module that wraps the Cloudreve v3 REST API, so that Temporal Activities and the CF_Worker webhook handler can perform file operations on behalf of agents.

#### Acceptance Criteria

1. THE Cloudreve_Client SHALL expose `listFiles(userId: string, path: string): Promise<CloudreveObject[]>`.
2. THE Cloudreve_Client SHALL expose `getFile(userId: string, path: string): Promise<Buffer>`.
3. THE Cloudreve_Client SHALL expose `uploadFile(userId: string, path: string, content: Buffer, mimeType: string): Promise<{ path: string; url: string }>`.
4. THE Cloudreve_Client SHALL expose `createFolder(userId: string, path: string): Promise<void>`.
5. THE Cloudreve_Client SHALL expose `deleteFile(userId: string, path: string): Promise<void>`.
6. THE Cloudreve_Client SHALL expose `moveFile(userId: string, sourcePath: string, destinationPath: string): Promise<void>`.
7. THE Cloudreve_Client SHALL reuse the existing admin token cache from `lib/cloudreve.ts` to avoid redundant authentication calls.
8. IF a Cloudreve API call returns a non-zero `code` in its response body, THEN THE Cloudreve_Client SHALL throw a typed error containing the Cloudreve error code and message.
9. THE Cloudreve_Client SHALL be callable from both Temporal Activities and the CF_Worker webhook handler.

---

### Requirement 7: Agent Dashboard UI

**User Story:** As a platform user, I want an Agent Dashboard that shows all my mini-NimbusClouds and lets me manage them, so that I can monitor progress, control execution, and inspect results.

#### Acceptance Criteria

1. THE Dashboard SHALL display all mini-NimbusClouds for the authenticated user as a card grid, showing each agent's name, status, last run time, and task progress.
2. WHEN an agent's status changes, THE Dashboard SHALL reflect the updated status without requiring a full page reload.
3. THE Dashboard SHALL provide per-card controls: Pause, Resume, Cancel, Clone, and Add Task.
4. WHEN the user selects an agent card, THE Detail_View SHALL open showing the agent's full task list with per-task status indicators.
5. THE Detail_View SHALL display a live log stream sourced from the agent's Durable_Object via SSE.
6. THE Detail_View SHALL display a results panel showing the output of completed tasks.
7. THE Detail_View SHALL include an Integrations tab listing the agent's configured integrations.
8. WHILE an agent has status `running`, THE Dashboard SHALL display a visual running indicator (e.g. animated pulse) on its card.
9. IF an agent has status `failed`, THE Dashboard SHALL display the per-task failure reason and a "Retry Task" button for the failed task.

---

### Requirement 8: Error Handling and Observability

**User Story:** As a platform operator, I want structured error handling and observability across all layers, so that failures are diagnosable and users can recover from errors.

#### Acceptance Criteria

1. THE Temporal_Worker SHALL emit structured JSON log entries for each Activity start, completion, and failure, including `agentId`, `taskType`, `attempt`, and `durationMs`.
2. THE CF_Worker SHALL return all error responses as a standardised JSON envelope with fields `code` (string), `message` (string), and `requestId` (string).
3. WHEN an Activity fails after exhausting retries, THE NimbusCloudWorkflow SHALL record the failure reason string in the corresponding `AgentTask`'s result field.
4. THE Detail_View SHALL display a "Retry Task" button for any `AgentTask` whose status is `failed`.
5. WHEN the user clicks "Retry Task", THE Detail_View SHALL call `POST /api/nimbus/agents/:id/signal` with an `addTask` signal containing the failed task.
6. THE CF_Worker SHALL handle `GET /api/nimbus/health` by returning `{ "status": "ok", "timestamp": "<ISO 8601>" }` with HTTP 200 when all dependencies are reachable.
7. IF a dependency (Temporal, LLM endpoint, or Cloudreve) is unreachable during a health check, THEN THE CF_Worker SHALL return `{ "status": "degraded", "details": { ... } }` with HTTP 503.
