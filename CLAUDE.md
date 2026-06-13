# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A self-hosted Flask + Socket.IO web app for running real-time party voting games on custom images. Despite the "Marry, F, Kill" name, it hosts **three game modes** that share one image library and one player base:

- **MFK** (Marry/F/Kill) — players drag 3 images into the three categories per group
- **Smash or Pass** — players vote smash/pass on one image at a time
- **Slideshow** — passive display mode

Players join with **no login** (a session-cookie `user_id`), usually by scanning a generated QR code. There is a unified `/vote` page that auto-detects whichever game (S/P or MFK) is currently active, so the audience only ever needs one URL. Admin pages are gated behind HTTP Basic Auth.

## Commands

```bash
# Dev server (auto-reload, debug) — http://localhost:5000
python run_dev.py          # or: python app.py

# Install deps
pip install -r requirements.txt

# Production (matches Docker CMD) — gunicorn + gevent, single worker
gunicorn --worker-class gevent -w 1 --bind 0.0.0.0:5000 app:app

# Docker (compose maps host 8765 -> container 5000)
docker compose up --build

# Load test (simulates ~100 concurrent voters against a running server)
python load_test.py        # edit BASE_URL / NUM_USERS at top of file
```

There is **no test suite, linter, or build step** in this repo. `test_install.py` only checks that dependencies import. Verify changes by running the app and exercising the pages in a browser.

### Default credentials / env
- Admin auth: user `admin`, password from `ADMIN_PASSWORD` (defaults to `admin123`).
- `SECRET_KEY` env var for session signing (defaults to a dev value).
- These are read once at startup in `app.py`.

## Architecture

**Two-file backend.** Almost all logic lives in `app.py` (~1750 lines, all routes + Socket.IO handlers) and `database.py` (SQLAlchemy models + DB init/migration). There is no service/blueprint layer — routes call models and `socketio.emit` directly.

**State lives in SQLite, not in memory.** DB is at `data/fmk_quiz.db` (the `data/` dir is created at startup if missing). Models: `Image`, `Folder`, `Poll` → `PollGroup` (3 image FKs each) → `Submission`; and `SmashPassSession` → `SmashPassVote`. "Which game is active right now" is derived by querying for a `Poll`/`SmashPassSession` with `status='active'` (ordered by newest) — there is no global runtime state object. Results are computed on demand by aggregating `Submission`/`SmashPassVote` rows (see `get_group_results` / `get_cumulative_results`).

**Images: filesystem is the source of truth, DB mirrors it.** Files live on disk under `images/<folder>/<filename>`; each row in `Image` points at one. Key consequences when editing image code:
- On startup `init_db()` scans `images/` and inserts any folder/file not already in the DB. The admin "Sync Database" feature (`scan_filesystem_vs_database` / `apply_database_sync`) reconciles drift in both directions.
- A one-time migration (`migrate_to_default_folder`) moves loose images from `images/` root into a `default/` folder and **wipes all existing polls/sessions**; it self-skips once the `default` folder row exists.
- Uniqueness is `(folder, filename)` — the same filename can exist in different folders, so always look up images by folder + filename, never filename alone. `serve_image` resolves the folder from the DB.
- Uploads (file, drag, paste, or URL) run through `resize_image_if_needed` (Pillow, capped at `MAX_IMAGE_DIMENSION` = 1920px). AVIF support depends on the optional `pillow_avif` import.

**Real-time updates use Socket.IO rooms.** Two rooms: `poll` (MFK) and `smashpass`. Admin actions (start/next-group/end, new submission) call `socketio.emit(event, ..., room=...)`; clients re-fetch via REST on receiving the event. Events: `poll_started`, `group_changed`, `poll_ended`, `results_updated`, `smashpass_started`, `smashpass_completed`. There is no auth on socket events.

**DNS monkey-patch — do not remove or reorder.** The first ~42 lines of `app.py` run *before* any other import and patch `urllib3.util.connection.create_connection` to resolve hostnames using the stdlib socket captured before gevent/eventlet monkey-patches it. This exists because URL-based image downloads silently fail inside Docker under the async worker otherwise (the entire recent git history is fixing this). The app runs on **gevent** (`async_mode='gevent'`), not eventlet, for the same reason. `docker-compose.yml` also pins explicit DNS servers. If you touch import order, the download-from-URL feature breaks.

**Frontend is server-rendered templates + one vanilla-JS file per page.** `templates/*.html` extend `base.html`; each has a matching `static/js/*.js` (e.g. `admin.js`, `smashpass_admin.js`, `poll.js`, `vote.js`). No build tooling, no framework — edit the JS directly. Single shared `static/css/style.css`.

## Conventions specific to this codebase

- **Auth gating:** every admin/control route is decorated `@auth.login_required` (including the standalone `/smashpass/remote` Next/End remote-control page); public player routes (`/vote`, `/poll`, `/smashpass`, `/poll/submit`, `/smashpass/vote`, image serving) are intentionally open. Match this when adding routes — control endpoints get the decorator, player endpoints don't.
- **User identity:** call `get_or_create_user_id()` to read/issue the session `user_id`. Duplicate-vote prevention is a DB lookup on `(group_id/session_id, user_id)`, not a cookie flag.
- **The README is partially stale.** It documents MFK and Smash/Pass but predates the slideshow, the unified `/vote` page, and AVIF support. Trust the code over the prose docs (`README.md`, `NEW_FEATURES.md`, `AUTH.md`, `DEPLOYMENT_GUIDE.md`) when they disagree; update docs as part of any feature change.
- **Deployment target is Unraid/Docker** with `./images` and `./data` bind-mounted for persistence — never write app state outside those two dirs.
