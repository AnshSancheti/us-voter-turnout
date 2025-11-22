# Presidential Election Voter Turnout by State

A data visualization project tracking voter turnout percentages across all U.S. states for presidential elections.

## Project Overview

This project analyzes and visualizes historical voter turnout data from presidential elections, providing an interactive map-based interface to explore participation trends across states and election cycles.

## Data Source

Raw turnout data is sourced from the [United States Elections Project](http://www.electproject.org/), which provides comprehensive voter turnout statistics by state for presidential elections.

## Project Structure

```
voter-turnout/
├── data/           # Raw CSV files from U.S. Elections Project
├── etl/            # Python scripts for data cleaning and normalization
├── web/            # Static HTML/JavaScript/D3.js visualization frontend
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

# Run ETL pipeline
python etl/process_turnout.py

# Serve visualization locally
python -m http.server 8000 --directory web
```

## Technologies

- **Data Processing**: Python, pandas
- **Visualization**: D3.js, HTML5, CSS3
- **Data Format**: CSV (raw) → JSON (processed)
