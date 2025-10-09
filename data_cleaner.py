# data_cleaner.py
# Simple CSV data cleaner: normalizes headers, trims whitespace, fills missing values
# Usage: python data_cleaner.py source.csv cleaned.csv

import csv
import sys
import re
from collections import defaultdict

def normalize_header(h):
    h = h.strip().lower()
    h = re.sub(r'[^a-z0-9]+', '_', h)
    h = re.sub(r'_{2,}', '_', h).strip('_')
    return h or 'col'

def infer_type(samples):
    for s in samples:
        if s == '':
            continue
        try:
            int(s)
            return 'int'
        except:
            pass
        try:
            float(s)
            return 'float'
        except:
            pass
    return 'str'

def coerce(val, t):
    if val == '':
        return ''
    try:
        if t == 'int':
            return str(int(float(val)))
        if t == 'float':
            return str(float(val))
    except:
        return val
    return val

def clean_rows(rows, headers):
    samples = defaultdict(list)
    for r in rows:
        for i, h in enumerate(headers):
            v = r[i].strip() if i < len(r) else ''
            samples[h].append(v)

    types = {h: infer_type(samples[h]) for h in headers}
    cleaned = []
    for r in rows:
        out = []
        for i, h in enumerate(headers):
            v = r[i].strip() if i < len(r) else ''
            out.append(coerce(v, types[h]))
        cleaned.append(out)
    return headers, cleaned

def read_csv(path):
    with open(path, newline='', encoding='utf-8') as f:
        reader = csv.reader(f)
        rows = list(reader)
    if not rows:
        return [], []
    raw_headers = rows[0]
    headers = [normalize_header(h) for h in raw_headers]
    return headers, rows[1:]

def write_csv(path, headers, rows):
    with open(path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for r in rows:
            writer.writerow(r)

def main():
    if len(sys.argv) < 3:
        print("Usage: python data_cleaner.py source.csv cleaned.csv")
        sys.exit(1)
    src, out = sys.argv[1], sys.argv[2]
    headers, rows = read_csv(src)
    if not headers:
        print("Empty or invalid CSV")
        sys.exit(1)
    headers, cleaned = clean_rows(rows, headers)
    write_csv(out, headers, cleaned)
    print(f"Wrote cleaned CSV to {out}")

if __name__ == "__main__":
    main()
