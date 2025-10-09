#!/usr/bin/env python3
# log_monitor.py
# Watch a log file for keywords and print alerts. Simple polling tail implementation.
# Usage: python log_monitor.py /path/to/log.txt keyword1 keyword2 --interval 1.5

import sys
import time
import argparse
from collections import deque
import os

def follow(path, interval=1.0):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        f.seek(0, os.SEEK_END)
        while True:
            line = f.readline()
            if line:
                yield line
            else:
                time.sleep(interval)

def main():
    parser = argparse.ArgumentParser(description="Follow a log file and alert on keywords.")
    parser.add_argument("logfile", help="Path to logfile")
    parser.add_argument("keywords", nargs='+', help="Keywords to alert on")
    parser.add_argument("--interval", type=float, default=1.0, help="Poll interval seconds")
    parser.add_argument("--context", type=int, default=2, help="Lines of context to show before match")
    args = parser.parse_args()

    if not os.path.exists(args.logfile):
        print("File not found:", args.logfile)
        sys.exit(1)

    print(f"Monitoring {args.logfile} for: {', '.join(args.keywords)}")
    tail = follow(args.logfile, interval=args.interval)
    buffer = deque(maxlen=args.context)
    try:
        for line in tail:
            line = line.rstrip('\n')
            buffer.append(line)
            lower = line.lower()
            for kw in args.keywords:
                if kw.lower() in lower:
                    print("="*40)
                    print(f"ALERT: found '{kw}' in: {line}")
                    print("Context:")
                    for ctx in buffer:
                        print("  ", ctx)
                    print("="*40)
    except KeyboardInterrupt:
        print("\nStopped.")
        sys.exit(0)

if __name__ == "__main__":
    main()
