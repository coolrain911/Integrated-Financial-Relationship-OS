import sqlite3
from datetime import date, datetime
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import db, seed

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="Financial Relationship OS")


@app.on_event("startup")
def on_startup():
    db.init_db()
    seed.seed_if_empty()


def _to_number_or_str(raw: Optional[str]):
    if raw is None:
        return None
    if raw == "na":
        return "na"
    try:
        return float(raw) if "." in raw else int(raw)
    except ValueError:
        return raw


def compute_anniversary(issue_date: Optional[str], today: date):
    if not issue_date:
        return None, None
    try:
        month, day = int(issue_date[5:7]), int(issue_date[8:10])
    except (ValueError, IndexError):
        return None, None

    try:
        anniv = today.replace(month=month, day=day)
    except ValueError:
        # Feb 29 in a non-leap year
        anniv = today.replace(month=2, day=28) if month == 2 else today

    if anniv < today:
        try:
            anniv = anniv.replace(year=today.year + 1)
        except ValueError:
            anniv = anniv.replace(month=2, day=28, year=today.year + 1)

    return anniv.isoformat(), (anniv - today).days


def client_to_dict(row: sqlite3.Row, today: date) -> dict:
    anniv, days_to_anniv = compute_anniversary(row["issue_date"], today)
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "note": row["note"],
        "age": row["age"],
        "policy": row["policy"],
        "issueDate": row["issue_date"],
        "anniv": anniv,
        "daysToAnniv": days_to_anniv,
        "carrier": row["carrier"],
        "product": row["product"],
        "faceAmount": _to_number_or_str(row["face_amount"]),
        "premium": _to_number_or_str(row["premium"]),
        "av": _to_number_or_str(row["av"]),
        # needsReview/reviewReason are preserved as computed at seed time.
        # Recomputing them requires the raw design-projection/loan-flag inputs,
        # which are not part of the current data source.
        "needsReview": bool(row["needs_review"]),
        "reviewReason": row["review_reason"],
        "comment": row["comment"],
        "reviewed": bool(row["reviewed"]),
        "birthdayMonth": row["birthday_month"],
        "birthdayDay": row["birthday_day"],
    }


def prospect_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "phone": row["phone"],
        "segment": row["segment"],
        "note": row["note"],
    }


def column_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "num": row["num"],
        "title": row["title"],
        "category": row["category"],
        "file": row["file"],
    }


@app.get("/api/clients")
def list_clients():
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM clients ORDER BY name").fetchall()
    conn.close()
    today = datetime.now().date()
    return [client_to_dict(r, today) for r in rows]


class ClientUpdate(BaseModel):
    reviewed: Optional[bool] = None
    note: Optional[str] = None
    birthdayMonth: Optional[int] = None
    birthdayDay: Optional[int] = None


@app.patch("/api/clients/{client_id}")
def update_client(client_id: int, body: ClientUpdate):
    if body.birthdayMonth is not None and not (1 <= body.birthdayMonth <= 12):
        raise HTTPException(400, "birthdayMonth must be between 1 and 12")
    if body.birthdayDay is not None and not (1 <= body.birthdayDay <= 31):
        raise HTTPException(400, "birthdayDay must be between 1 and 31")

    fields_set = body.model_fields_set
    updates: list[str] = []
    values: list = []

    if body.reviewed is not None:
        updates.append("reviewed = ?")
        values.append(1 if body.reviewed else 0)
    if body.note is not None:
        updates.append("note = ?")
        values.append(body.note)
    if "birthdayMonth" in fields_set:
        updates.append("birthday_month = ?")
        values.append(body.birthdayMonth)
    if "birthdayDay" in fields_set:
        updates.append("birthday_day = ?")
        values.append(body.birthdayDay)

    conn = db.get_conn()
    if updates:
        values.append(client_id)
        conn.execute(f"UPDATE clients SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    conn.close()
    if row is None:
        raise HTTPException(404, "client not found")
    return client_to_dict(row, datetime.now().date())


@app.get("/api/prospects")
def list_prospects():
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM prospects ORDER BY segment, name").fetchall()
    conn.close()
    return [prospect_to_dict(r) for r in rows]


@app.post("/api/prospects/{prospect_id}/convert")
def convert_prospect(prospect_id: int):
    conn = db.get_conn()
    prospect = conn.execute("SELECT * FROM prospects WHERE id = ?", (prospect_id,)).fetchone()
    if prospect is None:
        conn.close()
        raise HTTPException(404, "prospect not found")

    cur = conn.execute(
        "INSERT INTO clients (name, email, phone, note) VALUES (?, ?, ?, ?)",
        (prospect["name"], prospect["email"], prospect["phone"], prospect["note"]),
    )
    new_id = cur.lastrowid
    conn.execute("DELETE FROM prospects WHERE id = ?", (prospect_id,))
    conn.commit()

    row = conn.execute("SELECT * FROM clients WHERE id = ?", (new_id,)).fetchone()
    conn.close()
    return client_to_dict(row, datetime.now().date())


@app.get("/api/columns")
def list_columns():
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM columns_lib ORDER BY num").fetchall()
    conn.close()
    return [column_to_dict(r) for r in rows]


app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
