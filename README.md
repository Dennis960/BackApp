# BackApp
BackApp is a Go + React application that lets automatically schedule and inspect backups of remote servers via SSH.

It is a very lightweight server (under 50 MB) that runs locally (or on a dedicated machine) and provides a web interface to manage backup profiles.

![Backup Profiles](./ScreenshotBackupProfiles.png)
![Backup Runs](./ScreenshotBackupRuns.png)
![Backup Run Detail](./ScreenshotBackupRunDetail.png)

> <span style="color: #FFD700">⚠️ **Warning:** Commands, file paths and any variable you enter might not be escaped and will be injected in commands as is. Always check commands and file paths to not contain special characters such as `'`, `"`, `\`, `/` and so on.</span>

> <span style="color: #FFD700">⚠️ **Warning:** Any text you enter in the ui will be saved in plaintext. If you enter passwords or secrets, unlike with the github workflows, they will be displayed in the logs in plaintext.</span>

## Features
- Add multiple remote servers via SSH using password or key authentication.
- Create storage locations and naming rules for backups.
- Storage locations are the place on your local machine where backups are stored.
- Naming rules define what the folder with the backups will be called.
- Create backup profiles using a flexible template engine or create one from scratch.
- Each profile can have pre- and post-backup commands that run on the remote server before and after the backup.
- You can define file rules to include/exclude specific paths in the backup.
- View detailed logs of each backup run, including success/failure status and output of commands.
- Schedule backups using cron expressions.
- Simple and intuitive web interface built with React and Material-UI.

## Quick start

### Native binary (recommended for smaller setups)
- Download the latest release for your platform.

- Run the binary, then open your browser to `http://localhost:8080`.
In case 8080 is in use, set a different port with `-port=9090`.

### Using Docker or Docker Compose
- Pull the latest image from GitHub Container Registry:
  ```bash
  docker pull ghcr.io/dennis960/backapp:latest
  ```
- Use the provided `docker-compose.yml` to run BackApp with Docker Compose:
  ```bash
  docker-compose up -d
  ```

## Build from source
- Install [Go](https://golang.org/dl/) (1.24+) and [Node.js](https://nodejs.org/en/download/).
- Clone this repository.
- After installing the npm dependencies, build the frontend:
  ```bash
  cd web
  npm install
  npm run build
  ```
- A static bundle will be created in `server/static`.
- Now build the backend:
  ```bash
  cd ../server
  go build -o backapp
  ```
- Run the server:
  ```bash
  ./backapp -port=8080
  ```

## Template Engine
- See [docs/template-engine.md](docs/template-engine.md) for authoring template JSON files used by the Generic Template Wizard.
