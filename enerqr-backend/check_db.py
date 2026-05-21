import sqlite3
c = sqlite3.connect('enerqr_v3.db')
print(c.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='scan_logs';").fetchone()[0])
