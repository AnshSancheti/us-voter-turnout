# Repository Guidelines

This guide helps new agents contribute to the voter-turnout visualization without chasing rituals.

## Project Structure & Module Organization
`data/` holds the raw CSV turnout exports. `etl/normalize_turnout.py` is the single ETL entry point; it reads all CSVs and writes the processed `election_turnout_normalized.json` into `docs/data/`, which the site consumes. The `docs/` folder is the static D3.js site (`index.html`, `app.js`, `styles.css`) used locally and by GitHub Pages. Documentation and sketches live at the repo root (`README.md`, `DESIGN.md`).

## Build, Test, and Development Commands
Run `python -m venv .venv && source .venv/bin/activate` if you need isolation. Install ETL deps with `pip install -r requirements.txt`. Regenerate normalized data via `python etl/normalize_turnout.py`, which prints record counts for a quick sanity check. Preview the site using `python -m http.server 8000 --directory docs` and open `http://localhost:8000`. When iterating on D3 logic, keep devtools open to watch for console errors.

## Coding Style & Naming Conventions
Use 4-space indentation for Python and keep docstrings descriptive, mirroring `normalize_turnout.py`. Favor explicit helper names such as `process_2016_2020` and keep pure functions near the top. In `docs/app.js`, stick with `const`/`let`, arrow functions, and snake-case CSS custom properties that are already in use (`--state-index`). Keep filenames lowercase with underscores for Python and camelCase for JS identifiers. Run `ruff` or `flake8` locally if you introduce new Python modules.

## Testing Guidelines
The project currently relies on manual verification. When touching ETL logic, add lightweight unit tests under `etl/tests/` using `pytest` (create the folder if absent) and mock CSV rows to cover parsing edge cases. For the frontend, exercise the timeline, zoom, and toggles after each change and capture screenshots that show interactive states. Aim to keep processed JSON diff-friendly by sorting keys exactly as the script does.

## Commit & Pull Request Guidelines
Commits follow the short, imperative style seen in `git log` (e.g., "Add hide legend toggle"). Keep PRs scoped: describe the intent, summarize data/visual checks performed, and link the relevant issue. Include before/after screenshots for UI updates and paste terminal output when regenerating data so reviewers see record counts and file paths.
