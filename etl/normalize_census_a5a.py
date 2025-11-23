#!/usr/bin/env python3
"""
Normalize Census a5a.xlsx (A5_Vote) into JSON records used by the site:
  [{ "year": 2020, "state": "Alabama", "turnout": 60.5 }, ...]

Characteristics of a5a.xlsx:
- One sheet (A5_Vote) with multiple tables/blocks on the same sheet.
- Each block has a header row of 4-digit years (e.g., 2020, 2016, 2012, ...)
  followed by a subheader row with 'Total' and 'Citizen'.
- Data rows start two rows below the header and continue until the next block.
- We prefer 'Citizen' percentages when available; otherwise we use 'Total'.
- Coverage spans 1972–2020 (no 2024 in this file).

Output (default): docs/data/election_turnout_census.json (overwrites)
"""

from pathlib import Path
import argparse
import json
import math
import re

import pandas as pd  # type: ignore


def clean_percentage_like(value):
    """Convert values like '63.6%', '63.6', 63.6 to float or None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and math.isnan(value):
            return None
        return float(value)
    s = str(value).strip()
    if not s or s.lower() == 'nan':
        return None
    s = s.replace('%', '').replace(',', '').strip()
    try:
        return float(s)
    except ValueError:
        return None


def is_year_str(s: str):
    s = s.strip()
    if len(s) == 4 and s.isdigit():
        y = int(s)
        if 1900 <= y <= 2100:
            return y
    return None


def find_header_blocks(df: pd.DataFrame):
    """Yield (header_row_index, year_to_cols) for each detected header block.

    year_to_cols: dict[int, tuple[int|None, int|None]] mapping year -> (total_col, citizen_col)
    """
    n_rows, n_cols = df.shape
    blocks = []

    i = 0
    while i < n_rows - 1:
        # Identify candidate year row: contains several 4-digit year tokens across columns
        years_in_row = []
        for j in range(1, n_cols):
            cell = str(df.iat[i, j]).strip()
            y = is_year_str(cell)
            if y is not None:
                years_in_row.append((j, y))

        # Heuristic: treat as a header row if we found at least 3 year tokens
        if len(years_in_row) >= 3:
            # Look at supposed subheader row (i+1)
            sub_r = i + 1
            if sub_r < n_rows:
                year_map = {}
                for j, y in years_in_row:
                    # Examine subheaders in j and j+1
                    sub_j = str(df.iat[sub_r, j]).strip().lower() if j < n_cols else ''
                    sub_j1 = str(df.iat[sub_r, j + 1]).strip().lower() if (j + 1) < n_cols else ''
                    total_idx = None
                    citizen_idx = None
                    if sub_j.startswith('total'):
                        total_idx = j
                    if sub_j.startswith('citizen'):
                        citizen_idx = j
                    if sub_j1.startswith('total'):
                        total_idx = j + 1 if total_idx is None else total_idx
                    if sub_j1.startswith('citizen'):
                        citizen_idx = j + 1 if citizen_idx is None else citizen_idx

                    # Accept mapping even if only one of them is present
                    year_map[y] = (total_idx, citizen_idx)

                if year_map:
                    blocks.append((i, year_map))
                    # Skip past this header (year row + subheader row)
                    i = sub_r + 1
                    continue
        i += 1

    return blocks


def parse_block(df: pd.DataFrame, header_row: int, year_map: dict):
    """Parse data rows for a given block and return normalized records."""
    n_rows, n_cols = df.shape
    # Data rows start two rows after header row (header_row + 2)
    start_r = header_row + 2
    # End at the next header or end of sheet; a conservative approach:
    # stop at the next row that appears to be a header (has >=3 year tokens),
    # or if the first column contains another header/caption.
    # We'll simply parse until we hit a row whose col0 is empty and has year tokens,
    # which our outer loop used to detect headers.

    records = []
    r = start_r
    while r < n_rows:
        # If we detect a new header here, break (defensive)
        years_here = 0
        for j in range(1, n_cols):
            if is_year_str(str(df.iat[r, j])) is not None:
                years_here += 1
        if years_here >= 3:
            break

        state_raw = df.iat[r, 0]
        state = str(state_raw).strip() if state_raw is not None else ''

        # Termination: blank separator blocks
        if not state or state.lower().startswith('table') or state.lower() == 'nan':
            r += 1
            continue

        if state.lower() == 'united states':
            r += 1
            continue

        # Extract values per year; prefer citizen where available
        for year, (total_idx, citizen_idx) in year_map.items():
            col_idx = citizen_idx if citizen_idx is not None else total_idx
            if col_idx is None or col_idx >= n_cols:
                continue
            value = df.iat[r, col_idx]
            turnout = clean_percentage_like(value)
            if turnout is None:
                continue
            records.append({
                'year': int(year),
                'state': state,
                'turnout': turnout
            })

        r += 1

    return records


def normalize_a5a(input_path: Path):
    df = pd.read_excel(input_path, sheet_name=0, header=None)
    # Drop fully empty rows/cols for robustness
    df = df.dropna(how='all')
    df = df.dropna(axis=1, how='all')

    blocks = find_header_blocks(df)
    if not blocks:
        raise ValueError('Could not detect any header blocks in a5a.xlsx')

    all_records = []
    for header_row, year_map in blocks:
        block_recs = parse_block(df, header_row, year_map)
        all_records.extend(block_recs)

    # Sort for stability
    all_records.sort(key=lambda r: (r['year'], r['state']))
    return all_records


def main():
    parser = argparse.ArgumentParser(description='Normalize Census a5a.xlsx to site JSON format.')
    parser.add_argument('--input', type=Path, default=Path('data/census/a5a.xlsx'))
    parser.add_argument('--output', type=Path, default=Path('docs/data/election_turnout_census.json'))
    args = parser.parse_args()

    input_path = args.input
    output_path = args.output
    output_path.parent.mkdir(parents=True, exist_ok=True)

    print(f'Reading {input_path}...')
    records = normalize_a5a(input_path)
    print(f'  Normalized {len(records)} records')

    print(f'Writing {output_path}...')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(records, f, indent=2)
    print('Done.')


if __name__ == '__main__':
    main()

