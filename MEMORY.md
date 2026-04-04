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

## 2026-03-29 16:19 IDT

- Shifted the task board toward a compact day-view workflow: tasks now have `task_date`, default filtering is by today, and patient/date filters drive the overview.
- Replaced the old text status dropdown with color-only status controls and expanded statuses to include not started, in progress, pending review, done, and canceled.
- Split `רשימת מזוהמים` out of the task categories into its own free-text dated list with separate backend storage and UI.

## 2026-03-29 15:02 IDT

- Added full task editing through the main task form, including patient name and description updates.
- Added patient autocomplete plus a quick today-only patient chip bar to speed up adding another task for someone who already has a task today.
- Kept patient filtering text-based but upgraded it with patient-name suggestions from existing tasks.

## 2026-03-29 15:22 IDT

- Split the old `פיזיותרפיה/שיקום` task category into two distinct categories: `פיזיותרפיה` and `שיקומיסט`.
- Added a new `subcategory` field for `מכתבים` with the supported values `הצגה לשיקום`, `סיכום ביניים`, and `שחרור`.

## 2026-03-29 15:53 IDT

- Added a `comment` field to tasks so existing tasks can carry a note/update after creation.
- The task list now shows an inline comment box with a save button for each task, and the main edit form also loads/saves the task comment.

## 2026-03-29 16:16 IDT

- Added optional `task_time` support end to end: tasks can now store an hour/minute value alongside the existing task date.
- The new time field is available in create/edit, appears in the task row, and can be changed inline directly from the daily list.
- The task-table migration now preserves newer fields like `comment` and `subcategory` when rebuilding older databases to add future columns.

## 2026-03-29 16:17 IDT

- Changed comment handling so comments are no longer part of new-task creation; they appear only for existing tasks.
- Existing tasks can still be commented inline from the task row or through the edit form after opening that task.

## 2026-03-29 16:18 IDT

- Updated the date display so any task or infected-list item scheduled for the current day shows `Today` instead of the literal date string.

## 2026-03-29 16:19 IDT

- Replaced the always-visible row of status choices with a single compact color button on each task; clicking it opens the status choices only when needed.

## 2026-03-29 16:22 IDT

- Replaced the custom status popup with a compact native dropdown after the popup proved unreliable in practice.
- The status control remains small on the right side of each task, but changing status now uses the browser's built-in, more dependable selection UI.

## 2026-03-29 16:24 IDT

- Moved the status dropdown into its own outer edge column so it sits at the far right of each task row instead of inside the shared actions cluster.

## 2026-03-29 16:29 IDT

- Changed the compact status dropdown to show color symbols instead of written color names, so status selection is visual-first.

## 2026-03-29 16:33 IDT

- Added a live `Today` badge next to the add-task date field so the creation bar also reads naturally when the selected date is the current day.

## 2026-03-29 16:47 IDT

- Shifted the task-board visuals toward a ward-sheet/table aesthetic inspired by Dan's reference screenshot: flatter cells, strong borders, column headers, compact controls, and a slim dedicated status edge.

## 2026-03-29 16:48 IDT

- Softened the new ward-sheet layout by removing the visible borders between internal task "cells" while keeping the compact row structure.

## 2026-03-29 16:51 IDT

- Confirmed the app code was syntactically valid after the latest UI changes; the immediate "can't open" problem was the local server on `127.0.0.1:3100` not running, and it was restarted successfully.

## 2026-03-29 16:59 IDT

- Reverted the overly literal ward-sheet visual treatment after Dan clarified the screenshot was only an abstract reference, not a layout to copy.
- Restored a softer structured task-board look while preserving the newer workflow features already added.

## 2026-03-29 17:03 IDT

- Tightened the task-row layout so each task stays on a single horizontal line in the day view, including a one-line inline comment field and non-wrapping row content.

## 2026-03-29 17:22 IDT

- Simplified the task row further by removing redundant date/time/assignment displays from the bar itself.
- Added direct inline editing for `פירוט` from the task row and shrank the inline assignee control to keep the day view compact.

## 2026-03-29 17:24 IDT

- Replaced the visible status dropdown with a minimal vertical color strip at the right edge of each task row; clicking the strip now cycles the task status.

## 2026-03-29 17:25 IDT

- Standardized current-day date wording so textual displays show only `Today` instead of `תאריך: Today` or `תאריך Today`.

## 2026-03-29 17:28 IDT

- Replaced the visible date inputs with custom date-display shells so task, infected-list, and filter date controls themselves show `Today` when set to the current day instead of exposing the browser's raw date format.

## 2026-03-29 17:50 IDT

- Enforced a no-past-dates rule for task creation and infected-list creation in both the calendar UI and the backend API.
- Left the filter date unrestricted so older items can still be reviewed historically, but past dates can no longer be chosen for new entries.

## 2026-03-29 17:57 IDT

- Normalized clickable control hit-areas so the full visible surface of buttons/chips/icon controls is intended to be clickable, not just a small inner hotspot.

## 2026-03-29 18:11 IDT

- Fixed the custom date controls so clicking anywhere on the visible date box opens the date picker instead of depending on the browser's small native date-input hotspot.

## 2026-03-29 18:15 IDT

- Added quick inline editing for each task's date and time directly inside the task row, while keeping the compact one-line layout.
- Task-row date controls now reuse the same full-click custom date box and still block choosing past dates.

## 2026-03-29 18:18 IDT

- Relaxed the task-detail requirement only for `פיזיותרפיה`, `שיקומיסט`, and `מכתבים`; all other categories still require `פירוט`.
- Matched the rule in both the browser form and the backend API, and verified it live with one allowed empty-detail save and one rejected disallowed save.

## 2026-03-29 18:44 IDT

- Updated backend task ordering so tasks inside each category are automatically sorted by status in this order: empty, yellow, blue, green, red.
- Restarted the app on `127.0.0.1:3100` and verified the live API now returns tasks in the requested per-category status order.

## 2026-03-29 18:48 IDT

- Added automatic folding for green (`done`) and red (`canceled`) tasks inside each category so the active daily list stays shorter by default.
- Each folded color bucket can be expanded or collapsed on demand, and the default collapsed state persists during normal page re-renders.

## 2026-03-29 19:09 IDT

- Kept the slim status strip on each task, but changed it from instant cycling to a deliberate slide-out color picker.
- Status now changes only after choosing a color from the opened palette, which reduces accidental status changes during normal clicking.

## 2026-03-29 19:14 IDT

- Restyled the inline `פירוט` field inside each task row so it looks more like structured task content and less like an open free-text box.
- Kept editing easy by making the whole description area focus the field, while showing the edit affordance only subtly on hover/focus.

## 2026-03-29 19:29 IDT

- Restyled the inline comment field to match the calmer `פירוט` look, so it feels like part of the task row instead of a separate form control.
- Simplified comment saving to behave more like `פירוט`: edit in place, then save on blur or Enter without a prominent save button.

## 2026-03-29 19:30 IDT

- Widened the inline task-row time control so the full assigned `HH:MM` remains visible instead of clipping the minutes.
- Forced the inline time display to use left-to-right numeric layout for cleaner reading inside the RTL task row.

## 2026-03-29 19:40 IDT

- Changed the inline `פירוט` field from a single-line control to an auto-growing inline editor so long text can expand the task row vertically instead of being cut off.
- Kept the calmer structured styling, but now the task bar becomes thicker only when the description actually needs more space.

## 2026-03-29 20:05 IDT

- Updated the new-task form so after saving a task, the same patient name stays filled in for the next task instead of being cleared.
- Shifted focus to the category field after save, so repeated task entry for the same patient is faster without affecting edit/cancel resets.

## 2026-03-29 20:16 IDT

- Changed the new-task patient suggestions so they are built from the tasks assigned to the exact date currently selected in the new-task form, not just from today's tasks.
- Updated both the visible quick-pick patient bar and the autocomplete list to follow the selected task date immediately when that date changes.

## 2026-03-29 20:32 IDT

- Tightened the main task filters so the patient suggestions, assignee filter options, and category chips now derive from the already-relevant task subset instead of the full task list.
- This makes the filters behave consistently together: choosing one filter now narrows the realistic choices shown by the other filters, instead of offering impossible combinations from other dates or contexts.

## 2026-03-29 20:35 IDT

- Fixed the custom date-display behavior so an actually cleared date no longer falls back visually to `Today`.
- Added an explicit empty-state label for the filter date (`ללא סינון`) and stopped the summary from implying `Today` when no filter date is selected.

## 2026-03-29 20:40 IDT

- Moved the team-member add control out of the filtering panel and into a small team-management block inside the new-task area, where assignment is actually configured.
- Tightened the filter grid afterward so the filtering area now contains only real filtering controls.

## 2026-03-29 20:49 IDT

- Added a visible team-member list under the `ניהול צוות` block so existing members are shown as named boxes, not just hidden inside assignment dropdowns.
- Wired the list to the same live team data, so adding a new member immediately creates another name box in that section.

## 2026-04-02 21:08 IDT

- Local repo setup check: this project already has Git initialized on branch `main`.
- The current `origin` points to `https://github.com/rapoportdanmd/patient-tasks.git`, not the newly mentioned empty `tasks.git` repository.
- This Mac does not yet have global Git `user.name` / `user.email` configured, and the GitHub CLI (`gh`) is not installed.

## 2026-04-02 21:12 IDT

- Updated this Mac's global Git identity to match the existing commit author used in the repo: `rapoportdanmd <rapoportdan.md@gmail.com>`.
- Repointed the local repo `origin` to the requested empty GitHub repository `https://github.com/rapoportdanmd/tasks.git`.
- Push attempt reached the expected authentication blocker: GitHub access from this Mac is not yet authorized, so the upload cannot complete until Dan signs in on this machine.

## 2026-04-02 21:17 IDT

- Installed GitHub CLI (`gh`) locally in Dan's user space and authenticated it to `github.com` with HTTPS Git operations.
- Configured Git to use `gh` as the credential helper for GitHub, so regular `git push` / `git pull` can reuse the approved login.
- Successfully pushed branch `main` to the requested remote `https://github.com/rapoportdanmd/tasks.git`; local `main` now tracks `origin/main`.

## 2026-04-02 21:19 IDT

## 2026-04-03 11:34 IDT

- Added a hospital-network/shared-drive deployment path: `npm run start:network-share` now starts the app on LAN-friendly settings and stores the SQLite file in `shared-data/tasks.db`.
- The new startup script writes `network-share-access.txt` with the host computer's local URL, the department-facing LAN URLs, and the database/log paths for easier handoff.
- Exposed server access info in the API and added a quick in-app menu action to copy the department share link, so staff can share the correct network address without using terminal commands.

- Reviewed the current working tree and separated project files from machine-local clutter before preparing the next commit.
- Expanded `.gitignore` to exclude local logs, PID files, Codex state, recovered cache HTML, test artifacts, and the downloaded `cloudflared` binary while keeping deploy scripts and app assets tracked.
- Staged the meaningful app, docs, scripts, deployment, and asset changes as a clean follow-up commit set; only a syntax check is available right now because the repo does not yet define an automated test suite.

## 2026-03-29 21:04 IDT

- Promoted `ניהול אנשי צוות` into its own top-level panel above the task-entry area, so it now reads as general setup rather than part of task creation or filtering.
- Reordered the add-member row so the add button sits to the left of the text box, and added a persisted daily admin selector backed by a new `daily_admin_assignments` database table plus `/api/day-manager` endpoints.

## 2026-03-29 21:08 IDT

- Reworked the status legend in `סינון ותצוגה` into compact colored circles that show live task counts inside the circles themselves, instead of repeating status names next to them.
- Updated the green completion wording to `בוצע`, replacing the older `סגור` label where that status name is still used.

## 2026-04-04 09:08 IDT

- Matched the new-task browser-side validation to the backend so category `קבלות` can be saved without `פירוט`.
- Added a standard fold/unfold control to the `מאגר מטופלים` panel using the same collapse behavior as the other top-level boxes.

## 2026-04-04 09:14 IDT

- Added the same fold/unfold control to `ניהול אנשי צוות`, with that panel defaulting open.
- Set `מאגר מטופלים` to start collapsed by default through the shared panel-collapse state, while still allowing it to be reopened manually.

## 2026-04-04 09:24 IDT

- Fixed the top-left visual leak on `סינון ותצוגה` by insetting its accent line so the rounded filter card stays clean even while its overflow remains visible for dropdowns.
- Added the standard fold/unfold button to `סינון ותצוגה` and set that panel to start collapsed by default through the shared collapse-state system.

## 2026-04-04 14:56 IDT

- Refined the `סינון ותצוגה` top accent again so it visually matches the other panel headers while still staying clipped just inside the rounded card edge.

## 2026-04-04 15:09 IDT

- Added overnight default task-creation rules: new tasks created from 18:00 default into the current day's `תורנות`, while tasks created before 05:00 default to the previous day's date and `תורנות`.
- Between 00:00 and 06:00 the new-task form now allows selecting the previous day, and the date display shows `Night-Shift` whenever the current default save target is the night-shift bucket.

## 2026-04-04 15:18 IDT

- Restored the fuller current UI/app baseline after the overnight task patch was accidentally deployed on top of a much smaller committed baseline.
- Re-kept the overnight default task behavior while bringing back the richer live UI pieces already present in the local working copy, including online status, populated dropdowns, and the broader task/list rendering logic.

## 2026-03-29 21:13 IDT

- Removed the redundant color-name status counters from the summary row, keeping only `סה"כ` there while leaving the counted status circles as the sole status-count display.

## 2026-03-29 21:19 IDT

- Moved `סה"כ` into the same visual row as the counted status circles, so the whole task-status snapshot now reads as one compact line.

## 2026-03-29 21:25 IDT

- Renamed the neutral `מיונים/יעוצים` status from `סגירת יעוץ שמג` to the shorter `סגירת יעוץ` across the backend defaults, normalization, and UI fallbacks so the wording is consistent everywhere.

- Removed the remaining date pill from the summary area under the status circles, so that section no longer repeats the selected date visually.

## 2026-03-29 21:40 IDT

- Added a reversible screen-layout mode so Dan can manually rearrange major panels and inner UI blocks without asking for code tweaks for every small spacing/order change.
- Layout mode now supports drag-to-reorder within each area, hide/restore controls for blocks, and local browser persistence via `localStorage`, so the customized layout stays on this machine/browser.

## 2026-03-29 21:53 IDT

- Upgraded the layout editor from simple block reordering to field-level freeform editing for the main form/filter boxes, so individual input/select/textarea boxes can be dragged and resized visually on screen.
- Kept the editing reversible by persisting those custom field rectangles locally in the browser and keeping reset/restore controls available from the layout toolbar.

## 2026-03-29 22:04 IDT

- Added staff-member deletion to the team-management UI, including an inline delete button on each existing member card.
- Verified the full create/delete flow against the live API and kept the refresh path tied to `loadMeta()`/`reloadAll()` so assignment dropdowns and the daily admin selector stay in sync after deletion.

## 2026-03-29 22:07 IDT

- Simplified the assignee filter by removing the explicit `כל הצוות` option; the default empty selection now means "no assignee filter" while keeping the dedicated `ללא שיוך` option available.

## 2026-03-29 22:10 IDT

- Removed the redundant patient summary pill that appeared after filtering by patient name, so the selected patient is no longer repeated visually below the filters.

## 2026-03-29 22:12 IDT

- Renamed the daily admin label in the team-management area from `אחראי/ת ליום Today` to the simpler role title `מנהל יום`, while keeping the saved-for-today note underneath.

## 2026-03-29 22:21 IDT

- Converted `רשימת מזוהמים` into a date-free workflow in the UI: removed its date field, stopped showing dates in the list itself, and stopped tying that list to the current date filter.
- Simplified the infected-list backend flow to create new entries without user-supplied dates and to order the list by creation time instead of date-first sorting.

## 2026-03-29 22:42 IDT

- Reworked `רשימת מזוהמים` from a single free-text note into a structured mini-record with `patient_name` (required), `culture_type` (`דם`, `כיח`, `שתן`, `CSF`), `agent`, `abx`, and `comment`.
- Added a backward-compatible infected-list table migration so older plain-note entries are preserved and mapped into the new structure instead of being lost.

## 2026-03-29 22:53 IDT

- Added editing for existing infected-list entries: rows now expose an edit action, load back into the infected-list form, and save through a dedicated `PATCH /api/infected-list/:id` backend route.
- Kept the infected-list form reversible with explicit save/cancel states and verified the full create-edit-delete cycle against the live local API.

## 2026-03-29 23:04 IDT

- Added a new `מטופלים במיון` panel with structured fields `patient_name`, `id_number`, `ward`, `status` (`ממתין`, `שחרור`, `אשפוז`), and `comment`, backed by a dedicated `er_patients` SQLite table and API.
- Built the ER panel with the same practical workflow as the infected list: add, edit, cancel, and delete from the same box, and verified the full create-edit-delete cycle against the live app.

## 2026-03-29 23:07 IDT

- Added a new `רשימת הכנות ניתוחים` panel with `patient_name`, `surgery_type` (`ססיה`, `בוקר`, `דחופים`), and a simple prep status (`לא מוכן`, `מוכן`), backed by a dedicated `surgery_preps` SQLite table and API.
- Styled `מוכן` as a green status pill while keeping `לא מוכן` neutral, and verified the full create-edit-delete cycle against the live local app.

## 2026-03-29 23:18 IDT

- Restored a cleaner default dashboard layout by moving the top panels into a balanced two-column grid, tightening form spacing, and making the larger text fields span the full available width correctly instead of breaking alignment.
- Disabled old saved freeform field positions from affecting the normal view, so the screen returns to a symmetric grid unless Dan explicitly enters layout mode.

## 2026-03-30 06:57 IDT

- Made the surgery-prep `מוכן` / `לא מוכן` status much easier to edit by turning the visible status pill in each row into a direct inline toggle, so Dan no longer has to open full edit mode just to flip readiness.

## 2026-03-30 06:58 IDT

- Added `פצע` as another valid `תרבית` option for the infected-list culture dropdown and backend validation, so wound cultures can be recorded explicitly.

## 2026-03-30 07:04 IDT

- Fixed a confusing surgery-prep status-toggle behavior by removing status-based resorting from the backend list order, so toggling `לא מוכן` / `מוכן` no longer makes the row jump and look like a different patient changed.

## 2026-03-30 07:19 IDT

- Updated the ER-patients workflow to use the simpler statuses `ממתין`, `נבדק`, `סגור` instead of the older `ממתין`, `שחרור`, `אשפוז`, and normalized older saved ER rows into the new set.
- Made the visible ER status into a direct inline colored toggle like the surgery-prep list: `ממתין` stays neutral, `נבדק` is yellow, and `סגור` is green.

## 2026-03-30 07:21 IDT

- Renamed the ER panel from `מטופלים במיון` to `מיונים/יעוצים` and expanded the ward field label to `אגף/מחלקה/ביה״ח` to better match Dan's real workflow terminology.

## 2026-03-30 07:25 IDT

- Replaced the ER neutral status `ממתין` with `סגירת יעוץ שמג` and added `העברה` as another valid `מיונים/יעוצים` status, expanding the quick inline status cycle to `סגירת יעוץ שמג` -> `נבדק` -> `העברה` -> `סגור`.

## 2026-03-30 07:29 IDT

- Renamed the neutral `מיונים/יעוצים` status from `סגירת יעוץ שמג` to the shorter `סגירת יעוץ` across backend defaults, normalization, and UI fallbacks so the wording is consistent everywhere.

## 2026-03-30 07:34 IDT

- Simplified `מיונים/יעוצים` again by removing the status selector from the form itself and keeping status changes only in the inline row button.
- Reduced the ER status set to `ממתין`, `נבדק`, and `סגור`, with new entries defaulting to `ממתין` and older extra statuses normalized into the smaller set.

## 2026-03-30 08:11 IDT

- Renamed the `מיונים/יעוצים` add button text from `הוסף למיון` to the more generic `הוסף לרשימה` and matched the form reset text to it.

## 2026-03-30 08:13 IDT

- Increased the visual weight of the task-category headers in the daily task list by making the category names larger, darker, and more prominent, with slightly stronger separation from the rows below.

## 2026-03-30 08:20 IDT

- Added a small inline high-priority toggle to each task row, backed by a persistent `high_priority` task field in SQLite.
- High-priority tasks now get a subtle visual emphasis and are automatically sorted above same-category tasks with the same date before normal-priority items.

## 2026-03-30 08:29 IDT

- Added bulk-delete controls for the three side lists plus day-based task cleanup controls in the tasks panel.
- Added a guarded `reset all` flow that wipes operational data (tasks, lists, daily admin assignments) with a double confirmation, while keeping the team-member setup intact.

## 2026-03-30 08:32 IDT

- Strengthened the high-priority task button styling so the active state reads much more clearly: inactive is quieter and greyed, while active is a bright filled amber button with a stronger outline.

## 2026-03-30 08:37 IDT

- Changed the tasks bulk-delete action from a date-based delete into a true `delete shown filtered tasks` workflow, so it now deletes exactly the tasks currently visible after filtering.

## 2026-03-30 08:41 IDT

- Matched the `מיונים/יעוצים` row label to the form wording by changing the displayed ward prefix from `אגף` to `אגף/מחלקה/ביה״ח`.

## 2026-03-30 11:06 IDT

- Added a lightweight recurring follow-up series model for `מעקבים`: new follow-up tasks now auto-populate future dates, and deleting a follow-up task removes that date and all later copies in the same series.
- Added a quick row-level move button between `מעבדות` and `מעקבים`; moving from labs into follow-up starts the future series, and moving back to labs collapses the future follow-up copies.

## 2026-03-30 11:13 IDT

- Added reusable one-click clear buttons for text boxes and textareas, including the inline task description/comment strips, so filled text can be cleared quickly without manual backspacing.

## 2026-03-30 11:16 IDT

- Simplified the surgery-prep form by removing the status picker entirely; new entries now always start as `לא מוכן`, and edits preserve the existing status unless it is changed from the list toggle itself.

## 2026-03-30 11:19 IDT

- Changed the `מעבדות` <-> `מעקבים` move action so it no longer forces a status/color change when moving between those categories; the existing task status is now preserved.

## 2026-03-30 11:53 IDT

- Replaced the automatic future-day spreading for `מעקבים` with a manual next-day copy action, so follow-up tasks now stay on their own day unless explicitly copied.
- Added a compact `+1` row button for `מעקבים`; it creates only one next-day copy, keeps yellow (`in_progress`) yellow, and resets every other copied status to colorless (`not_started`).

## 2026-03-30 11:56 IDT

- Extended the same compact `+1` next-day carry-over button to every task category, not just `מעקבים`.
- Verified live that yellow tasks keep yellow on the copied next day, all other statuses reset to colorless, and `מכתבים` copies now preserve their subcategory as well.

## 2026-03-30 12:41 IDT

- Slimmed down the main task-row design for a denser day view by reducing row padding, shrinking inline date/time/comment controls, and tightening the row action buttons.

## 2026-03-30 12:45 IDT

- Tightened the task row further while rebalancing the column widths, control heights, and action alignment so the day-view bars are slimmer but still visually organized and easy to scan.

## 2026-03-30 12:47 IDT

- Adjusted task ordering so `high priority` now rises only within the same category and status bucket, instead of jumping ahead of tasks in earlier statuses.

## 2026-03-30 13:09 IDT

- Made the priority lift sticky: when a task is marked high priority and later unmarked, it now stays in its raised position within that status instead of snapping back to its earlier place.

## 2026-03-30 14:00 IDT

- Added a moon-button night-shift workflow: tasks can now move into a dedicated `תורנות` board that uses the same grouped category/status layout as the main task list.
- Night-shift tasks now store the day they were moved there plus a moved-at timestamp, and the UI keeps applying the same patient/category/assignee filters to both the main board and the night-shift board.

## 2026-03-30 14:09 IDT

- Added a daily patient-pool upload workflow based on Excel files only: the server now accepts `.xlsx` / `.xls`, reads patient names from the first worksheet, and replaces that day’s saved patient pool.
- Added a visible `מאגר מטופלים יומי` panel plus autocomplete wiring so the uploaded pool feeds the new-task form, `רשימת מזוהמים`, and `רשימת הכנות ניתוחים`, while intentionally excluding `מיונים/יעוצים`.

## 2026-03-30 14:27 IDT

- Changed the patient-pool behavior from day-specific to persistent: the uploaded Excel pool is now treated as one active shared pool that stays available on later days until it is deleted or replaced.
- Updated the UI wording accordingly and verified live that the same active pool is still returned when querying a future date.

## 2026-03-28 16:19 IDT

- Prepared the project for GitHub by adding a `.gitignore` to exclude local machine files, logs, dependencies, and the SQLite database.
- Added a `README.md` so the repository has a simple explanation and startup instructions for future cloning/sharing.

## 2026-03-29 11:51 IDT

- Local git identity was configured for Dan's new GitHub account in preparation for the first repository commit.
- Project is being connected to a new private GitHub repository named `patient-tasks`.

## 2026-03-29 11:53 IDT

- Created the first git commit locally (`Initial commit`) on branch `main`.
- Added the GitHub remote URL `https://github.com/rapoportdanmd/patient-tasks.git`; push is pending only because this Mac is not authenticated with GitHub yet.
## 2026-03-30 14:30 IDT

- Moved the `תורנות` board above the main tasks list inside the tasks panel so night-shift items appear first in the daily workflow.

## 2026-03-30 14:34 IDT

- Fixed the `תורנות` placement more robustly by pinning it to the top of the tasks-panel layout state, so older saved screen arrangements can no longer push it below the main tasks list.

## 2026-03-30 14:50 IDT

- Split `תורנות` out into its own standalone panel above the regular tasks panel, so night-shift items are visually separate from daytime tasks.
- Added remembered fold/unfold controls for both the `תורנות` panel and the main tasks panel to make scanning and hiding each list easier.

## 2026-03-30 16:00 IDT

- Changed the night-shift carryover cutoff from `08:30` to `07:15`, updating both the actual filter logic and the visible UI wording so they stay aligned.

## 2026-03-30 16:20 IDT

- Ran a full visual polish pass on the single-page frontend: upgraded the color system, card surfaces, button styling, spacing rhythm, panel hierarchy, and task/list presentation to feel cleaner, more symmetric, and more compact without changing the core workflow.
- Reduced UI redundancy by hiding the empty filter-summary area unless meaningful non-date/non-patient filters are active, and tightened the status/filter region into a cleaner scan line.
- Validated the redesign with real headless Chrome screenshots after the code changes, not just script parsing.

## 2026-03-30 16:30 IDT

- Fixed the team-management alignment so `הוסף איש צוות` now sits in line with `מנהל יום`; matched the two columns structurally by aligning the grid to the top and adding a matching note row under the add-member field.

## 2026-03-30 16:35 IDT

- Fixed the `מיונים/יעוצים` status control markup so `נבדק/סגור` no longer renders inside an extra outer meta pill; the status button now sits directly in the row without the redundant nested box.

## 2026-03-30 16:38 IDT

- Removed assignee selection from the new-task creation flow while keeping assignee editing available for existing tasks; the assignment field in the main task form now appears only during edit mode.

## 2026-03-30 16:43 IDT

- Added task-row movement animation using position tracking around the task-board re-render, so when a task changes category/status/location it now slides from its old position to the new one instead of visually teleporting.

## 2026-03-30 16:47 IDT

- Replaced the temporary hero mark with the real Ichilov hospital logo image supplied by Dan, copied into `public/assets/ichilov-logo.jpg` and wired into the top-left header branding.

## 2026-03-30 16:50 IDT

- Tightened the new-task form layout so smaller fields like `סוג`, `תאריך`, and `שעה` no longer take oversized widths; the task-creation form now uses a more compact desktop grid that keeps the first row on one line more often while preserving a clean fallback on narrower screens.

## 2026-03-30 17:38 IDT

- Extended the compact layout treatment to the other panel forms as well: `רשימת מזוהמים`, `מיונים/יעוצים`, `רשימת הכנות ניתוחים`, the staff-management row, and the filters now use tighter field grids so more controls stay on a single line without feeling overcrowded.

## 2026-03-30 17:47 IDT

- Normalized the inline task-row control heights so the time input and assignee select now match the compact thickness of the inline date box.

## 2026-03-30 17:54 IDT

- Standardized the task-row action controls into one compact round-button system so the left-side task actions now share the same size, shape, and spacing and fit cleanly inside their action capsule.
- Ran a broader consistency pass across the reusable pill-like controls (`chips`, summary pills, patient pills, team tags, and status pills) so repeated small UI elements feel more visually related across the app.

## 2026-03-30 17:59 IDT

- Replaced the raw text symbols used for task/list actions with a small inline SVG icon set, giving the night-shift, move, copy-next-day, edit, and delete actions a cleaner and more modern look.
- Swapped the delete action from `×` to a trash-can icon across the task rows, supporting lists, and team-member cards so destructive actions read more clearly and consistently.

## 2026-03-30 18:26 IDT

- Fixed the side-list free-text notes so they are no longer passive display text: the comments in `רשימת מזוהמים` and `מיונים/יעוצים` now use the same quiet inline-edit pattern as the task-area free-text fields.
- Added in-place saving for those list comments on blur/Enter, plus the same auto-grow and clear-button behavior used in the main task text areas.

## 2026-03-30 18:29 IDT

- Removed the remaining forced `...` truncation rules from task-row text surfaces, so patient names and metadata chips now show their full text instead of being clipped with ellipses.
- Let those task-row text areas wrap naturally when needed, allowing the row to grow taller rather than hiding important text.

## 2026-03-30 18:39 IDT

- Removed the duplicate visible comment field from the `רשימת מזוהמים` form so that panel now exposes only the inline row-note editor rather than two separate visible comment boxes.
- Added real surgery-prep comment support end to end and rendered it with the same inline note editor pattern as the other side lists, so `רשימת הכנות ניתוחים` notes are now actually editable and saved.
- Tightened the shared side-list row layout and slightly compressed the task action capsule so the row text boxes line up better and task rows with six action icons keep all of them inside the pill.

## 2026-03-30 18:53 IDT

- Removed the now-redundant edit button from the main task rows, since the task bar already exposes the editable controls directly inline.

## 2026-03-30 18:55 IDT

- Replaced the side-list edit handlers’ generic page-top jump with targeted scrolling to the relevant form field, so editing an item in `רשימת מזוהמים`, `מיונים/יעוצים`, or `רשימת הכנות ניתוחים` now takes the user to the correct panel instead of the top of the screen.

## 2026-03-30 18:58 IDT

- Refined the small action icon system again with cleaner redrawn SVGs and more polished button surfaces, so the moon, move, copy, trash, and edit actions now look more balanced and modern at the compact sizes used in the task and list rows.

## 2026-03-30 19:06 IDT

- Increased the task-row action icon size and the surrounding action pill slightly now that there are fewer buttons, improving icon visibility without reintroducing the overflow issue.

## 2026-03-30 19:09 IDT

- Removed the screen-layout editing toolbar (`סדר מסך` / `אפס סידור`) from the UI and stopped applying the old saved layout-edit state on startup, so the app now opens directly into the normal fixed layout without those controls.

## 2026-03-30 19:12 IDT

- Replaced the top-left header image with a custom inline open-book checklist icon, including multiple checkbox rows and green completed checks, so the branding mark now matches the task-management concept more directly.

## 2026-03-30 19:17 IDT

- Reworked the top-left header mark into a clearer literal open-book checklist and removed the framed box styling around it, so the icon now reads more obviously as a book and sits openly in the hero area.

## 2026-03-30 19:18 IDT

- Moved the `מאגר מטופלים` panel back down to the bottom of the main page flow, below the task boards, so it no longer competes with the primary working area at the top of the screen.

## 2026-03-30 19:26 IDT

- Expanded `רשימת מזוהמים` from one generic note into a clearer two-part workflow with `שאלה` and `תוכנית`, plus an answered toggle that turns the row green, so infectious-patient follow-up now reflects open questions versus resolved ones more explicitly.

## 2026-03-30 19:30 IDT

- Replaced the top-left header mark with a cleaned transparent version of the user-provided closed-book logo and removed its white background, so the branding graphic now sits naturally on the hero without a white rectangle behind it.

## 2026-03-30 20:06 IDT

- Simplified the `רשימת מזוהמים` entry form by removing `תוכנית` from new-item creation and keeping that field only inline on the created patient row, so the top form now captures the patient and open question while the treatment plan stays attached to the existing list item itself.

## 2026-03-30 20:09 IDT

- Slimmed down the top hero bar significantly by reducing its vertical padding, logo size, and title/subtitle sizing together, so the header now takes much less vertical space while still reading clearly.

## 2026-03-30 20:16 IDT

- Added a persistent saved-for-tomorrow visual state to the `השאר גם ליום הבא` task action by exposing whether a next-day copy already exists and coloring the button when it does, so the user can see at a glance that tomorrow’s task has already been created.

## 2026-03-30 20:29 IDT

- Turned the `השאר גם ליום הבא` action into a true toggle: pressing it again now removes the task from tomorrow’s list, returns the button to its normal color, and sends a proper removal flag back to the UI so the visual state stays in sync with the saved data.

## 2026-03-30 20:41 IDT

- Reordered the new-task patient suggestion strip so, for the selected date, patients with the most recently created tasks now appear first and the remaining patient-pool names follow after them, making repeat entry for the latest patients faster.

## 2026-03-30 20:44 IDT

- Fixed the new-task patient quick-pick chips so choosing a patient from the bottom strip now triggers the same input-refresh path as typing, which makes the clear/delete icon appear correctly after selection.

## 2026-03-30 20:49 IDT

- Renamed the task category `ייעוצים` to `יעוצים` in the backend category list and ordering, and added a normalization step so existing saved tasks with the old spelling are automatically migrated to the new spelling on startup.

## 2026-03-30 21:06 IDT

- Added slide open/close motion to the foldable task buckets and the main collapsible task panels, so folding and unfolding now animate vertically instead of appearing instantly, which makes it easier to visually track what just moved.

## 2026-03-30 21:30 IDT

- Reduced lag in the new fold animations by switching larger collapsible sections to a lighter transform/opacity motion and shortening the heavier height-based timings for smaller folds, so the open/close behavior feels smoother while still being trackable.

## 2026-03-30 21:36 IDT

- Removed the remaining height-based fold animation entirely and switched all fold/unfold motion to a cheaper translate/opacity animation, trading a more literal accordion slide for a much lighter visual motion that should lag less on large task sections.

## 2026-03-30 21:38 IDT

- Rebuilt the Desktop app icon from the transparent book image by generating a fresh macOS `.icns` set and replacing the launcher bundle’s `applet.icns`, so the Desktop `Patient Tasks.app` now uses the same cleaned book mark as its Finder icon.

## 2026-03-30 21:40 IDT

- Renamed the Desktop launcher app and backup `.command` file to `הספר - משימות המחלקה`, and updated the app bundle metadata plus launcher alert titles so the Desktop-facing app name now matches the Hebrew product title consistently.

## 2026-03-30 21:49 IDT

- Recreated the missing Desktop launcher app `הספר - משימות המחלקה.app` from the existing backup `.command` launcher and re-applied the transparent book icon as the Finder app icon, restoring the double-clickable Desktop app wrapper.

## 2026-03-30 21:55 IDT

- Rebuilt the Desktop launcher icon again from Dan’s uploaded `closed-book-with-bookmark_815570-14266.avif` by converting that exact image, removing only the outer white background, saving the cleaned PNG as `public/assets/book-logo-user-transparent.png`, and regenerating the app bundle’s `.icns` so the Desktop app now uses the user-provided book art instead of the older placeholder book asset.

## 2026-03-30 22:02 IDT

- Replaced the AppleScript-style Desktop launcher with a clean standard `.app` bundle that points at the backup `.command` script, uses a dedicated `AppIcon.icns` generated from the uploaded book image, and forced Finder/Dock/icon-services cache refresh so macOS is more likely to show the new icon immediately.

## 2026-03-30 22:14 IDT

- Tightened the Desktop app icon again by cropping the transparent book image down to its real visible bounds, regenerating `AppIcon.icns` from that tighter transparent PNG with almost no margin, and refreshing Finder/Dock/icon caches so the book fills much more of the launcher icon area.

## 2026-03-30 22:16 IDT

- Rebuilt the Desktop launcher icon one more time with zero added padding: cropped the transparent book image to the exact visible bounds, regenerated the `.icns` from that ultra-tight PNG, and refreshed Finder/Dock/icon-services caches so the launcher icon is just the book artwork on transparency with no extra background margin added by the app bundle.

## 2026-03-30 22:57 IDT

- Added an online/shared-use mode for the app: API access can now be protected by a shared access code, the frontend now shows a login gate when online protection is enabled, and live cross-device updates now flow through a WebSocket channel so open clients refresh immediately after another client changes data.
- Added a one-click online launcher flow in `scripts/start-online.sh` plus Desktop launchers for the online mode, which starts the protected server on `127.0.0.1:3300`, creates or reuses a shared access code in `.online-env`, starts a Cloudflare quick tunnel, and writes the current share link plus access code to `online-access.txt` and to a Desktop text file.
- Verified end to end on the real public tunnel URL: unauthenticated requests were blocked, login with the generated access code succeeded, and two authenticated WebSocket clients connected through the public `https://...trycloudflare.com` URL both received immediate reload events when one client created and then deleted a task.

## 2026-03-30 20:55 IDT

- Updated the app’s main title from `משימות מחלקה` to `הספר - משימות המחלקה` in both the visible top banner and the browser tab title so the naming is consistent.

## 2026-03-31 00:12 IDT

- Turned the large book mark in the header into a real quick-actions button that opens a small popup menu with launcher downloads, user/admin switching, suggestion sending, and logout.
- Completed the role-aware online auth model: sessions now carry `user` vs `admin`, the login overlay can switch modes, the online launcher now generates a private admin access code as well, and the share file now records both the department code and the admin code with a privacy note.
- Added authenticated download routes for a Mac desktop launcher and an iPhone quick-launcher profile, plus a persisted `suggestions` table and `POST /api/suggestions` endpoint.
- Verified end to end on the live public URL in both API and real browser automation: normal login works, the popup opens, switching from user to the admin prompt works, and admin login succeeds afterward.

## 2026-03-31 00:21 IDT

- Tightened the visual fit of narrow-form placeholder text by reducing placeholder sizing globally and shrinking the longest list-field placeholders a bit more, so example text like `E. coli` / `Meropenem` no longer crowds the compact inputs.
- Reworked the three side-list row headers (`רשימת מזוהמים`, `מיונים/יעוצים`, `רשימת הכנות ניתוחים`) so the patient name and the metadata/status items now share one scan line with horizontal overflow instead of wrapping onto separate stacked lines.
- Centered visible date text across the UI and centered the inline task-row assignee/date controls, so the compact task boxes read more symmetrically.

## 2026-03-31 00:36 IDT

- Turned the patient name in each main task row into a quick shortcut back to `משימה חדשה`: clicking the name now exits task-edit mode, prefills that patient in the new-task form, keeps the task date when it is still valid, and scrolls/focuses the form so adding another task for the same patient is faster.
- If the clicked task belongs to a past date, the shortcut intentionally falls back to today because the app still blocks creating new tasks in the past.

## 2026-03-31 00:40 IDT

- Fixed the top-left book popup not appearing by removing clipping from the header banner and raising the popup above the hero decoration layers, so the menu can extend below the banner instead of being cut off.
- Reordered the popup actions to match Dan's requested list more closely and kept all six options visible in the menu; in local/non-online mode the account-related actions remain visible but disabled instead of disappearing.

## 2026-03-31 00:48 IDT

- Added `צור משתמש חדש` as another top-left popup action and wired it to a dedicated “new user” sign-in prompt.
- Kept the implementation honest with the current auth model: the app still uses shared department/admin access codes rather than separate named user accounts, so the new flow prepares a fresh user sign-in on this device instead of pretending a full account-management system exists.

## 2026-03-31 01:28 IDT

- Replaced the temporary shared-user login model with real staff accounts: a new user now registers with a Hebrew name plus a 4-digit-or-longer numeric password, the account starts in `pending`, and only after admin approval can that staff member log in and edit data.
- Added a real `staff_accounts` table plus hashed-password authentication, approval and deletion endpoints, richer session payloads (`display_name`, `team_member_id`, `can_edit`, `can_admin`), and mutation protection so online edits now require an approved staff/admin session instead of the old shared department code.
- Linked staff accounts directly to team members: registration now auto-creates or reuses the matching team-member row, `/api/meta` now returns team members with account status, and team-member cards can show `ממתין לאישור`, `חשבון פעיל`, or `ללא חשבון`.
- Updated the auth overlay into three real flows (`כניסת צוות`, `צור משתמש`, `מנהל`), added admin approval/delete controls inside `ניהול אנשי צוות`, and made the currently logged-in staff member’s card outline turn green while other cards stay gray.
- Verified the new model end to end in a disposable copy of the app: anonymous task mutation is blocked, registration creates a pending account, pre-approval login fails, admin approval succeeds, approved staff login succeeds, authenticated staff can create tasks, self-account deletion logs the staff user back out, and the frontend logic shows both the create-user screen state and the green active staff-card state.
- Refreshed the real online server on `127.0.0.1:3300` with the new auth code while keeping the tunnel process alive, and updated the saved online access note files so they now describe the staff-account flow instead of the retired department access-code flow.

## 2026-03-31 01:52 IDT

- Switched the admin login from the previous private admin code to a dedicated admin username/password account that is intentionally separate from `team_members`, so it never appears as assignable staff and cannot be attached to tasks.
- Set the private admin credentials for this deployment to username `nes-dr` and password `neuro135`, stored them in `.online-env`, updated the online launcher script to pass `APP_ADMIN_USERNAME` / `APP_ADMIN_PASSWORD`, and rewrote the online share note to show the admin username instead of the retired admin code wording.
- Updated the frontend admin login screen to use username + password (instead of an admin code), verified on an isolated copy that admin login succeeds and that `nes-dr` does not appear in `/api/meta` team members, then refreshed the real online server on port `3300` and confirmed the public tunnel still responds with protected `401` for anonymous access while real admin login works locally.

## 2026-03-31 02:01 IDT

- Added patient-name hover history across the main task list and the three side lists: after a short hover delay, a small popup now shows the last update time and the editor name.
- Extended the audit metadata model so tasks, infected-list entries, ER/consult entries, and surgery-prep entries all carry `updated_at` and/or `updated_by_name`, and applied a live migration to older tables that were still missing those columns.
- Fixed admin session identity so admin-made edits now record and display the real admin username (`nes-dr`) instead of a generic `Admin` label, then verified the popup in a real browser hover flow on the live local online server (`127.0.0.1:3300`).

## 2026-03-31 02:06 IDT

- Added a proper admin-only feedback inbox: the top-left book menu now shows `פידבקים שהתקבלו` for admin sessions, while regular users still keep the `שלח הצעה` action.
- Extended the `suggestions` model with `submitted_by_name`, added admin-only suggestion listing/deletion routes, and made new suggestions store the real sender name when available.
- Built an admin feedback modal that lists each suggestion with sender name and submission time and allows deletion in place; verified end to end in a real browser flow by creating a temporary suggestion, seeing it in the inbox, and deleting it from there.

## 2026-03-31 02:12 IDT

- Added a daily `כוננים` section inside `ניהול אנשי צוות`, with four fixed-role selectors: `ראש`, `עמ״ש`, `אנגיו`, and `ילדים`, each limited to the exact predefined name list Dan provided.
- Backed the new selectors with a dedicated `daily_on_call_assignments` table plus `GET/PUT /api/on-call-assignments`, and exposed the fixed role/name lists through `/api/meta` so the frontend stays in sync with the backend.
- Kept the workflow parallel to `מנהל יום`: the choices are saved for the current day in the UI, and they now also refresh during normal live reloads; verified with a future-date save/read/clear round-trip so no real current-day data was changed during testing.

## 2026-03-31 02:27 IDT

- Changed `כוננים` from a strict calendar-day rule to a handoff window: a setup now stays active for its day and carries into the next day until `06:00`, then the new day starts with a clean setup unless new choices are saved.
- Matched that behavior in both the frontend and backend by resolving an effective on-call date before load/save, so the UI text and the API now agree on which day is currently controlling the on-call selectors.

## 2026-03-31 02:33 IDT

- Applied the same `06:00` handoff rule to `מנהל יום`, so the selected day manager now stays active into the next morning until `06:00` instead of resetting strictly at midnight.
- Reused the same effective-date logic and note wording style as `כוננים`, keeping the team-management rules consistent and easier to understand.

## 2026-03-31 02:40 IDT

- Compressed the `ניהול אנשי צוות` duty controls into one shared horizontal strip, so `מנהל יום` and all four `כוננים` selectors now sit in the same row on desktop instead of consuming multiple stacked rows.
- Kept the explanatory notes underneath that strip and added responsive fallbacks, so the layout stays compact on wider screens but still wraps cleanly on narrower ones.

## 2026-03-31 02:46 IDT

- Removed the manual `הוסף איש צוות` control from `ניהול אנשי צוות`, because staff members are now meant to enter the system through registration rather than through a separate add button.
- Updated the team-management header copy to match the new account-based flow while keeping the existing staff list, assignment options, and admin approval controls intact.

## 2026-03-31 02:54 IDT

- Changed the top-left account-switch flows (`החלף משתמש`, `צור משתמש חדש`, `עבור לחשבון מנהל`) so they open a reversible auth overlay instead of immediately logging the current user out.
- Added a `חזור` button to that overlay when it was opened intentionally, letting Dan back out safely if the account menu was opened by mistake while keeping forced re-login behavior intact for real logout/session-expiry cases.

## 2026-03-31 03:00 IDT

- Simplified the top-left account menu by replacing the three separate account-entry buttons with one shared `חשבון` button, since they all lead into the same auth overlay anyway.
- Added `התנתק` directly inside that overlay when it is opened intentionally from the menu, so login, create-user, admin switch, back, and logout now live in one consistent place.

## 2026-03-31 03:07 IDT

- Simplified the staff cards by removing the redundant `חשבון פעיל` / `ללא חשבון` text, leaving the border color to communicate active-vs-inactive presence while keeping the `ממתין לאישור` badge for pending accounts.
- Kept the current green-outline behavior unchanged and reduced visual clutter in `ניהול אנשי צוות` so the staff list reads faster.

## 2026-03-31 03:12 IDT

- Tightened the infected-list row layout so the `שאלה` and `תוכנית` labels now sit beside their inline text fields instead of above them, preserving vertical space in the list.
- Kept the same inline editing behavior and only changed the visual arrangement for a more compact readout.

## 2026-03-31 03:20 IDT

- Replaced the web-downloaded desktop launcher from a raw `.command` script to a Mac `.webloc` shortcut, because browser-downloaded `.command` files were not staying executable and therefore failed when Dan tried to open them.
- Added a new `/download/desktop-launcher.webloc` route and made the old `/download/desktop-launcher.command` route return the same `.webloc` file too, so even already-open tabs now download the fixed format.

## 2026-03-31 03:28 IDT

- Upgraded the web-downloaded desktop launcher again from a plain shortcut file to a generated Mac `.app` bundle zipped for download, so the launcher can keep the custom book icon while still opening the current online URL.
- Implemented on-demand app packaging on the server using AppleScript + `iconutil`, and verified that the downloaded archive unpacks into `הספר - משימות המחלקה.app` with a real `applet.icns` file inside.

## 2026-03-31 03:39 IDT

- Removed the launcher-download actions from the top-left menu for now and replaced them with a single bookmark helper action.
- Added a bookmark modal that gives the fastest device-appropriate save path: keyboard shortcut on desktop, share-sheet guidance on phones, plus copy-link and share options where supported, since modern browsers do not allow silent automatic bookmark creation.

## 2026-03-31 03:45 IDT

- Widened the inline task-row `שיוך` column and adjusted the select styling so the `ללא שיוך` value no longer gets clipped inside the task bar.
- Kept the task row compact overall by changing only that control’s width and text alignment instead of expanding the whole row layout.

## 2026-03-31 03:49 IDT

- Tightened the `שיוך` fix further after the first pass still clipped `ללא שיוך`: the task-row column is now wider again and the browser’s default select arrow was replaced with a lighter custom arrow so the text has more usable space.
- Kept the change focused on the assignee control rather than expanding the rest of the row layout.

## 2026-03-31 03:53 IDT

- Strengthened the `שיוך` visibility fix after the previous width tweak was still not enough: the assignee column is now wider again, and the inline select uses larger text, a taller control, and explicit right-aligned RTL rendering so `ללא שיוך` has a better chance to display fully across browsers.

## 2026-03-31 03:57 IDT

- Simplified the task-row `שיוך` control after the previous custom-arrow styling created a strange visual result: the assignee box now uses a more standard select appearance again, with more width and centered text.
- This keeps `ללא שיוך` readable while avoiding the custom select chrome that looked off.

## 2026-03-31 04:02 IDT

- Added `אחר` to the allowed `תרבית` options for the infected list.
- Widened the infected-form `תרבית` field so the default `ללא תרבית` option fits fully inside the select box.

## 2026-03-31 04:09 IDT

- Upgraded the infected list so existing rows can now be edited directly in place: patient name, `תרבית`, `מזהם`, and `ABX` are inline controls inside the created row itself, matching the faster task-row editing style.
- Consolidated infected-row save logic so inline edits to one field do not accidentally overwrite newer values in the other row fields.

## 2026-03-31 04:16 IDT

- Cleaned up the task-row `שיוך` control again: removed the dropdown symbol/arrow entirely and widened that column so the value text, especially `ללא שיוך`, has the full box width instead of being blocked by select chrome.

## 2026-03-31 04:21 IDT

- Replaced the visible `כווץ / פתח` text on the main panel fold buttons with compact triangle symbols only, while keeping descriptive accessibility labels behind the scenes.

## 2026-03-31 04:33 IDT

- Tightened infected-list row editing again: the open/answered state is now symbol-only (`✕` / `✓`) to save space, and the patient name is no longer edited inline there; clicking it now routes back to the main infected editor at the top.
- Added hover-reveal titles for cramped inline infected fields like `מזהם` and `ABX`, so the full value can still be read when the visible box is narrow.
- Extended row-level inline editing to the other side lists too: `מיונים/יעוצים` now supports direct inline updates for `ת.ז` and `אגף/מחלקה/ביה״ח`, and `רשימת הכנות ניתוחים` now supports direct inline updates for `סוג ניתוח`, while their patient-name buttons take the user to the top editor.

## 2026-03-31 04:36 IDT

- Simplified the infected-list answered marker one step further: unanswered is now visually empty, and only answered rows show the `✓` symbol.

## 2026-03-31 04:41 IDT

- Shrunk the task-row left action capsule by changing it from a fixed-width grid column to content-sized width, so the button box now hugs the actual number of icons instead of reserving a large empty area.

## 2026-03-31 04:47 IDT

- Replaced the native browser hover tooltip for cramped inline list fields with a custom in-app hover card styled to match the patient-name “last edited” popup, so long values like `מזהם` and `ABX` now reveal in the same visual language as the rest of the page.

## 2026-03-31 04:50 IDT

- Extended the same custom hover-card reveal to the task-row comment box, so long task comments now open in the same styled popup instead of staying clipped inside the compact task bar.

## 2026-03-31 04:54 IDT

- Relaxed the custom hover-card sizing rules so long revealed text now expands the popup naturally up to a larger viewport-safe width, with forced wrapping for long words, instead of spilling outside the popup box.

## 2026-03-31 05:01 IDT

- Tightened the custom hover-card logic so it now appears only when the underlying field text is actually clipped, instead of on every hover.
- Extended the same styled hover-card reveal to the other list text/comment fields, and added a runtime pass that upgrades button `title` tooltips into the same in-app hover-card style so the page no longer mixes browser-native tooltip chrome with the custom design.

## 2026-03-31 05:08 IDT

- Reordered and relabeled the account overlay mode buttons to the simpler set `צור חשבון`, `התחבר`, `מנהל` in right-to-left order.
- Removed logout from the account overlay itself and restored it as a separate red quick action in the top-left book menu, marked with the `⏻` symbol so it stands out as a destructive/account-ending action.

## 2026-03-31 05:12 IDT

- Changed the account overlay `חזור` control into a compact return-arrow button and moved it to the bottom-left corner of the auth card, so it reads as a lightweight navigation action instead of a full secondary action button.

## 2026-03-31 05:16 IDT

- Refined the auth-card footer so the return-arrow button now sits on the same real footer row as `התחבר`, aligned horizontally with it while still staying at the left edge of the account window, instead of floating separately below.

## 2026-03-31 03:58 IDT

- Renamed the task category `שיקומיסט` to `שיקום` throughout the app, including frontend metadata, backend validation, and task ordering.
- Added a live migration so older saved tasks with category `שיקומיסט` are automatically rewritten to `שיקום` on server start, keeping existing data valid.

## 2026-03-31 13:15 IDT

- Tightened the `ת.ז` field in `מיונים/יעוצים` so both the top form and inline row editing now allow only digits plus the letter `z`, with a hard 12-character limit while typing and pasting.
- Added matching backend validation and a normalization pass for older ER IDs, so invalid values are blocked on save and legacy rows no longer interfere with later inline updates.

## 2026-03-31 13:25 IDT

- Refined the `ת.ז` rule again so `z` is now allowed only once and only as the very first character; all remaining characters must be digits.
- Updated both the live input sanitizing and server-side validation to match this stricter pattern, and verified the running app accepts `z12345` / `123456` while rejecting values like `12z3` and `zz123`.

## 2026-03-31 13:35 IDT

- Tightened the main task-row grid so the `פירוט` column is shorter and the date, time, and `שיוך` columns use steadier fixed widths, which keeps those controls visually aligned from row to row instead of drifting with the action-button width.
- Stretched the date/time cluster and comment box to fill their columns more consistently, preserving the compact look while making the vertical alignment cleaner across the task list.

## 2026-03-31 14:49 IDT

- Stabilized the shared online auth/presence flow: the old manual team-member creation route is now blocked, and `ניהול אנשי צוות` green outlines now reflect real live websocket presence of approved staff accounts instead of merely “this is the current user on this device.”
- Cleaned the UI consistency pass further: removed mixed English helper labels from the top-left menu, updated outdated empty-state copy around staff/admin setup, kept empty category chips selectable, and switched the clear-text control to the same custom hover-tooltip system so browser-native tooltip styling no longer leaks through.
- Tightened the responsive behavior again with a focused mobile overflow pass on the hero, task rows, list rows, and top panels; final desktop and mobile headless browser screenshots were reviewed after the fixes.
- Fixed a misleading account-deletion response bug discovered during verification: deleting an account now correctly returns `deleted: 1` instead of falsely reporting `0` because of cascade timing.
- During this stabilization pass, `public/index.html` had to be recovered from Chrome cache after the file was unexpectedly emptied; the recovered page was restored successfully, re-patched, syntax-checked, and re-verified live.

## 2026-03-31 14:55 IDT

- Re-verified the `copy to next day` task action against the live app: it already preserves the patient/category/details/time/assignment as expected while explicitly leaving the copied task out of `תורנות` by keeping `night_shift_anchor_date = NULL` on the new next-day row.

## 2026-03-31 15:04 IDT

- Refined the `copy to next day` linkage so the button is now category-aware: a task only shows the tomorrow-copy button as active when tomorrow has a linked copy in the same category.
- This specifically fixed the `מעבדות` <-> `מעקבים` workflow: moving a copied lab task into `מעקבים` now turns the button off while leaving tomorrow’s lab copy intact, and moving it back to `מעבדות` turns the button back on automatically because the linked tomorrow row still exists.
- While the tomorrow-copy button is active, inline edits now sync forward automatically into tomorrow’s linked row for patient/details/comment/time/assignment/subcategory/category/priority, while still keeping the color rule (`yellow` stays `yellow`; every other status becomes colorless / `not_started` tomorrow).
- The next-day copy action now also carries over the task comment when creating or refreshing tomorrow’s row, while still stripping out any `תורנות` state from the copied task.

## 2026-03-31 15:55 IDT

- Tightened the `רשימת הכנות ניתוחים` row layout so each patient entry now keeps its patient name, surgery type, comment, and ready/not-ready status in one horizontal line instead of pushing the comment onto a second row.
- Reused the existing inline text-edit pattern for the surgery comment inside that same row, preserving direct editing and hover-reveal behavior while making the list noticeably more compact.

## 2026-03-31 15:56 IDT

- Updated the `סוגי משימות` category filter chips so categories with no currently matching tasks stay visibly greyed out instead of looking like normal available chips, while still remaining clickable if needed.
- The empty/grey state now follows the current filter context (date/patient/assignee and other active filters), not just the full unfiltered task database.

## 2026-03-31 19:30 IDT

- Recovered the online access after the shared phone link failed: the local app server on `127.0.0.1:3300` was restarted, the quick Cloudflare tunnel was relaunched in a persistent session, and the saved share files were updated to the verified working public URL.
- Verified the live public tunnel from outside the machine: the homepage returned `200`, and the protected `/api/session` endpoint returned `401 Unauthorized`, which is the expected pre-login behavior for the online app.

## 2026-03-31 20:02 IDT

- The recurring `copy to next day` labs/followups rule was re-verified on the current live server and still behaves correctly at the backend level: moving a copied `מעבדות` task into `מעקבים` returns `has_next_day_copy = 0`, and moving it back to `מעבדות` returns `has_next_day_copy = 1`.
- To eliminate stale UI state on phones/tablets, the API responses and the main `index.html` page are now both explicitly marked `no-store`, and the frontend refresh calls now request fresh data with `cache: 'no-store'` instead of risking reuse of cached task lists after category moves.

## 2026-03-31 20:15 IDT

- Expanded the visible `כוננים` wording so the four duty labels now read `כונן ראש`, `כונן עמ״ש`, `כונן אנגיו`, and `כונן ילדים` both in the saved backend role metadata and in the top management strip UI.

## 2026-03-31 20:44 IDT

- Added a true phone-only responsive mode inside the same single-page app while keeping the desktop workflow intact.
- In phone mode, the screen now simplifies down to three things only: a read-only `כוננים פעילים` panel, `משימה חדשה`, and the task list; the team panel, side lists, filters, patient pool, and separate night-shift panel are hidden.
- Phone mode now forces a today-only workflow: new tasks are saved automatically for today, the new-task time/date controls are hidden, task filtering ignores desktop-only patient/category/assignee filters, and the visible task list is limited to today's tasks.
- Night-shift tasks are still preserved on phone, but instead of a separate extra box they are merged into the main task-list panel as a dedicated `תורנות` section for a simpler mobile view.
- To keep the phone rule honest, the `copy to next day` button is suppressed on phone so mobile use cannot create tomorrow tasks by accident.

## 2026-03-31 20:57 IDT

- Refined the phone mode after Dan's follow-up: `רשימת מזוהמים`, `מיונים/יעוצים`, and `רשימת הכנות ניתוחים` are back on the phone screen, but only as collapsed drawers that must be opened explicitly.
- Those three phone drawers are now read-only: the creation forms, inline edit controls, and edit buttons are hidden there, while per-row delete remains available.
- Desktop stayed visually unchanged by making the new collapse controls phone-only and forcing those three panels open again whenever the app is viewed on desktop-sized screens.

## 2026-03-31 21:10 IDT

- Tightened the phone layout again without changing desktop: `כוננים פעילים` now auto-loads collapsed on phone, using the same symbol-only fold control style as the other phone drawers.
- Added a dedicated phone-only patient quick-pick strip directly under the `מטופל` field in `משימה חדשה`, so selecting an existing patient no longer depends on flaky mobile datalist behavior.
- Corrected the mobile book-menu positioning so the popup opens inward from the left-side icon instead of getting clipped off the left edge of the phone screen.

## 2026-03-31 21:28 IDT

- Fine-tuned the phone-only `כוננים פעילים` header so its fold/unfold button is pinned to the left side in the same visual position as the other phone drawer toggles.
- Kept the fix fully scoped to phone CSS so the shared desktop header layout remains unchanged.

## 2026-03-31 21:28 IDT

- Simplified the phone task rows further by hiding the inline `שיוך` field there and pulling the comment row upward, so the mobile task list stays cleaner without affecting the desktop task layout.

## 2026-03-31 22:29 IDT

- Compressed the phone-only list rows again while leaving desktop untouched: `רשימת מזוהמים` now shows only the patient name, `מיונים/יעוצים` shows only name + ID + location, and `רשימת הכנות ניתוחים` shows only name + surgery type + readiness.
- Reused the existing phone compact-row styling for those three mobile drawers, keeping delete available but removing the extra read-only fields from the rendered phone rows themselves.
- Activated the one-line mobile task-row layout by wiring phone task rows onto the dedicated `phone-task-row` CSS path, while the desktop task markup and behavior stayed unchanged.

## 2026-03-31 22:31 IDT

- The previous public `trycloudflare` link had gone stale even though the local shared server on `127.0.0.1:3300` was still healthy.
- Restarted the online launcher to generate a fresh tunnel URL and re-wrote `online-access.txt` with the new address.
- Verified the new public link end to end: homepage returned `200`, and `/api/session` returned `401` before login, which confirms the app is live and the login protection is working.

## 2026-03-31 22:44 IDT

- Tightened the phone-only row chrome again without touching desktop: reduced mobile row padding, action-capsule bulk, status-pill height, and inline editor padding.
- Kept all mobile list entries and task rows on a steadier single horizontal line by centering the phone compact grids and shrinking the row internals rather than changing the desktop markup path.
- Hid the extra mobile task-row edit affordances (`✎` hint and inline clear button) so the task rows read flatter and thinner on phone while staying fully editable on desktop.

## 2026-03-31 22:54 IDT

- Compressed the phone rows further by stripping more mobile-only chrome: the side-list delete area is now decoration-light, the status pills are shorter, and the phone list/task gaps are smaller.
- Shrunk the phone task rows again by reducing the status strip height, task action button size, patient/description font size, and internal row padding, while keeping the desktop task rows unchanged.
- Kept the mobile changes scoped to `body.phone-layout` so the desktop view still uses the original fuller spacing and controls.

## 2026-03-31 23:00 IDT

- Flattened the phone rows again to keep their contents on one horizontal line more reliably: mobile list rows now use a tighter flex shell, narrower compact grids, and smaller text/status spacing.
- Reduced the phone task rows further by shortening the status strip, shrinking the patient/description text, and trimming the action icons so the whole row can stay side-by-side more easily.
- Verified against a no-auth local phone render that the mobile list rows for `מזוהמים`, `מיונים/יעוצים`, and `רשימת הכנות ניתוחים` still render as single horizontal rows while the desktop layout path remains unchanged.

## 2026-03-31 23:09 IDT

- Performed a broader phone-only design audit and polished the mobile surfaces beyond the rows themselves: panel headers, panel bodies, field labels, buttons, patient chips, and task-group headers now use tighter spacing and smaller typography on phone.
- Kept the improvements scoped to `body.phone-layout`, so the desktop rendering path still shows the original richer spacing and denser controls.
- Double-checked the result with fresh phone and desktop screenshots: the phone version is cleaner and more compact overall, while the desktop view remained visually unchanged.

## 2026-03-31 23:35 IDT

- Fixed the `יעוצים` task-category creation bug by refreshing stale task-table category constraints at startup when the SQLite schema still contains legacy category names like `ייעוצים` or `שיקומיסט`.
- Also fixed a hidden bug in the legacy task-table rebuild path itself: the migration code was referencing `hasHighPriority` and `hasRecurringFollowupId` without defining them.
- Verified the fix with a real no-auth local create request for category `יעוצים`, then deleted the temporary test tasks and restarted the real online server on `127.0.0.1:3300`; the live tunnel stayed healthy and `/api/session` still returned `401` as expected before login.

## 2026-03-31 23:54 IDT

- Tightened the shared patient-name suggestion logic so stale names no longer linger after a patient disappears from the active Excel pool and is no longer attached to any active work item.
- The hidden suggestion cache is now rebuilt from the active uploaded Excel pool plus patients still referenced by tasks, the infected list, or the surgery-prep list; `מיונים/יעוצים` stays out of this shared pool on purpose because it uses a separate patient source.
- Kept the visible `מאגר מטופלים` panel truthful by continuing to show only the uploaded Excel pool itself, while the behind-the-scenes suggestion lists can still include currently active referenced patients.

## 2026-04-01 00:02 IDT

- Corrected the patient-suggestion pruning rule again after Dan reported one stale patient name still remained in the new-task helper list.
- The bug was that task-linked patient names were being collected from all task dates, so an old patient from another day could still leak into today's creation helper even after disappearing from the active Excel pool.
- The tracked patient-name source is now date-aware: the new-task suggestion list uses the active uploaded pool, the selected date's tasks only, plus the always-active shared side lists (`מזוהמים`, `ניתוחים`).

## 2026-04-01 00:11 IDT

- Escalated the stale patient-suggestion fix after the narrowed data source still did not remove an old name from Dan's new-task patient box.
- The likely remaining source was browser autofill rather than app data, so the new-task patient field no longer relies on the browser's native suggestion dropdown.
- Replaced that one field with an app-controlled suggestion menu fed only by current app data, and also suppressed native browser autofill more aggressively for that input.

## 2026-04-01 00:28 IDT

- Extended the same app-controlled patient suggestion dropdown style from `משימה חדשה` into the side-list creation forms for `רשימת מזוהמים` and `רשימת הכנות ניתוחים`.
- Those two patient inputs no longer depend on the browser's native autofill list, so they now follow the same visual language and current-data-only behavior as the main new-task patient field.
- Kept the change scoped to the list-form patient inputs only; the broader desktop layout and the unrelated filter autocomplete stayed unchanged.

## 2026-04-01 00:42 IDT

- Fixed three follow-up issues in the patient suggestion menus: the main new-task menu was closing immediately because its wrapper was not treated as a suggestion field, the side-list menus were showing blank dropdown shells when there were no current suggestions, and `מיונים/יעוצים` was still falling back to the browser's old autofill behavior.
- Moved `מיונים/יעוצים` onto the same app-controlled patient suggestion system, scoped to the current live ER list names only.
- Updated the custom menus so zero available suggestions now means no popup at all instead of an empty popup shell.

## 2026-04-02 00:53 IDT

- Reviewed permanent hosting options for turning the app into a stable online product with a real domain instead of a temporary Cloudflare tunnel.
- Current app architecture is best suited to a single always-on server instance because it stores data in a local SQLite file and keeps live WebSocket presence/reload state in process memory.
- Recommended first production path is a simple single-instance deployment with persistent disk, automatic HTTPS, domain DNS, and backups now, then a later migration to Postgres plus shared realtime if higher availability or multi-instance scaling is needed.

## 2026-04-02 19:19 IDT

- Prepared a clean deployment upload bundle on Dan's Desktop for the permanent-domain rollout, excluding local database files, secrets, logs, caches, and other machine-specific artifacts.
- Created both a folder and zip version to make the GitHub upload step easier for a non-technical handoff into Render deployment.

## 2026-04-03 13:23 IDT

- Investigated migrating the real working data into the new permanent Render domain at `https://www.sefer-neuro.org`.
- Confirmed the live Render site is healthy and authenticated, but the obvious local source databases on this Mac (`tasks.db`, `shared-data/tasks.db`, and the latest backup) currently contain almost no operational data beyond staff accounts/suggestions.
- Confirmed the running local server process is attached to `shared-data/tasks.db`, so blindly migrating from this machine right now would overwrite the permanent site with the wrong mostly-empty dataset. The real source data appears to live somewhere else and needs to be identified before executing migration.

## 2026-04-03 13:33 IDT

- Fixed the iPhone-style auto-zoom annoyance in the phone layout by forcing focused text controls to render at `16px` while editing.
- Kept the change scoped to `body.phone-layout` so the desktop UI and the compact non-focused mobile look stay unchanged.

## 2026-04-03 14:19 IDT

- Added explicit favicon/bookmark icon links in the page head, pointing at the existing transparent book asset so browser bookmarks stop falling back to the generic globe icon.
- Included both regular favicon and Apple touch icon declarations to improve bookmark/home-screen icon pickup across desktop and mobile browsers.

## 2026-04-03 15:37 IDT

- Added `קבלות` as a real task category in the backend source of truth.
- Updated the category sort order and the task-table category constraint refresh logic so the new category is accepted both for fresh saves and for existing deployed databases that need their SQLite category check rebuilt.

## 2026-04-03 16:09 IDT

- Added a closed-state helper button to `מיונים/יעוצים`: when an entry status is `סגור`, the row now shows `הוסף הערה` beside the inline note box.
- The new button does not create a second field; it simply focuses the existing inline comment box to make post-closure note entry faster. Kept it out of the phone layout so the simplified mobile view stays unchanged.

## 2026-04-03 16:17 IDT

- Replaced the temporary closed-state ER helper button with a real move action: closed `מיונים/יעוצים` rows now show `הוסף לקבלות`.
- Added a backend route that creates a task under category `קבלות`, carries over useful ER details, and removes the patient from the ER list in one transaction.
- Added an evening/night rule for this transfer: from `18:00` through before `05:00`, the created admissions task is automatically placed into `תורנות`; before `05:00` it is anchored to the previous date's night shift.
- Verified the core move flow on a temporary isolated server: closed ER entry -> new `קבלות` task created -> ER entry removed.

## 2026-04-03 16:27 IDT

- Relaxed `קבלות` so it no longer requires mandatory `פירוט`.
- Refined the ER-to-`קבלות` transfer so the original `מיונים/יעוצים` note/comment is no longer copied into the admissions task.
- Verified the updated transfer on a temporary isolated server: the created `קבלות` task now has blank description and keeps only structured ER details (`אגף/מחלקה/ביה״ח` and `ת.ז`) in the task comment.

## 2026-04-03 16:29 IDT

- Changed the `הוסף לקבלות` action button style from teal to orange so it reads more clearly as a transfer/action button in the `מיונים/יעוצים` list.

## 2026-04-03 16:32 IDT

- Further simplified the ER-to-`קבלות` transfer: moved admissions tasks no longer carry over `אגף/מחלקה/ביה״ח` or `ת.ז` either.
- Verified on a temporary isolated server that the created `קבלות` task now arrives fully clean: blank description and no transferred comment/details at all.

## 2026-04-04 06:51 IDT

- Expanded the desktop patient filter so date filtering can be widened for one patient across multiple dates or all dates, while still defaulting to the current day.
- Added a patient-date chip row that appears only when a patient filter is active, with one-click toggles for specific dates plus `כל התאריכים`.
- Wired the task and night-shift filtering logic to respect either the default single date, a chosen set of dates, or the new all-dates mode without changing the phone layout.

## 2026-04-04 07:27 IDT

- Reworked the new patient multi-date filtering so the visible desktop layout stays unchanged: the extra date chip row was removed again and the behavior moved into the existing date control.
- The desktop filter date button now opens a custom calendar popover that marks task dates in orange, allows selecting multiple dates for a filtered patient, and includes an in-calendar `כל התאריכים` action.
- Kept the default behavior anchored to the current day, while leaving the phone layout unchanged.

## 2026-04-04 08:08 IDT

- Moved the desktop `כל התאריכים` toggle into the task-category chip flow itself, so it sits as the wrapped leftmost chip instead of on a separate line below the chips.

## 2026-04-04 08:17 IDT

- Switched the desktop patient filter field from the browser's native autofill style to the same app-controlled patient suggestion dropdown used in the other patient-name fields.
- The filter box now opens the same styled suggestion menu and uses current filtered task names instead of stale browser-saved names.

## 2026-04-04 08:23 IDT

- Fixed the desktop filter-patient suggestion list being clipped by the bottom edge of the filtering panel by allowing overflow to stay visible for that panel only.

## 2026-04-04 08:31 IDT

- Split patient-name ordering into two behaviors: the bottom quick-pick chips in `משימה חדשה` still bring the most recently used patient to the front, while the name dropdown menus now stay alphabetical.

## 2026-04-04 16:38 IDT

- Added direct inline editing for `מכתבים` task sub-categories from the task bar by replacing the read-only letter badge with a compact dropdown that reuses the existing letter subcategory list.

## 2026-04-04 16:56 IDT

- Fixed task-bar clearing of `פירוט` and `הערה` so empty values get saved reliably instead of being restored by the next live/background refresh, and removed the `ללא תת-סוג` option from the inline `מכתבים` sub-category selector.
