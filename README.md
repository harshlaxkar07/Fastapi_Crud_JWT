# FastAPI User CRUD with JWT

A complete user management API — sign up, sign in, and full create/read/update/delete over the user directory, with bcrypt password hashing and signed JSON Web Tokens guarding every protected route.

Ships with **Identity Console**, a web interface served by the API itself.

---

## Highlights

| | |
|---|---|
| **bcrypt hashing** | Passwords are hashed with passlib before they reach the database |
| **Signed JWTs** | Tokens carry the subject and an expiry, signed with a configurable algorithm |
| **Guarded routes** | Every route except sign-up and sign-in requires a valid bearer token |
| **Validated input** | Pydantic enforces length bounds and a real email shape on every field |
| **Transactional writes** | Each write commits or rolls back as a unit, and the connection is always closed |
| **Identity Console** | Sign in, browse the directory, edit records and inspect your own token at `/` |

---

## Identity Console

The API serves its own front end — start the server and open the root URL.

**Sign in / Create account** — a split-screen entry point. Signing up validates every field against the API's own rules and signs you straight in. The password field shows live strength feedback as you type.

**Users** — the full directory with headline counts, a live filter, and inline edit and delete. Every request carries your bearer token automatically.

**My Account** — the identity your token is carrying, and the change-password form. Your current password is verified before the new one is stored.

**Access Token** — the raw JWT, its decoded payload with syntax highlighting, and a validity meter counting down the minutes left before it expires.

---

## Tech stack

**API** FastAPI · Uvicorn · Pydantic v2
**Auth** python-jose (JWT) · passlib with bcrypt
**Database** MySQL via PyMySQL
**Front end** Vanilla HTML, CSS and JavaScript — no build step

---

## Getting started

### Prerequisites

- Python 3.10 or newer
- MySQL 8

### 1. Install

```bash
git clone https://github.com/harshlaxkar07/Fastapi_Crud_JWT.git
cd Fastapi_Crud_JWT
python -m venv .venv && source .venv/bin/activate
pip install -r app/req.txt
```

### 2. Create the table

```sql
CREATE DATABASE IF NOT EXISTS user_crud;
USE user_crud;

CREATE TABLE IF NOT EXISTS users (
    user_id      INT AUTO_INCREMENT PRIMARY KEY,
    username     VARCHAR(30)  NOT NULL UNIQUE,
    fullname     VARCHAR(100) NOT NULL,
    email        VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(15)  NOT NULL,
    password     VARCHAR(255) NOT NULL
);
```

### 3. Configure

Create `app/.env`:

```ini
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=user_crud

SECRET_KEY=replace-with-a-long-random-string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

Generate a key with:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 4. Run

```bash
cd app
uvicorn main:app --reload
```

| URL | What it is |
|---|---|
| `http://localhost:8000/` | Identity Console |
| `http://localhost:8000/docs` | Interactive OpenAPI documentation |

---

## API reference

### Open routes

| Method | Path | Body | Returns |
|---|---|---|---|
| `POST` | `/signup` | `username`, `fullname`, `email`, `phone_number`, `password` | The new user id |
| `POST` | `/login` | `username`, `password` | `{ "access_token": "...", "token_type": "bearer" }` |

### Protected routes

All of these expect an `Authorization: Bearer <token>` header.

| Method | Path | What it does |
|---|---|---|
| `GET` | `/users` | Every user in the directory |
| `GET` | `/users/{user_id}` | One user by id |
| `POST` | `/users/{user_id}` | Update a user's details |
| `DELETE` | `/users/{user_id}` | Remove one user |
| `DELETE` | `/users` | Empty the directory |
| `POST` | `/password` | Change your own password |
| `POST` | `/logout` | Confirms the client should drop its token |

### Example

```bash
# Create an account
curl -X POST http://localhost:8000/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"harsh","fullname":"Harsh Laxkar","email":"harsh@example.com","phone_number":"9876543210","password":"a-strong-password"}'

# Sign in
TOKEN=$(curl -s -X POST http://localhost:8000/login \
  -H "Content-Type: application/json" \
  -d '{"username":"harsh","password":"a-strong-password"}' | python -c "import sys,json;print(json.load(sys.stdin)['access_token'])")

# Use it
curl http://localhost:8000/users -H "Authorization: Bearer $TOKEN"
```

---

## Validation rules

| Field | Rule |
|---|---|
| `username` | 3 to 30 characters |
| `fullname` | 3 to 100 characters |
| `email` | Validated as a real email address |
| `phone_number` | 10 to 15 characters |
| `password` | 8 to 100 characters on sign-up |

---

## Project structure

```
Fastapi_Crud_JWT/
├── app/
│   ├── main.py       FastAPI application, routes, CORS and the static mount
│   ├── auth.py       Password hashing, token creation and the bearer dependency
│   ├── crud.py       Database operations
│   ├── database.py   Connection handling
│   ├── schemas.py    Pydantic request and response models
│   ├── config.py     Settings loaded from .env
│   └── req.txt       Dependencies
└── frontend/         Identity Console
```
