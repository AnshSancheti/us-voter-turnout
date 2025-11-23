# Presidential Election Voter Turnout by State

A data visualization project tracking voter turnout percentages across all U.S. states for presidential elections.

## Project Overview

This project analyzes and visualizes historical voter turnout data from presidential elections, providing an interactive map-based interface to explore participation trends across states and election cycles.

## Data Sources

- [United States Elections Project](http://www.electproject.org/): state-level Voting-Eligible Population (VEP) turnout for presidential elections.
- [U.S. Census Bureau tables](https://www.census.gov/data/tables/time-series/demo/voting-and-registration/voting-historical-time-series.html): reported voting/registration percentages for total and citizen voting-age population.

## Project Structure

```
voter-turnout/
├── data/           # Raw CSV files (not served)
├── etl/            # Python scripts for data cleaning and normalization
├── docs/           # Site root (static frontend used locally or for any static host)
│   └── data/       # Processed JSON for production
├── README.md       # Project documentation
└── requirements.txt # Python dependencies
```

## Workflow

1. **Data Collection**: Download raw turnout CSVs into `data/electionproject/` and Census sheets into `data/census/`
2. **ETL Processing**: Run Python scripts in `etl/` to clean and normalize data into JSON format (written to `docs/data/`)
3. **Visualization**: Serve static files from `docs/` to display the interactive D3.js map

## Setup

```bash
# Install Python dependencies
pip install -r requirements.txt

# Election Project ETL (reads data/electionproject, writes docs/data/election_turnout_electionproject.json)
python etl/normalize_turnout.py

# Census ETL (reads data/census/a5a.xlsx, writes docs/data/election_turnout_census.json)
python etl/normalize_census_a5a.py

# Serve visualization locally (from /docs)
python -m http.server 8000 --directory docs
```

## Technologies

- **Data Processing**: Python, pandas
- **Visualization**: D3.js, HTML5, CSS3
- **Data Format**: CSV (raw) → JSON (processed)
