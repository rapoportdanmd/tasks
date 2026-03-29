## 2026-03-28 15:56 IDT

- Project is a small Express + SQLite patient task manager with a single-page HTML frontend.
- Tasks now require one predefined Hebrew category and can optionally be assigned to a team member.
- UI now supports Hebrew/RTL, category filtering, assignee filtering, and basic team-member management.
- Database migration is in place and existing legacy tasks were backfilled with the default category `מעקבים`.
- Local environment was set up with `nvm`; Node 22 is pinned in `.nvmrc` because `better-sqlite3` is not compatible here with Node 24.

## 2026-03-28 16:06 IDT

- Added a double-clickable Desktop launcher `Patient Tasks.command` that starts the app on `127.0.0.1:3100` and opens it in Google Chrome.

## 2026-03-28 16:08 IDT

- Added a proper Desktop app bundle `Patient Tasks.app` with a custom hospital-themed macOS icon; verified that opening the app starts the server on `127.0.0.1:3100`.

## 2026-03-28 16:19 IDT

- Prepared the project for GitHub by adding a `.gitignore` to exclude local machine files, logs, dependencies, and the SQLite database.
- Added a `README.md` so the repository has a simple explanation and startup instructions for future cloning/sharing.

## 2026-03-29 11:51 IDT

- Local git identity was configured for Dan's new GitHub account in preparation for the first repository commit.
- Project is being connected to a new private GitHub repository named `patient-tasks`.

## 2026-03-29 11:53 IDT

- Created the first git commit locally (`Initial commit`) on branch `main`.
- Added the GitHub remote URL `https://github.com/rapoportdanmd/patient-tasks.git`; push is pending only because this Mac is not authenticated with GitHub yet.
