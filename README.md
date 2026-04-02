# Patient Tasks

Small department task manager for tracking patient-related work.

## What It Is

This project is a simple web app built with:

- Node.js for running the app
- Express for the web server
- SQLite for storing the tasks

The interface supports Hebrew and right-to-left layout.

## Run It Locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm start
```

3. Open:

`http://127.0.0.1:3100`

## Notes

- The database file `tasks.db` is intentionally not stored in GitHub.
- That means GitHub stores the app code, but not your live patient/task data.
- If someone clones the repo, the app can create its own local database when it runs.

## Production Hosting Approach

For this app's current architecture, the safest first production setup is:

- one always-on app server
- one persistent disk for SQLite
- one real custom domain with HTTPS
- one running instance only

Why this is the right first step:

- the app stores its data in SQLite, which is one local database file
- the real-time updates also keep connected browser sessions in the app's memory
- that means the current version is designed to run best as one stable server, not several app servers at once

In plain language:

- up to around 20 active users should still be reasonable on one modest server for this kind of short task/list edits
- if the department later needs stronger scaling or high-availability, the next big step would be moving from SQLite to Postgres

### Environment Variables For Production

- `HOST=0.0.0.0`
- `PORT=3000` or whatever the host gives you
- `NODE_ENV=production`
- `DB_PATH=/var/data/tasks.db`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_DOMAIN=your-domain.example` (optional)
- `SQLITE_BUSY_TIMEOUT_MS=5000`
- `APP_ACCESS_CODE=...`
- `APP_ADMIN_USERNAME=...`
- `APP_ADMIN_PASSWORD=...`
- `APP_SESSION_SECRET=...`

### Render Deployment

This repo now includes [`render.yaml`](/Users/danrapoport/patient-tasks/render.yaml) for a single-instance Render deployment with:

- persistent disk mounted at `/var/data`
- SQLite stored at `/var/data/tasks.db`
- health check on `/api/health`
- secure session cookies enabled

### Backups

Use:

```bash
npm run backup:db
```

That runs [`scripts/backup-db.sh`](/Users/danrapoport/patient-tasks/scripts/backup-db.sh), which creates a timestamped SQLite backup in `backups/`.
