import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent.parent / "financial_os.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            age INTEGER,
            policy TEXT,
            issue_date TEXT,
            carrier TEXT,
            product TEXT,
            face_amount TEXT,
            premium TEXT,
            av TEXT,
            needs_review INTEGER NOT NULL DEFAULT 0,
            review_reason TEXT,
            comment TEXT,
            note TEXT,
            reviewed INTEGER NOT NULL DEFAULT 0,
            birthday_month INTEGER,
            birthday_day INTEGER
        );

        CREATE TABLE IF NOT EXISTS prospects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT,
            phone TEXT,
            segment TEXT,
            note TEXT
        );

        CREATE TABLE IF NOT EXISTS columns_lib (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            num REAL,
            title TEXT,
            category TEXT,
            file TEXT
        );
        """
    )
    conn.commit()
    conn.close()
