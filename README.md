# FlowMesh

> Event-driven workflow automation platform built in TypeScript.

FlowMesh is a workflow orchestration engine for building, running, and observing
automated pipelines. Workflows are defined as a DAG of triggers, conditions and
actions; the engine executes them asynchronously with retries, scheduling,
queueing, plugins and realtime log streaming.

## Highlights

- **DAG-based workflow engine** with schema validation and conditional execution
- **Triggers** — webhook, cron, and manual
- **Execution engine** — async step runner with execution context, cancellation
  and exponential-backoff retries
- **Queue** — BullMQ-backed worker pool with concurrency, priorities, delayed
  jobs and a dead-letter queue
- **Plugins** — typed plugin registry with built-in HTTP, GitHub, Slack,
  Discord, conditional and log nodes
- **Realtime** — WebSocket stream of execution events and live logs
- **Persistence** — PostgreSQL with execution snapshots and replay
- **Dashboard** — React frontend for creating, monitoring and inspecting
  workflows
- **Observability** — Prometheus-style `/metrics` endpoint with execution
  latency, failure rates and worker throughput

## Architecture

```
┌──────────────┐    HTTP/WS    ┌──────────────────────────────┐
│  React UI    │ ────────────▶ │   Fastify API (server)       │
└──────────────┘               │  ─ workflows / executions    │
                               │  ─ webhooks / metrics        │
                               │  ─ realtime gateway          │
                               └──────────────┬───────────────┘
                                              │
                          ┌───────────────────┼───────────────────┐
                          │                   │                   │
                          ▼                   ▼                   ▼
                   ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
                   │  PostgreSQL  │   │  BullMQ /    │    │  Plugin      │
                   │  workflows / │   │  Redis queue │    │  registry    │
                   │  executions  │   │  + DLQ       │    │  (HTTP, GH…) │
                   └──────────────┘   └──────┬───────┘    └──────────────┘
                                             │
                                             ▼
                                      ┌──────────────┐
                                      │  Workers     │
                                      │  (execution  │
                                      │   engine)    │
                                      └──────────────┘
```

The system is split into three workspaces:

| Package              | Purpose                                                |
| -------------------- | ------------------------------------------------------ |
| `@flowmesh/shared`   | Shared TypeScript types (workflows, executions, plugins) |
| `@flowmesh/server`   | Fastify API + execution engine + worker                |
| `@flowmesh/web`      | React + Vite dashboard                                 |

## Getting started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL + Redis)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Start Postgres + Redis
npm run db:up

# 3. Copy env
cp .env.example .env

# 4. Run migrations + start the API and worker in dev mode
npm run dev:server

# 5. In another terminal, start the dashboard
npm run dev:web
```

The API listens on http://localhost:4000 and the dashboard on
http://localhost:5173.

### Run everything in parallel

```bash
npm run dev
```

## Workflow definition

A workflow is a JSON document with a list of nodes and the edges between them:

```json
{
  "name": "github-issue-to-slack",
  "trigger": { "type": "webhook", "config": { "path": "/gh-issue" } },
  "nodes": [
    {
      "id": "filter",
      "type": "condition",
      "config": { "expression": "$.payload.action == 'opened'" }
    },
    {
      "id": "notify",
      "type": "slack.postMessage",
      "config": {
        "channel": "#oncall",
        "text": "New issue: {{ payload.issue.title }}"
      }
    }
  ],
  "edges": [
    { "from": "filter", "to": "notify", "when": "true" }
  ]
}
```

## REST API (subset)

| Method | Path                                  | Description                       |
| ------ | ------------------------------------- | --------------------------------- |
| `POST` | `/api/workflows`                      | Create a workflow                 |
| `GET`  | `/api/workflows`                      | List workflows                    |
| `GET`  | `/api/workflows/:id`                  | Get a workflow                    |
| `POST` | `/api/workflows/:id/execute`          | Manually run a workflow           |
| `GET`  | `/api/executions`                     | List executions (filterable)      |
| `GET`  | `/api/executions/:id`                 | Get an execution + step snapshots |
| `POST` | `/api/executions/:id/cancel`          | Cancel a running execution        |
| `POST` | `/api/executions/:id/replay`          | Replay an execution               |
| `POST` | `/api/webhooks/:path`                 | Webhook trigger entry point       |
| `GET`  | `/metrics`                            | Prometheus metrics                |
| `WS`   | `/ws/executions/:id`                  | Live execution log stream         |

## Project layout

```
flowmesh/
├── docker-compose.yml
├── package.json              ← npm workspaces root
├── tsconfig.base.json
└── packages/
    ├── shared/               ← @flowmesh/shared
    │   └── src/
    ├── server/               ← @flowmesh/server
    │   └── src/
    │       ├── workflows/
    │       ├── execution/
    │       ├── triggers/
    │       ├── queue/
    │       ├── plugins/
    │       ├── realtime/
    │       ├── metrics/
    │       └── routes/
    └── web/                  ← @flowmesh/web
        └── src/
```

## Roadmap

- [x] Workflow definition engine (DAG + zod schema)
- [x] Trigger system (webhook / cron / manual)
- [x] Execution engine with retries and cancellation
- [x] BullMQ queue + DLQ
- [x] Plugin architecture and built-ins
- [x] WebSocket realtime logs
- [x] PostgreSQL persistence + replay
- [x] React dashboard
- [x] Metrics endpoint
- [ ] Sandboxed plugin runtime
- [ ] Multi-tenant auth

## License

MIT — see [LICENSE](./LICENSE).
