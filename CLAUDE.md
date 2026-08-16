# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Next.js web app that turns one sentence of user intent into a complete, runnable CrewAI Python project, by driving an LLM through a dependency graph of prompt phases, then executing the result in a Docker container.

Four top-level pieces:

- `crewai-web-ui/` — Next.js 16 App Router + React 19 + Tailwind 4 app. All generation and execution logic lives here (API routes are the backend).
- `python-runner/` — Dockerfile for the execution image (Ubuntu + `/opt/venv` with crewai, crewai-tools, streamlit, uv, …).
- `kimi-proxy/` — standalone Node HTTP server (port 3050) translating OpenAI chat-completions calls to the Kimi API.
- `workspace/` — bind-mounted into the runner container as `/workspace`. Generated code lands in `workspace/crewai_generated/`. `projects/<name>/` holds saved snapshots of it.

`crewai_reference.md` at the root is the original single-shot version of the whole blueprint → architecture → script protocol, before it was split into per-phase prompt files. It is not loaded by any code, but it is the reference for what the phase prompts are collectively meant to produce.

## Commands

Run everything from `crewai-web-ui/` unless noted:

```bash
npm run dev            # dev server on :3000
npm run build
npm run lint
npm test               # jest (jsdom)
npx jest src/utils/__tests__/fileParser.test.ts        # single file
npm test -- -t "parses file blocks"                    # single test by name
```

From the repo root:

```bash
docker build -t python-runner ./python-runner          # execution image (also rebuilt automatically on every /api/execute)
docker compose -f docker-compose.mcp.yml up -d         # SearxNG :8080, Crawl4AI :11235, Kimi server :3050
```

`dev`/`build` pass `--webpack` on purpose: `next.config.ts` has a `webpack()` hook (node-loader for `.node` binaries, `ssh2` externalized) that Turbopack would ignore, and dockerode pulls in native modules.

The Next server must run **on the host**, not in a container: `/api/execute`, `/api/containers`, `/api/stop` and `/api/mcp-services` shell out to the `docker` CLI and use dockerode against the local socket. The README's `docker compose up web` refers to a root `docker-compose.yml` that no longer exists.

## Two separate .env files

- `crewai-web-ui/.env.local` — read by the Next server process; supplies API keys for the *generation* LLM calls.
- `workspace/.env` — copied into the generated project by `run_crew.sh` at container start; supplies keys for the *generated crew* at runtime. `kimi-proxy` also loads this file.

`.env_sample` at the root documents the variable names.

## Generation pipeline

`src/config/phases.config.ts` is the heart of the system. It builds a DAG at module load: each `createPhaseState({...})` call auto-assigns an incrementing `id`, appends to a module-level `phases` array, and holds direct references to its dependency `PhaseState` objects. Array order = sequential run order; `dependencies` = parallel scheduling constraints.

A phase declares:

- `promptFileName` — a markdown file in `crewai-web-ui/public/prompts/`, fetched over HTTP at app start by `usePhases` and stored as both `prompt` (editable in the UI) and `defaultPrompt`.
- `dependencies` — other phase objects whose `output` feeds this phase's input.
- `generateInputPrompt` — the composition strategy. Four exist: `defaultGenerateInputPrompt` (concatenate dep outputs), `jsonGenerateInputPrompt` (strip ```json fences and shallow-merge dep outputs into one object), `pyProjectGenerateInputPrompt` (concatenate dep outputs prefixed with `File: <path>`), and the blueprint-only one that wraps the user input in `@@@ … @@@` delimiters.
- `filePath` + `outputType` (`'file'` | `'directory'`) — where the LLM output is persisted, relative to `workspace/crewai_generated/`. Phases with neither are intermediate (JSON design documents consumed by later phases).

**To add a phase:** drop a prompt `.md` in `public/prompts/`, add a `createPhaseState` call at the right position in `phases.config.ts`, and wire it into the `dependencies` of downstream phases. Nothing else registers phases.

`src/hooks/usePhases.ts` executes the graph two ways — sequential (`handleRunAllPhases`, stops at first failure) and parallel (`handleRunAllPhasesInParallel`, repeatedly computes the ready-set of phases whose deps are all complete and `Promise.race`s in-flight work). Both are cancellable via a shared `AbortController`. Phase state is immutable-updated and threaded through as `currentPhases` because React state hasn't flushed between phases.

The graph as currently wired: blueprint → project_config.yaml → detailed agents/tasks → {LLM selection, tool selection, workflow, agents.yaml, tasks.yaml} → custom-tool plan → tools/ → pyproject.toml, plus crew.py (needs workflow + LLM + tools) and main.py/streamit.py (need project_config). Phases without `filePath` are intermediate JSON documents.

`getPhases()` returns the module-level singleton array, mutated by `createPhaseState` at import time — it is shared state, not a factory. Tests that mutate phase objects leak across test files in the same worker.

### Output → file contract

`POST /api/generate` writes results, and both output types go through `parseFileBlocks` in `src/utils/fileParser.ts` (which looks for `[START_FILE:path]…[END_FILE:path]` blocks and strips a wrapping code fence from each block's content):

- `outputType: 'file'` — writes the **first** parsed block's content to `crewai_generated/<filePath>`, or the raw response verbatim if the LLM emitted no markers. So a prompt may or may not use the markers; the phase's `filePath` always wins.
- `outputType: 'directory'` — writes every block to **its own path**, relative to `crewai_generated/`; the phase's `filePath` is ignored entirely. Prompts producing multiple files must emit the markers. With no markers, a lone fenced code block falls back to a filename inferred from the fence language (`getFileNameFromLanguage`), which is usually wrong — treat a missing marker as a prompt bug.

`src/app/api/generate/script.utils.ts` contains an older, unreferenced `parseFileBlocks`/`extractScript` pair. It is dead code — always use `src/utils/fileParser.ts`.

## LLM layer

`src/config/models.config.ts` — `staticModels` is intentionally empty; the model list is discovered at runtime by `getAllModels()`: Ollama's `/api/tags` on :11434, plus each entry in `localServerConfigs` (Kimi wrapper :3050, local :8001, LM Studio :1234) queried at `<baseURL>/models`. Model IDs from local servers are namespaced `${server.id}_${model.id}`; `getModelConfig` decodes that prefix and falls back to treating any unrecognized ID as an Ollama model.

`ModelConfig.apiKey` stores the *name* of an env var, not a key. `src/app/api/generate/llm.service.ts` resolves it via `process.env[...]`, substituting `dummy-key` for `OLLAMA_API_KEY`/`LOCAL_API_KEY`. Every provider goes through the OpenAI SDK (`temperature: 0`, non-streaming). `<think>`/`<thinking>` blocks are stripped from responses.

Every LLM call overwrites `crewai-web-ui/llm_input_prompt.txt` and `llm_output_prompt.txt` (the latter with thinking tags intact) — the fastest way to debug what a phase actually sent and received.

## Execution pipeline

`POST /api/execute` returns a `ReadableStream` of newline-prefixed control messages. `src/context/ExecutionContext.tsx` parses these prefixes on the client — **any change to one side must change the other**:

`DOCKER_COMMAND:` · `CONTAINER_ID:` · `LOG:` · `LOG_ERROR:` · `LOG_RAW:` · `PRE_DOCKER_LOG:` · `PRE_DOCKER_ERROR:` · `RESULT: {json ExecutionResult}`

Order of operations in `docker.service.ts`:

1. `workspace/pre_host_run.sh` on the **host**, if present (project dir as cwd).
2. `docker build -t python-runner ./python-runner`, streamed to the client.
3. Container from `python-runner`, name `python-runner-<project>-<timestamp>`, `NetworkMode: host`, `AutoRemove`, bind-mounting `workspace/` (or `projects/<name>/`) to `/workspace`, cwd `/workspace/crewai_generated`, running `/bin/sh /workspace/<scriptName>` (default `run_crew.sh`; `run_streamlit.sh` for the Streamlit variant).
4. `run_crew.sh` inside the container runs `pre_docker_run.sh`, copies `/workspace/.env` into the project, touches `__init__.py`, then `uv run run_crew` (entry point declared in the generated `pyproject.toml`).

`stream.service.ts` splits pre-docker-script output from main output by watching for the literal `--- Running pre_docker_run.sh ---` / `--- pre_docker_run.sh finished with exit code ` markers those shell scripts print — the markers are a contract between the scripts and the parser.

`executionResult.service.ts` slices the same container stdout a second time to build the structured `ExecutionResult`, using a *longer* marker list than `stream.service.ts`: `--- Running main script ---`, `--- Main script finished with exit code 0 ---`, `--- /workspace/pre_docker_run.sh not found, skipping. ---`, `Crew Execution successful` / `Crew Execution failed`. Editing `workspace/run_crew.sh` or `run_streamlit.sh` echo lines silently breaks stage attribution in the UI.

`ExecutionContext` keys all execution state by project name (`'default'` = `workspace/`), so the dashboard can run several saved projects concurrently.

### Live crew activity

Separate from the exec stream: the generated `crew.py` (per `phase3_crew_prompt.md`) appends JSONL step/task events to `crewai_generated/execution_log.json`; `run_crew.sh` deletes the file at container start; `LiveCrewActivity.tsx` polls it once a second through `/api/project-structure?file=execution_log.json&project=<name>`. The JSON shape is a three-way contract between that prompt, the run script and the component.

## Projects

`POST /api/save` deep-copies `workspace/` to `projects/<sanitized-name>/`, skipping `.venv`, `__pycache__`, `.git`. Names are restricted to `[a-zA-Z0-9_-]`. `/dashboard` lists them (description read from each `crewai_generated/project_config.yaml`) and runs them per-project. `/api/files`, `/api/project-structure` and `/api/project-config` all take an optional `?project=<name>` that re-roots them from `workspace/` to `projects/<name>/`, and map the container-side `/workspace/` prefix back to the host directory.

## Two kinds of "prompts" — don't confuse them

- `public/prompts/*.md` — the **phase** prompts, served statically and fetched by `usePhases` as `/prompts/<promptFileName>`. Editing one in the UI only changes React state; the file on disk is the default.
- `public/prompts.json` — the user's **saved initial inputs** (`{title, prompt}[]`), read/written by `/api/prompts` (GET/POST/DELETE) and surfaced by `usePrompts` + `SavedPrompts.tsx`. This file is rewritten at runtime by the app.

## Sidecar services and settings

- `/api/mcp-services` drives `docker compose -f ../docker-compose.mcp.yml` (start/stop/restart, all or one service) and reports status by curling health endpoints first, falling back to `docker ps`. The service list — name, container name, port, health path — is **hardcoded** in the route's `SERVICES` array, so adding a compose service means editing both files.
- `/api/settings/server-ip?force=true` runs a 5s Bonjour/mDNS browse for `_ssh._tcp` (`src/utils/discovery.ts`) to find machines publishing themselves on the LAN. Without `force` it returns `{discovered: null}` — there is no persisted IP on the server side; `SettingsContext` holds ip/port in client state alongside the model list.

## Generated project shape

```
crewai_generated/
  project_config.yaml          # id, description, user_inputs, outputs — read by the UI, not just the crew
  pyproject.toml               # declares run_crew / run_streamlit entry points
  streamit.py
  src/crewai_generated/
    crew.py  main.py  config/agents.yaml  config/tasks.yaml  tools/
```

## Testing notes

Jest with `babel-jest` and jsdom; tests live in `src/**/__tests__/` (both `src/__tests__/` and per-directory ones). `@/` maps to `src/`. Coverage is concentrated on the pure logic worth protecting — `phases.config` dependency wiring, `fileParser`, `outputParser`, `usePhases` scheduling, `models.config`, `ExecutionContext`.

## Stale docs

`README.md` predates the current code: it describes static Gemini/DeepSeek/ChatGPT providers (`staticModels` is now empty — everything is discovered from local servers at runtime) and a `docker compose up web` step for a root `docker-compose.yml` that no longer exists. Trust this file over the README.
