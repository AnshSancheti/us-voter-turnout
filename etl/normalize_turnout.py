#!/usr/bin/env python3
"""
ETL script to normalize voter turnout data from U.S. Elections Project.

Processes CSV files from different election years with varying formats into
a consistent JSON structure: year, state, turnout
"""

import csv
import json
import os
from pathlib import Path


def clean_percentage(value):
    """Convert percentage string to float (e.g., '54.2%' -> 54.2)"""
    if not value or value.strip() == '':
        return None
    # Remove % sign and convert to float
    return float(value.strip().replace('%', ''))


def process_2016_2020(file_path, year):
    """Process 2016 and 2020 election files (single year per file)"""
    records = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        # Skip first header row
        next(reader)
        # Read second header row to get column names
        headers = next(reader)

        # Find column indices
        state_idx = 0  # State is first column
        turnout_idx = None

        # Find VEP turnout column (different names in different years)
        possible_turnout_columns = [
            'VEP Highest Office',
            'VEP Turnout Rate (Highest Office)',
            'VEP Turnout Rate (highest office)',
            'VEP turnout rate (Highest Office)'
        ]
        for idx, header in enumerate(headers):
            if header in possible_turnout_columns:
                turnout_idx = idx
                break

        if turnout_idx is None:
            raise ValueError(f"Could not find VEP turnout column in {file_path}. Headers: {headers}")

        # Process data rows
        for row in reader:
            if len(row) <= max(state_idx, turnout_idx):
                continue

            state = row[state_idx].strip()
            turnout_raw = row[turnout_idx].strip()

            # Skip empty rows, "United States" aggregate, and note rows
            if not state or state == 'United States' or state.startswith('Note:') or state.startswith('*'):
                continue

            turnout = clean_percentage(turnout_raw)

            if turnout is not None:
                records.append({
                    'year': year,
                    'state': state,
                    'turnout': turnout
                })

    return records


def process_1980_2014(file_path):
    """Process 1980-2014 election file (multiple years in one file)"""
    records = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)

        # Skip first two header rows
        next(reader)
        headers = next(reader)

        # Find the column indices we need
        year_idx = 0
        state_idx = 3  # State column is 4th column (index 3)

        # Find "VEP Highest Office" column index
        turnout_idx = None
        for idx, header in enumerate(headers):
            if header == 'VEP Highest Office':
                turnout_idx = idx
                break

        if turnout_idx is None:
            raise ValueError("Could not find 'VEP Highest Office' column")

        for row in reader:
            if len(row) <= max(year_idx, state_idx, turnout_idx):
                continue

            year = row[year_idx].strip()
            state = row[state_idx].strip()
            turnout_raw = row[turnout_idx].strip()

            # Skip non-data rows and "United States" aggregate
            if not year or not year.isdigit() or state == 'United States':
                continue

            turnout = clean_percentage(turnout_raw)

            if turnout is not None:
                records.append({
                    'year': int(year),
                    'state': state,
                    'turnout': turnout
                })

    return records


def process_2024(file_path):
    """Process 2024 election file in the new U.S. Elections Project format.

    Expected columns include:
    - STATE: full state name
    - VEP_TURNOUT_RATE: percentage string like '63.60%'
    The file may contain a national aggregate row ('United States') which we skip.
    """
    records = []

    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)

        # Normalize column keys for robust access
        fieldnames = [name.strip() if name else '' for name in reader.fieldnames]
        # Build a mapping of lowercase -> original to avoid exact-case dependency
        key_map = { (name or '').strip().lower(): (name or '').strip() for name in fieldnames }

        state_key = key_map.get('state')
        # Prefer explicit VEP_TURNOUT_RATE, but allow a few variants
        vep_keys = [
            'vep_turnout_rate',
            'vep turnout rate',
            'vep turnout rate (highest office)'
        ]
        turnout_key = None
        for k in vep_keys:
            cand = key_map.get(k)
            if cand:
                turnout_key = cand
                break

        if not state_key or not turnout_key:
            raise ValueError(
                f"Could not find required columns in 2024 file. State: {state_key}, Turnout: {turnout_key}."
            )

        for row in reader:
            state = (row.get(state_key) or '').strip()
            if not state or state == 'United States':
                continue

            turnout_raw = (row.get(turnout_key) or '').strip()
            turnout = clean_percentage(turnout_raw)
            if turnout is None:
                continue

            records.append({
                'year': 2024,
                'state': state,
                'turnout': turnout
            })

    return records

def main():
    # Set up paths
    script_dir = Path(__file__).parent
    project_dir = script_dir.parent
    data_dir = project_dir / 'data'
    output_dir = project_dir / 'docs' / 'data'
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / 'election_turnout_normalized.json'

    all_records = []

    # Process 1980-2014 file
    file_1980_2014 = data_dir / '1980-2014 November General Election - Turnout Rates.csv'
    print(f"Processing {file_1980_2014.name}...")
    records_1980_2014 = process_1980_2014(file_1980_2014)
    all_records.extend(records_1980_2014)
    print(f"  Found {len(records_1980_2014)} records")

    # Process 2016 file
    file_2016 = data_dir / '2016 November General Election - Turnout Rates.csv'
    print(f"Processing {file_2016.name}...")
    records_2016 = process_2016_2020(file_2016, 2016)
    all_records.extend(records_2016)
    print(f"  Found {len(records_2016)} records")

    # Process 2020 file
    file_2020 = data_dir / '2020 November General Election - Turnout Rates.csv'
    print(f"Processing {file_2020.name}...")
    records_2020 = process_2016_2020(file_2020, 2020)
    all_records.extend(records_2020)
    print(f"  Found {len(records_2020)} records")

    # Process 2024 file(s) (supporting multiple naming schemes)
    file_2024_legacy = data_dir / '2024 November General Election - Turnout Rates.csv'
    file_2024_alt = None
    # Find any 2024-specific turnout CSVs (e.g., Turnout_2024G_v0.3.csv)
    for cand in sorted(data_dir.glob('*2024*.csv')):
        if 'Turnout' in cand.name or 'turnout' in cand.name:
            file_2024_alt = cand
            break

    if file_2024_alt and file_2024_alt.exists():
        print(f"Processing {file_2024_alt.name} (2024 alt format)...")
        records_2024 = process_2024(file_2024_alt)
        all_records.extend(records_2024)
        print(f"  Found {len(records_2024)} records")
    elif file_2024_legacy.exists():
        print(f"Processing {file_2024_legacy.name} (legacy format)...")
        records_2024 = process_2016_2020(file_2024_legacy, 2024)
        all_records.extend(records_2024)
        print(f"  Found {len(records_2024)} records")
    else:
        print("2024 file not found; skipping 2024.")

    # Sort by year, then state
    all_records.sort(key=lambda x: (x['year'], x['state']))

    # Write to JSON
    print(f"\nWriting {len(all_records)} total records to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_records, f, indent=2)

    print("Done!")

    # Show sample of data
    print("\nSample records:")
    for record in all_records[:5]:
        print(f"  {record['year']}, {record['state']}, {record['turnout']}%")
    print("  ...")
    for record in all_records[-5:]:
        print(f"  {record['year']}, {record['state']}, {record['turnout']}%")


if __name__ == '__main__':
    main()
