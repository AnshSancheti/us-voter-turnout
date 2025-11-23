# Presidential Election Voter Turnout by State

A data visualization project tracking voter turnout percentages across all U.S. states for presidential elections.

## Project Overview

This project analyzes and visualizes historical voter turnout data from presidential elections, providing an interactive map-based interface to explore participation trends across states and election cycles.

## Data Source

Raw turnout data is sourced from the [United States Elections Project](http://www.electproject.org/), which provides comprehensive voter turnout statistics by state for presidential elections.

## Project Structure

```
voter-turnout/
├── data/           # Raw CSV files (not served)
├── etl/            # Python scripts for data cleaning and normalization
├── docs/           # Site root (used locally and for GitHub Pages)
│   └── data/       # Processed JSON for production
├── README.md       # Project documentation
└── requirements.txt # Python dependencies
```

## Workflow

1. **Data Collection**: Download raw turnout CSVs into `data/` directory
2. **ETL Processing**: Run Python scripts in `etl/` to clean and normalize data into JSON format
3. **Visualization**: Serve static files from `web/` to display interactive D3.js map

## Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Run ETL pipeline (writes web/data/election_turnout_normalized.json)
python etl/normalize_turnout.py

# Serve visualization locally
# Serve from /docs (mirrors GitHub Pages)
python -m http.server 8000 --directory docs

```

## Deploy (GitHub Pages)

1. In GitHub: Settings → Pages
2. Source: “Deploy from a branch”
3. Branch: `main`, Folder: `/docs`
4. Site URL: `https://<username>.github.io/voter-turnout/`

Notes
- The app uses relative paths (e.g., `data/election_turnout_normalized.json`) so it works under the `/voter-turnout/` subpath.
- ETL writes the processed JSON to `docs/data/` so it is immediately available to the served site.
```

## Technologies

- **Data Processing**: Python, pandas
- **Visualization**: D3.js, HTML5, CSS3
- **Data Format**: CSV (raw) → JSON (processed)
