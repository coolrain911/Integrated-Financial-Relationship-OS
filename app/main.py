import json
import re
import sqlite3
from datetime import date, datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

from . import db, seed

BASE_DIR = Path(__file__).resolve().parent.parent
STATIC_DIR = BASE_DIR / "static"
INDEX_HTML = STATIC_DIR / "index.html"

HOST = "127.0.0.1"
PORT = 8000

CLIENT_ID_RE = re.compile(r"^/api/clients/(\d+)$")
CONVERT_RE = re.compile(r"^/api/prospects/(\d+)/convert$")


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


def _last_name_sort_key(client: dict):
    # Names are stored "LastName FirstName [MiddleInitial]" (e.g. "Park Chul J"),
    # so the first token is the last name. Sort on that first, case-insensitively,
    # falling back to the full name to break ties.
    name = client["name"] or ""
    last_name = name.split(" ", 1)[0]
    return (last_name.lower(), name.lower())


def list_clients() -> list:
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM clients").fetchall()
    conn.close()
    today = datetime.now().date()
    clients = [client_to_dict(r, today) for r in rows]
    clients.sort(key=_last_name_sort_key)
    return clients


def update_client(client_id: int, body: dict):
    reviewed = body.get("reviewed")
    note = body.get("note")
    birthday_month = body.get("birthdayMonth")
    birthday_day = body.get("birthdayDay")

    if birthday_month is not None and not (isinstance(birthday_month, int) and 1 <= birthday_month <= 12):
        raise ValueError("birthdayMonth must be between 1 and 12")
    if birthday_day is not None and not (isinstance(birthday_day, int) and 1 <= birthday_day <= 31):
        raise ValueError("birthdayDay must be between 1 and 31")

    updates = []
    values = []
    if reviewed is not None:
        updates.append("reviewed = ?")
        values.append(1 if reviewed else 0)
    if note is not None:
        updates.append("note = ?")
        values.append(note)
    if "birthdayMonth" in body:
        updates.append("birthday_month = ?")
        values.append(birthday_month)
    if "birthdayDay" in body:
        updates.append("birthday_day = ?")
        values.append(birthday_day)

    conn = db.get_conn()
    if updates:
        values.append(client_id)
        conn.execute(f"UPDATE clients SET {', '.join(updates)} WHERE id = ?", values)
        conn.commit()

    row = conn.execute("SELECT * FROM clients WHERE id = ?", (client_id,)).fetchone()
    conn.close()
    if row is None:
        return None
    return client_to_dict(row, datetime.now().date())


def list_prospects() -> list:
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM prospects ORDER BY segment, name").fetchall()
    conn.close()
    return [prospect_to_dict(r) for r in rows]


def convert_prospect(prospect_id: int):
    conn = db.get_conn()
    prospect = conn.execute("SELECT * FROM prospects WHERE id = ?", (prospect_id,)).fetchone()
    if prospect is None:
        conn.close()
        return None

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


def list_columns() -> list:
    conn = db.get_conn()
    rows = conn.execute("SELECT * FROM columns_lib ORDER BY num").fetchall()
    conn.close()
    return [column_to_dict(r) for r in rows]


class Handler(BaseHTTPRequestHandler):
    server_version = "FinancialOS/1.0"

    def _send_json(self, status: int, payload) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_error_json(self, status: int, message: str) -> None:
        self._send_json(status, {"detail": message})

    def _read_json_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _serve_index(self) -> None:
        content = INDEX_HTML.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        try:
            if path == "/api/clients":
                return self._send_json(200, list_clients())
            if path == "/api/prospects":
                return self._send_json(200, list_prospects())
            if path == "/api/columns":
                return self._send_json(200, list_columns())
            if path.startswith("/api/"):
                return self._send_error_json(404, "not found")
            return self._serve_index()
        except Exception as exc:  # noqa: BLE001 - surface any handler bug as JSON, not a hang
            self._send_error_json(500, str(exc))

    def do_PATCH(self) -> None:
        path = urlparse(self.path).path
        match = CLIENT_ID_RE.match(path)
        if not match:
            return self._send_error_json(404, "not found")

        body = self._read_json_body()
        if body is None:
            return self._send_error_json(400, "invalid JSON body")

        try:
            updated = update_client(int(match.group(1)), body)
        except ValueError as exc:
            return self._send_error_json(400, str(exc))
        except Exception as exc:  # noqa: BLE001
            return self._send_error_json(500, str(exc))

        if updated is None:
            return self._send_error_json(404, "client not found")
        self._send_json(200, updated)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        match = CONVERT_RE.match(path)
        if not match:
            return self._send_error_json(404, "not found")

        try:
            created = convert_prospect(int(match.group(1)))
        except Exception as exc:  # noqa: BLE001
            return self._send_error_json(500, str(exc))

        if created is None:
            return self._send_error_json(404, "prospect not found")
        self._send_json(200, created)

    def log_message(self, format: str, *args) -> None:  # noqa: A002 - matches base signature
        print(f"{self.address_string()} - {format % args}")


def main() -> None:
    db.init_db()
    seed.seed_if_empty()
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"Serving on http://{HOST}:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
