# Repository Guidelines

This guide helps new agents contribute to the voter-turnout visualization without chasing rituals.

## Project Structure & Module Organization
`data/` contains sources:
- `data/electionproject/` raw CSVs from the United States Elections Project
- `data/census/` Census CPS A‑5 workbook(s); primary file is `a5a.xlsx`

`etl/` contains ETLs:
- `etl/normalize_turnout.py` → reads `data/electionproject/*` and writes `docs/data/election_turnout_electionproject.json`
- `etl/normalize_census_a5a.py` → reads `data/census/a5a.xlsx` and writes `docs/data/election_turnout_census.json`

`docs/` is the static D3.js site (`index.html`, `app.js`, `styles.css`, `data/`). The app expects the JSON files above in `docs/data/`. Documentation lives at the repo root (`README.md`, `DESIGN.md`).

## Build, Test, and Development Commands
Run `python -m venv .venv && source .venv/bin/activate` if you need isolation. Install ETL deps with `pip install -r requirements.txt`.

Generate datasets:
- Election Project → `python etl/normalize_turnout.py`
- Census (A‑5a) → `python etl/normalize_census_a5a.py`

Preview the site: `python -m http.server 8000 --directory docs` then open `http://localhost:8000`.
Notes:
- A global data source toggle (top‑right above the map) switches all maps between “Election Project” and “Census”.
- The year slider and labels are dynamic and currently include 1972, 1976, 1980 … 2024. Census data stops at 2020; selecting 2024 with Census selected yields no data for that year, which is expected.

## Coding Style & Naming Conventions
Use 4-space indentation for Python and keep docstrings descriptive. Favor explicit helper names and small pure functions near the top. In `docs/app.js`, keep to `const`/`let`, arrow functions, and snake-case CSS custom properties already in use (`--state-index`). The map rendering is encapsulated in a `MapView` class; add features by extending its config rather than global selectors. Keep filenames lowercase with underscores for Python and camelCase for JS identifiers. Run `ruff` or `flake8` locally if you introduce new Python modules.

## Testing Guidelines
Manual checks:
- Run both ETLs and confirm JSONs in `docs/data/` exist and contain sane values.
- Start the site and flip the global data toggle; verify the primary and summary maps update together.
- Move the year slider (keyboard and pointer) to test `1972`, `1976`, and `2024` edge years for each dataset.

If adding parsing logic, consider lightweight unit tests under `etl/tests/` via `pytest`. Keep outputs sorted to ensure diff-friendly JSON.

## Commit & Pull Request Guidelines
Commits follow the short, imperative style seen in `git log` (e.g., "Add hide legend toggle"). Keep PRs scoped: describe the intent, summarize data/visual checks performed, and link the relevant issue. Include before/after screenshots for UI updates and paste terminal output when regenerating data so reviewers see record counts and file paths.
