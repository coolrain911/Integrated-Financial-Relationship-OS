import json
from pathlib import Path

from . import db

DATA_PATH = Path(__file__).resolve().parent / "data" / "full_data.json"


def _text_or_none(value):
    return None if value is None else str(value)


def seed_if_empty():
    conn = db.get_conn()
    count = conn.execute("SELECT COUNT(*) FROM clients").fetchone()[0]
    if count > 0:
        conn.close()
        return

    with open(DATA_PATH, encoding="utf-8") as f:
        data = json.load(f)

    for c in data.get("clients", []):
        issue_date = (c.get("issueDate") or "")[:10] or None
        conn.execute(
            """
            INSERT INTO clients
                (name, email, phone, age, policy, issue_date, carrier, product,
                 face_amount, premium, av, needs_review, review_reason, comment, note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                c.get("name"),
                c.get("email"),
                c.get("phone"),
                c.get("age"),
                _text_or_none(c.get("policy")),
                issue_date,
                c.get("carrier"),
                c.get("product"),
                _text_or_none(c.get("faceAmount")),
                _text_or_none(c.get("premium")),
                _text_or_none(c.get("av")),
                1 if c.get("needsReview") else 0,
                c.get("reviewReason"),
                c.get("comment"),
                c.get("note"),
            ),
        )

    for p in data.get("prospects", []):
        conn.execute(
            "INSERT INTO prospects (name, email, phone, segment, note) VALUES (?, ?, ?, ?, ?)",
            (p.get("name"), p.get("email"), p.get("phone"), p.get("segment"), p.get("note")),
        )

    for col in data.get("columns", []):
        conn.execute(
            "INSERT INTO columns_lib (num, title, category, file) VALUES (?, ?, ?, ?)",
            (col.get("num"), col.get("title"), col.get("category"), col.get("file")),
        )

    conn.commit()
    conn.close()
