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
