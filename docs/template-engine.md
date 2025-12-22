# Template Engine: Authoring Template JSON Files

This guide explains how to create configuration-driven templates that the app can execute to create backup profiles with commands and file rules.

## Overview
- Templates are plain JSON files stored in the server's `templates` folder.
- On startup, the server seeds default templates and serves them via the API.
- The frontend loads a template, guides the user through its steps, then creates resources using the variables collected.

## Where Templates Live
- Files reside in: `templates/*.json`, this folder will be created if it doesn't exist when the server starts.
- API endpoints:
  - `GET /api/v1/templates` → returns a list of template metadata: `{ id, name, description }[]`
  - `GET /api/v1/templates/:id` → returns the full template JSON by its `id`.

## Top-Level JSON Schema
A template JSON object supports:
- `id` (string): unique identifier used in the API path.
- `name` (string): human-friendly title shown in the UI.
- `description` (string, optional): brief description shown in the selection dialog.
- `steps` (array): wizard steps to collect variables.
- `result` (object): instructions to create the profile, commands, and file rules.
- `computed` (object, optional): derived variables from collected inputs.

### Example
```json
{
  "id": "postgres-docker-compose",
  "name": "PostgreSQL via Docker Compose",
  "description": "Backup a PostgreSQL database running with Docker Compose; generates pg_dump, downloads it, then cleans up.",
  "steps": [ /* see Step Types below */ ],
  "result": {
    "profile": {
      "name": "{{profileName}}",
      "server_id": "{{server.id}}",
      "storage_location_id": "{{storageLocationId}}",
      "naming_rule_id": "{{namingRuleId}}",
      "schedule_cron": "{{scheduleCron}}",
      "enabled": true
    },
    "commands": [
      { "run_stage": "pre",  "command": "cd {{dockerComposeFolder}} && docker compose exec -T {{serviceName}} pg_dump -U {{databaseUsername}} -d {{databaseName}} -f /tmp/db_backup.sql" },
      { "run_stage": "pre",  "command": "cd {{dockerComposeFolder}} && docker cp $(docker compose ps -q {{serviceName}}):/tmp/db_backup.sql /tmp/db_backup.sql" },
      { "run_stage": "pre",  "command": "cd {{dockerComposeFolder}} && docker compose exec -T {{serviceName}} rm -f /tmp/db_backup.sql" },
      { "run_stage": "post", "command": "rm -f /tmp/db_backup.sql" }
    ],
    "file_rules": [
      { "remote_path": "/tmp/db_backup.sql", "recursive": false }
    ]
  },
  "computed": {
    "dockerComposeFolder": "{{dirname dockerComposePath}}"
  }
}
```

## Step Types
Steps collect data used later in `result`. The wizard currently supports three types:

- `selectServerRemotePath`
  - Collects: a `server` and a file path from that server.
  - Properties:
    - `id` (string), `title` (string), `description` (string, optional)
    - `vars` (object) with one or more path fields, each:
      - `label` (string), `placeholder` (string), `directories` (boolean; allow directories only)
  - Common variables produced:
    - `server`: full server object (`id`, `name`, etc.)
    - Path variables named as you define (e.g., `dockerComposePath`).

- `form`
  - Generic input form to collect arbitrary variables.
  - Properties:
    - `id` (string), `title` (string)
    - `fields` (array of objects): `{ name, label, required?, type?, default? }`
      - `type` is typically `text` or `password`.
      - Collected values are stored under `vars[name]`.

- `profileDetails`
  - Collects profile creation essentials.
  - Properties:
    - `id` (string), `title` (string)
    - `defaults` (object, optional): `{ profileName?, scheduleCron? }`
  - Common variables produced:
    - `profileName`, `scheduleCron`, `storageLocationId`, `namingRuleId`, `server` (reused if already selected).

## Interpolation
Templates use double-brace interpolation to insert variable values:
- Syntax: `{{ variableName }}` or with dot access: `{{ server.id }}`.
- Missing variables interpolate to an empty string.
- Implemented in [web/src/templates/templateEngine.ts](../web/src/templates/templateEngine.ts).

### Dot Access
You can reference nested values collected in earlier steps:
- Example: `{{ server.id }}` uses the selected server's id.

## Computed (Derived) Variables
Use `computed` to derive reusable values from already collected variables:
- Syntax: a map of `name: expression`.
- Supported expressions:
  - `{{dirname somePathVar}}` → returns the parent folder of a path like `/srv/app/docker-compose.yml` → `/srv/app`.
  - Regular interpolation expressions, e.g., `"{{profileName}} Backup"`.
- Derived variables are merged with `vars` and available for interpolation everywhere in `result`.
- Implemented in [web/src/templates/templateEngine.ts](../web/src/templates/templateEngine.ts).

## Result Schema
Defines what the wizard will create once the user completes all steps.

- `profile` (object)
  - Fields mirror the backend API: name, `server_id`, `storage_location_id`, `naming_rule_id`, `schedule_cron`, `enabled`.
  - All string fields support interpolation.

- `commands` (array)
  - Each entry: `{ run_stage: "pre" | "post", command: string }`.
  - The wizard auto-assigns `run_order` per stage in the order listed.
  - `command` supports interpolation; use `computed` to build paths once and reuse.

- `file_rules` (array)
  - Each entry: `{ remote_path: string, recursive?: boolean, exclude_pattern?: string }`.
  - All string fields support interpolation.

## Variables Available
Variables are accumulated across steps and include:
- `server`: the selected server (object with `id`, `name`, ...).
- `profileName`, `scheduleCron`, `storageLocationId`, `namingRuleId`.
- Any `form` fields you define (e.g., `serviceName`, `databaseName`).
- Any path inputs from `selectServerRemotePath` (e.g., `dockerComposePath`).
- Derived entries from `computed` (e.g., `dockerComposeFolder`).

## Adding a New Template
1. Create `server/templates/<your-id>.json` with the schema above.
2. Include `id`, `name`, and consider adding `description` to improve UX.
3. Define relevant `steps` to collect variables.
4. Add `computed` for any derived paths or names.
5. Fill out `result.profile`, and optionally `result.commands` and `result.file_rules`.
6. Build and run the server; the template becomes available via `GET /api/v1/templates` and in the UI selection dialog.

## Best Practices
- Prefer meaningful `id` values: short, URL-safe, and descriptive.
- Use `description` to help users pick the right template.
- Keep commands idempotent where possible; clean up temporary files.
- Use `computed` to avoid repeating path manipulations across multiple commands.
- Validate required form fields using the `required` flag to guide users.

## Limitations
- Interpolation does not support functions beyond `dirname`.
- Arithmetic, conditional logic, and loops are not supported.
- Keys (property names) should not be interpolated; only values.

## Troubleshooting
- Template not showing in UI:
  - Ensure the file is in the `templates` folder.
  - Check `GET /api/v1/templates` for your template metadata.
- Interpolation producing empty strings:
  - Verify the variable names used in expressions match those produced by steps or `computed`.
- Path derivation issues:
  - Confirm `dirname` input is a string path and not empty.

