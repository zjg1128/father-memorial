CREATE TABLE IF NOT EXISTS candles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_candles_created_at
    ON candles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_candles_ip_hash_created_at
    ON candles(ip_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    approved INTEGER NOT NULL DEFAULT 1,
    ip_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_comments_created_at
    ON comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_approved_created_at
    ON comments(approved, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_ip_hash_created_at
    ON comments(ip_hash, created_at DESC);
