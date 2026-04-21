# Tasks — mini-NimbusClouds

## Task List

- [x] 1 Shared types and schema
  - [x] 1.1 Create `types/nimbus.ts` with `AgentDefinition`, `AgentTask`, `AgentStatus`, `TaskStatus`, `TriggerType`, `IntegrationType`, `TaskType`, `LogEntry`, `CreateAgentRequest`, `SignalRequest`, and `ApiError` interfaces
  - [x] 1.2 Add a `validateAgentDefinition(payload: unknown): AgentDefinition` helper that throws a descriptive error identifying the first missing required field
  - [x] 1.3 Extend `prisma/schema.prisma` — add `temporal_workflow_id`, `tasks`, `integrations`, and `trigger` columns to `NimbusCloudAgent`; run `prisma migrate dev`

- [x] 2 LLM Client (`lib/llmClient.ts`)
  - [x] 2.1 Implement `parseAgentDefinition(nl: string, userId: string): Promise<AgentDefinition>` reading `DO_INFERENCE_URL` and `DO_INFERENCE_API_KEY` from env
  - [x] 2.2 Implement `runTaskInstruction(task: AgentTask, context: string): Promise<string>`
  - [x] 2.3 Implement tool wrappers: `webFetch`, `cloudreve_listFiles`, `cloudreve_writeFile`
  - [x] 2.4 Throw typed `LlmError` (with `statusCode` and `body`) on non-2xx responses

- [x] 3 Cloudreve Client (`lib/cloudreveClient.ts`)
  - [x] 3.1 Implement `listFiles(userId, path)`, `getFile(userId, path)`, `uploadFile(userId, path, content, mimeType)`, `createFolder(userId, path)`, `deleteFile(userId, path)`, `moveFile(userId, src, dst)` — reusing the admin token cache from `lib/cloudreve.ts`
  - [x] 3.2 Throw typed `CloudreveError` (with `code` and `msg`) when Cloudreve response body has `code !== 0`

- [x] 4 Cloudflare Worker — API gateway (`workers/nimbus/`)
  - [x] 4.1 Scaffold CF Worker project: `workers/nimbus/index.ts`, `wrangler.toml`, `tsconfig.json`; install `itty-router` and `@temporalio/client`
  - [x] 4.2 Implement auth middleware: validate `Authorization: Bearer` header, return `ApiError` 401 if missing/invalid
  - [x] 4.3 Implement `POST /api/nimbus/agents`: validate payload with `validateAgentDefinition`, call `parseAgentDefinition`, start `NimbusCloudWorkflow` via Temporal client, persist to `NimbusCloudAgent` via Prisma, return 201
  - [x] 4.4 Implement `GET /api/nimbus/agents`: return all `NimbusCloudAgent` records for the authenticated user as `AgentDefinition[]`
  - [x] 4.5 Implement `POST /api/nimbus/agents/:id/signal`: forward `pause | resume | cancel | addTask` as a Temporal signal
  - [x] 4.6 Implement `POST /api/nimbus/webhooks/:agentId`: forward request body as a Temporal `event` signal
  - [x] 4.7 Implement `GET /api/nimbus/health`: probe Temporal, LLM endpoint, and Cloudreve; return `ok` (200) or `degraded` (503)
  - [x] 4.8 Wrap all route handlers in a top-level try/catch that returns the `ApiError` envelope with a generated `requestId`

- [x] 5 Durable Object (`workers/nimbus/AgentDO.ts`)
  - [x] 5.1 Implement DO state: persist `definition: AgentDefinition` and `logs: LogEntry[]` (ring buffer, max 500) via `this.ctx.storage`
  - [x] 5.2 Implement `POST /do/log`: append `LogEntry` to ring buffer, broadcast to all active SSE writers
  - [x] 5.3 Implement `GET /do/sse`: upgrade to SSE, flush last 100 buffered entries, then stream live entries
  - [x] 5.4 Implement `GET /do/state` and `PATCH /do/state`: read/update `AgentDefinition` snapshot
  - [x] 5.5 Wire DO binding in `wrangler.toml` and reference it from CF Worker route handlers

- [x] 6 Temporal Worker (`temporal/`)
  - [x] 6.1 Scaffold Temporal Worker: `temporal/worker.ts`, `temporal/workflows/NimbusCloudWorkflow.ts`, `temporal/activities/index.ts`; install `@temporalio/worker`, `@temporalio/workflow`, `@temporalio/activity`
  - [x] 6.2 Implement `NimbusCloudWorkflow`: sequential execution loop, parallel batch detection (tasks with no unresolved `inputSource`), `condition()`-based pause/resume, cancel flag, `addTask` signal appending to queue
  - [x] 6.3 Register signal handlers for `pause`, `resume`, `cancel`, `addTask` before the main execution loop
  - [x] 6.4 Apply retry policy (`maximumAttempts: 3`, exponential backoff `5s → 30s`) to all Activity calls
  - [x] 6.5 Implement `researchActivity`: call `webFetch` then `runTaskInstruction`; emit `LogEntry` at start, complete, and fail
  - [x] 6.6 Implement `summarizeActivity`, `generateActivity`, `customActivity`: call `runTaskInstruction`; emit `LogEntry` at start, complete, and fail
  - [x] 6.7 Implement `fileManageActivity`: call `cloudreveClient` methods; emit `LogEntry` at start, complete, and fail
  - [x] 6.8 On workflow completion, POST final status to Durable Object `/do/state` and call the configured completion webhook if present
  - [x] 6.9 On Activity exhausting retries, write failure reason to `task.result`, set `task.status = 'failed'`, POST `activity_fail` `LogEntry` to DO

- [x] 7 Next.js API proxy routes (`app/api/nimbus/`)
  - [x] 7.1 Create `app/api/nimbus/agents/route.ts` — GET + POST: validate session with `getServerSession`, attach `X-Nimbus-User-Id` header, proxy to CF Worker
  - [x] 7.2 Create `app/api/nimbus/agents/[id]/signal/route.ts` — POST proxy
  - [x] 7.3 Create `app/api/nimbus/agents/[id]/logs/route.ts` — GET: proxy SSE stream from CF Worker / DO to browser (pass through `text/event-stream` response)
  - [x] 7.4 Create `app/api/nimbus/webhooks/[agentId]/route.ts` — POST proxy
  - [x] 7.5 Create `app/api/nimbus/health/route.ts` — GET proxy

- [x] 8 Frontend — shared hooks and utilities
  - [x] 8.1 Create `hooks/useNimbusClouds.ts`: fetch agents on mount, poll every 10 s, expose `agents`, `loading`, `error`, `refetch`
  - [x] 8.2 Create `hooks/useAgentSSE.ts`: open `EventSource` to `/api/nimbus/agents/:id/logs`, expose `logs: LogEntry[]`, handle reconnect with exponential backoff (1s → 30s)

- [x] 9 Frontend — components (`components/nimbus/`)
  - [x] 9.1 Create `CreateModal.tsx`: Radix Dialog with name input, description textarea, trigger radio group, conditional cron input, integrations checkboxes, "Launch Agent" button; call `POST /api/nimbus/agents`; show inline error on failure; close and call `onCreated` on success
  - [x] 9.2 Create `AgentCard.tsx`: display name, status badge (with `animate-pulse` for `running`), task progress bar, last-run time; Pause/Resume/Cancel/Clone/Add Task controls calling the signal endpoint
  - [x] 9.3 Create `TaskList.tsx`: render each `AgentTask` with a status chip; show failure reason and "Retry Task" button for `failed` tasks; "Retry Task" calls `POST /api/nimbus/agents/:id/signal` with `addTask` signal
  - [x] 9.4 Create `LogStream.tsx`: consume `useAgentSSE`, render `LogEntry` list with colour coding (`activity_fail` → red, `activity_complete` → green, others → gray), auto-scroll to bottom, show reconnecting indicator on disconnect
  - [x] 9.5 Create `DetailView.tsx`: Radix Sheet/Drawer with three tabs — Tasks (`TaskList`), Logs (`LogStream`), Integrations (read-only list)
  - [x] 9.6 Create `Dashboard.tsx`: card grid using `useNimbusClouds`, "New Agent" button opening `CreateModal`, render `AgentCard` per agent, open `DetailView` on card click

- [x] 10 Dashboard page integration
  - [x] 10.1 Create `app/nimbus/page.tsx` as a server component shell that renders `Dashboard`
  - [x] 10.2 Add a "NimbusClouds" navigation entry to `components/sidebar.tsx` linking to `/nimbus`
  - [x] 10.3 Update the existing `components/panels/nimbus-clouds-panel.tsx` to delegate to the new `Dashboard` component (or replace its content with a link to `/nimbus`)

- [x] 11 Property-based tests (`__tests__/nimbus/`)
  - [x] 11.1 Install `fast-check` as a dev dependency
  - [x] 11.2 Write property test for Property 1 (AgentDefinition serialisation round-trip): generate arbitrary `AgentDefinition` objects, assert `JSON.parse(JSON.stringify(def))` deep-equals original
  - [x] 11.3 Write property test for Property 2 (parseAgentDefinition always produces ≥1 task): generate arbitrary non-empty strings, mock LLM, assert `tasks.length >= 1`
  - [x] 11.4 Write property test for Property 3 (validation rejects missing required fields): generate `AgentDefinition`-shaped objects with one required field removed, assert `validateAgentDefinition` throws with the missing field name in the message
  - [x] 11.5 Write property test for Property 4 (pause+resume preserves task queue length): simulate workflow state with arbitrary N pending tasks, apply pause then resume, assert queue length unchanged
  - [x] 11.6 Write property test for Property 5 (addTask grows queue by 1): simulate workflow state with arbitrary N pending tasks, apply addTask, assert queue length is N+1
  - [x] 11.7 Write property test for Property 6 (log broadcast reaches all SSE clients): simulate DO with arbitrary K (1–20) SSE writers, post a LogEntry, assert all K writers received exactly one event
  - [x] 11.8 Write property test for Property 7 (Cloudreve upload/download round-trip): generate arbitrary `Buffer` values, mock Cloudreve API, assert downloaded buffer equals uploaded buffer

- [x] 12 Unit and integration tests
  - [x] 12.1 Unit tests for `validateAgentDefinition`: missing each required field, extra fields, valid payload
  - [x] 12.2 Unit tests for `LlmError` and `CloudreveError` construction and message formatting
  - [x] 12.3 Unit tests for CF Worker auth middleware: missing header → 401, valid header → passes through
  - [x] 12.4 Unit tests for CF Worker error envelope: arbitrary thrown errors produce `{ code, message, requestId }` shape
  - [x] 12.5 Integration test: `POST /api/nimbus/agents` → workflow started → first log entry appears in SSE stream (mock Temporal + DO)
  - [x] 12.6 Integration test: `GET /api/nimbus/health` returns `ok` when all deps healthy; returns `degraded` when one dep is mocked to fail
