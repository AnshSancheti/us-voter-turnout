#!/usr/bin/env python3
"""
Normalize Census a5b.xlsx into the same JSON shape used by the site:
  [{ "year": 2024, "state": "Alabama", "turnout": 58.9 }, ...]

Notes
- The a5b workbook may use a different layout than the Election Project CSVs.
- This script attempts to discover year, state, and turnout columns using
  case-insensitive header matching and basic heuristics.
- Output overwrites docs/data/election_turnout_normalized.json by default.

Usage
  python etl/normalize_census_a5b.py \
    --input data/census/a5b.xlsx \
    --output docs/data/election_turnout_normalized.json
"""

from pathlib import Path
import argparse
import json
import math
import re

try:
    import pandas as pd  # type: ignore
except Exception as e:  # pragma: no cover
    raise SystemExit(
        "pandas is required for reading Excel. Please install dependencies:\n"
        "  pip install -r requirements.txt\n"
        f"Import error: {e}"
    )


def clean_percentage_like(value):
    """Convert values like '63.6%', '63.6', 63.6 to float or None."""
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    if not s:
        return None
    s = s.replace('%', '').replace(',', '').strip()
    try:
        return float(s)
    except ValueError:
        return None


def pick_column(columns, candidates):
    """Return the first column from columns that matches any candidate (case-insensitive)."""
    lower = {c.lower(): c for c in columns}
    for cand in candidates:
        if cand.lower() in lower:
            return lower[cand.lower()]
    # fuzzy contains match as fallback
    for c in columns:
        cl = c.lower()
        if any(tok in cl for tok in candidates):
            return c
    return None


def normalize_a5b(input_path: Path):
    """Parse the a5b.xlsx wide table (registration rates by year, total/citizen columns).

    We detect the header row that contains 'State' in column 0 and 4-digit years across
    columns, with the following row giving 'Total'/'Citizen' subheaders. We prefer the
    'Total' column when present.
    """
    df = pd.read_excel(input_path, sheet_name=0, header=None)
    df = df.dropna(how='all')  # drop fully empty rows
    df = df.dropna(axis=1, how='all')  # drop fully empty cols

    # Find the header row containing 'State'
    header_row = None
    for i in range(min(20, len(df))):  # search in the top 20 rows
        v = str(df.iat[i, 0]).strip()
        if v.lower() == 'state':
            header_row = i
            break
    if header_row is None:
        raise ValueError('Could not locate header row with "State" in column A')

    # Build year -> (total_col_index, citizen_col_index) mapping
    year_map = {}
    for j in range(1, df.shape[1]):
        cell = str(df.iat[header_row, j]).strip()
        if re.fullmatch(r'(19|20)\d{2}', cell):
            year = int(cell)
            # Next row is expected to have subheaders Total/Citizen in j and j+1
            sub_total = str(df.iat[header_row + 1, j]).strip() if j < df.shape[1] else ''
            sub_cit = str(df.iat[header_row + 1, j + 1]).strip() if (j + 1) < df.shape[1] else ''
            total_idx = j if sub_total.lower().startswith('total') else None
            citizen_idx = (j + 1) if sub_cit.lower().startswith('citizen') else None
            # Sometimes order may be reversed; try swap
            if total_idx is None and sub_total.lower().startswith('citizen'):
                citizen_idx = j
            if citizen_idx is None and sub_cit.lower().startswith('total'):
                total_idx = j + 1
            year_map[year] = (total_idx, citizen_idx)

    if not year_map:
        raise ValueError('Failed to detect year columns in a5b.xlsx')

    # Data rows start two rows after header_row
    records = []
    for i in range(header_row + 2, len(df)):
        state = str(df.iat[i, 0]).strip()
        if not state or state == 'nan' or state.lower() == 'united states':
            continue

        for year, (total_idx, citizen_idx) in year_map.items():
            col_idx = total_idx if total_idx is not None else citizen_idx
            if col_idx is None or col_idx >= df.shape[1]:
                continue
            val = df.iat[i, col_idx]
            turnout = clean_percentage_like(val)
            if turnout is None:
                continue
            records.append({'year': year, 'state': state, 'turnout': turnout})

    records.sort(key=lambda r: (r['year'], r['state']))
    return records


def main():
    parser = argparse.ArgumentParser(description='Normalize Census a5b.xlsx to site JSON format.')
    parser.add_argument('--input', type=Path, default=Path('data/census/a5b.xlsx'))
    parser.add_argument('--output', type=Path, default=Path('docs/data/election_turnout_census.json'))
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f"Reading {input_path}...")
    records = normalize_a5b(input_path)
    print(f"  Normalized {len(records)} records")

    print(f"Writing {output_path}...")
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)
    print("Done.")


if __name__ == '__main__':
    main()
