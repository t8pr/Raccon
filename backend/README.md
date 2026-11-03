# Raccon Backend

FastAPI service behind **Raccon**, an NFC treasure-hunt kit. It handles accounts, the factory side of packs and tags, claiming a pack, building an event out of its tags, and the live game where players scan tags.

> **Stack:** Python 3.12 · FastAPI · SQLModel (SQLAlchemy 2 + Pydantic 2) · PostgreSQL on Supabase · Alembic · JWT (PyJWT) · bcrypt · Resend (email) · Axiom (logs) · Docker

**Contents**

1. [System overview & architecture](#1-system-overview--architecture)
2. [Directory & file structure](#2-directory--file-structure)
3. [Frontend ↔ backend connection](#3-frontend--backend-connection--workflow)
4. [API reference & frontend integration guide](#4-api-reference--frontend-integration-guide)
5. [Local setup & contribution guide](#5-local-setup--contribution-guide)
6. [Known gaps & gotchas](#6-known-gaps--gotchas)

---

## 1. System overview & architecture

### 1.1 The domain in one minute

| Concept | Table | Meaning |
|---|---|---|
| **User** | `users` | An account. `role` is `"user"` (default) or `"admin"`. Each user has a short public `user_hash` (8 chars), which is injected into scan links. |
| **Pack** | `packs` | One physical kit. `mode` is `"open"` (free hunt) or `"seq"` (sequential). `tags_count` is the number of NFC pieces. `master_auth_hash` is the secret behind the **claim link**. `owner_id` stays empty until someone claims the pack. |
| **Tag** | `tags` | One physical NFC piece inside a pack. `static_hash` (6 chars) is what's written on the chip, `sequence_num` is its order (1…n), and `is_printed` is a factory flag. |
| **Event** | `events` | The game the owner builds on a pack. Created automatically on claim. `status` is `draft` → `live` / `paused`. `edit_count` is limited by `MAX_EDIT_LIMIT`. |
| **EventTag** | `event_tags` | The owner's configuration of one tag inside an event. `tag_type` is `clue` or `trap`, and `content` (JSONB) holds the hint, image, trap values and `claimed_by`. |
| **JourneyProgress** | `journey_progress` | One player's progress in one event: `score`, `current_sequence`, `visited_sequences`, `status` (`active` / `completed`) and `frozen_until`. |

**Lifecycle:**

```
Admin generates packs ──► Factory prints/programs tags ──► Customer claims pack (master link)
        │                                                         │
        ▼                                                         ▼
  packs + tags rows                                    Event auto-created (draft)
                                                                  │
                         Owner configures tags (setup) ──► set status "live"
                                                                  │
          Player taps NFC ──► GET /t/{tag_hash} ──► frontend /scan ──► POST /journey/scan
```

### 1.2 Architectural pattern: layered architecture (router → service → repository → model)

```
HTTP request
   │
   ▼
main.py ─ FastAPI app, CORS, routers, pagination, lifespan(init_db)
   │
   ▼
api/<feature>/router.py      ← HTTP only: path, method, auth dependency, request/response schemas
   │   uses api/<feature>/schemas.py (Pydantic: validation and response shape)
   ▼
services/<feature>_service.py ← business rules, permission checks, HTTPException, session.commit()
   │
   ▼
repositories/<entity>_repo.py ← DB queries only (select/get/add/delete), never commits
   │
   ▼
models/<entity>.py            ← SQLModel tables (single source of truth for the DB schema)
   │
   ▼
core/database.py (engine + session)  ──►  PostgreSQL (Supabase)
```

**Rules each layer follows:**

- **Routers** don't touch the database. They receive a service through `Depends()` and the current user through `get_current_user` or `get_current_admin`.
- **Services** own the transaction. Each service gets one `Session` from `get_session`, builds the repositories it needs with that same session, and calls `session.commit()` once at the end of a use case.
- **Repositories** only read, or call `session.add()` / `session.delete()`. They never commit, so a service can combine several writes into one transaction (for example, claiming a pack updates the pack and creates an event in one commit).
- **Schemas** (`api/*/schemas.py`) are separate from **models**. That lets the API hide fields such as `password` and `master_auth_hash`, and validate input before it reaches a service.

### 1.3 Request lifecycle (example: `GET /users/me`)

1. Uvicorn receives the request. `CORSMiddleware` checks the `Origin`.
2. FastAPI matches `api/users/router.py → get_profile`.
3. It resolves the dependencies:
   - `get_current_user` (`api/auth/dependencies.py`) reads `Authorization: Bearer <jwt>` with `OAuth2PasswordBearer`, decodes the token with `SECRET_KEY`/HS256, checks `purpose == "access"`, and loads the user with `UserRepository.get_by_id`. If any step fails, it returns `401`.
   - `UserService()` is built, and its `__init__` asks for `Session = Depends(get_session)`.
4. `UserService.get_profile` calls `UserRepository.get_by_id`, which calls `session.get(User, id)`.
5. FastAPI filters the returned `User` through `response_model=UserResponse`, so the password is never sent.
6. The `with Session(engine)` block in `get_session` closes the session.

### 1.4 Startup

`main.py` uses a `lifespan` context:

- On startup, `init_db()` imports `models` so every table is registered on `SQLModel.metadata`.
- On shutdown, it stops the Axiom log `listener` if one exists.

**Tables are not created at startup.** The schema is managed only by **Alembic migrations** (see §5.3).

---

## 2. Directory & file structure

```
backend/
├── main.py                     # App entry point
├── Dockerfile                  # python:3.12-slim + uvicorn --reload
├── requirements.txt            # Python dependencies
├── alembic.ini                 # Alembic config (URL is overridden in env.py)
├── .env                        # NOT committed – secrets (see §3.3)
├── .gitignore / .dockerignore
│
├── core/                       # Cross-cutting infrastructure
│   ├── config.py               # Settings loaded from .env
│   ├── database.py             # SQLAlchemy engine + session dependency
│   ├── security.py             # bcrypt hashing + JWT creation/decoding
│   ├── email.py                # Password-reset email via Resend
│   └── logger.py               # "raccon" logger → Axiom or console
│
├── models/                     # SQLModel tables (DB schema)
│   ├── __init__.py             # Imports every model (needed by Alembic & init_db)
│   ├── user.py  pack.py  tag.py  event.py  event_tag.py  journey_progress.py
│
├── repositories/               # Data access layer (queries only, no commits)
│   ├── user_repo.py  pack_repo.py  tag_repo.py
│   ├── event_repo.py  event_tag_repo.py  journey_progress_repo.py
│
├── services/                   # Business logic layer
│   ├── auth_service.py  user_service.py  admin_service.py
│   ├── pack_service.py  event_service.py  journey_service.py
│
├── api/                        # HTTP layer, one folder per feature
│   ├── auth/      router.py  schemas.py  dependencies.py
│   ├── users/     router.py  schemas.py
│   ├── admin/     router.py  schemas.py
│   ├── packs/     router.py  schemas.py
│   ├── events/    router.py  schemas.py
│   ├── journey/   router.py  schemas.py
│   ├── nfc/       router.py
│   └── health/    router.py
│
└── alembic/                    # Database migrations
    ├── env.py                  # Wires Alembic to SQLModel.metadata + DATABASE_URL
    ├── script.py.mako          # Template for new migration files
    └── versions/               # Ordered migration scripts (see §5.3)
```

### 2.1 Root files

| File | What it does | Depends on |
|---|---|---|
| `main.py` | Creates `FastAPI(title="Raccon Event Platform")`. Registers 8 routers (auth, users, health, admin, packs, events, journey, nfc), `CORSMiddleware` with an explicit origin list, and `add_pagination(app)`. Exposes `GET /` (alive message) and `GET /scalar` (Scalar API docs UI). | every `api/*/router.py`, `core.database.init_db`, `core.logger.listener`, `fastapi_pagination`, `scalar_fastapi` |
| `Dockerfile` | `python:3.12-slim`, installs `requirements.txt`, runs `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`. | `requirements.txt` |
| `requirements.txt` | Pinned FastAPI 0.111.1, SQLModel 0.0.47, SQLAlchemy 2.0.x, Pydantic 2, fastapi-pagination 0.15.15, resend, google-auth, psycopg2-binary, bcrypt, PyJWT, alembic, axiom-py, scalar-fastapi, python-multipart (needed for the login form). | — |
| `alembic.ini` | Standard Alembic config. Its `sqlalchemy.url` is a placeholder; the real URL comes from `.env` through `alembic/env.py`. | — |

### 2.2 `core/`: infrastructure

| File | Responsibility | Key symbols | Calls / used by |
|---|---|---|---|
| `config.py` | Loads environment variables into a typed `Settings` object (pydantic-settings, reads `.env`). **The app won't start if a required variable is missing.** | `settings` | Used by `database`, `security`, `email`, `logger`, `nfc/router`, `event_service`, `auth_service` (Google) |
| `database.py` | Creates the global `engine` (`echo=True`, so SQL is logged). `get_session()` is the FastAPI dependency that yields one `Session` per request. `init_db()` imports the models. | `engine`, `get_session`, `init_db` | Used by every service, `auth/dependencies`, `nfc/router`, `main` |
| `security.py` | Password hashing with `bcrypt`. JWT creation with HS256: access tokens last **7 days** (`purpose="access"`), reset tokens last **15 min** (`purpose="password_reset"`). | `hash_password`, `verify_password`, `create_access_token`, `reset_pass_token`, `decode_reset_pass_token`, `SECRET_KEY`, `ALGORITHM` | Used by `auth_service`, `auth/dependencies`, `nfc/router` |
| `email.py` | `send_password_reset_email(to, token)` sends a text + HTML email through **Resend** with the link `{FRONTEND_URL}/reset-password?token=…`. Errors are logged, never raised. | `send_password_reset_email` | Called as a background task by `auth_service.forgot_password` |
| `logger.py` | The `raccon` logger. If `AXIOM_TOKEN` and `AXIOM_DATASET` are set, logs go through a non-blocking queue to Axiom; otherwise to the console. | `logger`, `listener` | Used by services and `email`; `listener` is stopped in `main` |

### 2.3 `models/`: database tables

All models use `uuid.UUID` primary keys (`default_factory=uuid4`).

| File | Table | Columns (★ = unique/indexed) | Relations |
|---|---|---|---|
| `user.py` | `users` | `id`, `user_hash`★ (8 random chars via `generate_user_hash`), `name`, `username`★, `email`★, `phone_number`, `password` (bcrypt), `role`=`"user"`, `avatar_id`=1, `created_at` (UTC) | — |
| `pack.py` | `packs` | `id`, `owner_id`★ (nullable FK → users), `mode` (`open`/`seq`), `tags_count`, `master_auth_hash`★ | owner → `users.id` |
| `tag.py` | `tags` | `id`, `pack_id`★ FK, `static_hash`★ (6 chars), `sequence_num`, `is_printed`=false | → `packs.id` |
| `event.py` | `events` | `id`, `pack_id`★ FK, `title`=`"untitled"`, `status`=`"draft"`, `edit_count`=0 | → `packs.id` |
| `event_tag.py` | `event_tags` | `id`, `event_id`★ FK, `tag_id`★ FK, `tag_type`=`"clue"`, `content` **JSONB** | → `events.id`, `tags.id` |
| `journey_progress.py` | `journey_progress` | `id`, `event_id`★ FK, `user_hash`★, `current_sequence`=0, `score`=0, `status`=`"active"`, `frozen_until` (nullable), `visited_sequences` **JSONB list[int]** | → `events.id`; linked to a user by `user_hash` (not an FK) |
| `__init__.py` | — | Imports all 6 models. **Any new model must be added here**, or Alembic won't see it. | — |

### 2.4 `repositories/`: data access

Each class takes a `Session` in its constructor. None of them commit.

| File | Methods |
|---|---|
| `user_repo.py` · `UserRepository` | `get_by_username_or_email(username, email)`, `get_by_username`, `get_by_email`, `get_by_id`, `get_by_user_hash`, `add_user`, `delete_user` |
| `pack_repo.py` · `PackRepository` | `get_pack(id)`, `get_by_master_auth(hash)`, `get_by_owner_id(user_id)`, `get_packs()` (**paginated** with `fastapi_pagination.ext.sqlmodel.paginate`, ordered by id), `add_pack` |
| `tag_repo.py` · `TagRepository` | `get_by_tag_id`, `get_by_pack_id` (ordered by `sequence_num`), `get_by_static_hash`, `add_tag` |
| `event_repo.py` · `EventRepository` | `get_event`, `get_all_events(pack_ids)`, `get_by_pack_id` (latest event of a pack), `add_event` |
| `event_tag_repo.py` · `EventTagRepository` | `get_by_tag_id`, `get_all_by_event_id`, `get_by_event_id`, `get_exisiting_event_tag(event_id, tag_id)` *(sic)*, `add_event_tag` |
| `journey_progress_repo.py` · `JourneyProgressRepository` | `get_user_journey(event_id, user_hash)`, `add_progress` |

### 2.5 `services/`: business logic

Each service is a class whose `__init__(session = Depends(get_session))` builds its repositories, so routers inject it with `service: XService = Depends()`.

| File | Public methods | Business rules | Uses |
|---|---|---|---|
| `auth_service.py` · `AuthService` | `register_user`, `login`, `google_login`, `change_password`, `delete_account`, `forgot_password`, `reset_password` | Username **or** email must be unique (otherwise 400). Login accepts a username **or** an email and returns 400 on bad credentials. Google login verifies the ID token against `GOOGLE_CLIENT_ID` and auto-creates the user (random username suffix, phone `000000000`). A reset token embeds the last 10 characters of the password hash, so it **becomes invalid once the password changes** (one-time use). Forgot-password always answers the same way, so it doesn't reveal which emails exist. | `UserRepository`, `core.security`, `core.email`, `google.oauth2.id_token` |
| `user_service.py` · `UserService` | `get_profile`, `update_profile` | A changed username must be free (otherwise 400). Updates only the fields that were sent (`exclude_unset`). | `UserRepository` |
| `admin_service.py` · `AdminService` | `generate_packs`, `get_factory_pack_config`, `mark_tag_as_printed`, `get_packs` | For each pack: `master_auth_hash = secrets.token_urlsafe(12)`, plus `tags_count` tags with a 6-character `static_hash` and `sequence_num` 1…n. Commits once for the whole batch. The factory view builds `print_url = https://raccon.link/t/{static_hash}`. | `PackRepository`, `TagRepository`, `UserRepository` |
| `pack_service.py` · `PackService` | `preview_pack`, `claim_pack` | Claim fails if the pack is already owned (different 400 message when it's yours). On claim it sets `owner_id` **and auto-creates an Event** (`"UnTitled Event"`, `draft`) in the same transaction. | `PackRepository`, `EventRepository` |
| `event_service.py` · `EventService` | `get_event_details`, `setup_event_journey`, `edit_event`, `update_event`, `list_my_events` (+ helpers `validate_event_ownership`, `configure_tag`) | Only the **pack owner** can read or change an event (otherwise 403). Every `tag_id` must belong to the pack. **Traps are only allowed in `open` mode.** `setup` works only while `draft`. `edit` works only after draft, increments `edit_count` and is capped at `MAX_EDIT_LIMIT`. Tag configs are upserted, keyed by (event, tag). | `EventRepository`, `PackRepository`, `TagRepository`, `EventTagRepository`, `settings.MAX_EDIT_LIMIT` |
| `journey_service.py` · `JourneyService` | `scan_tag`, `get_progress`, `set_player_trap` | **Anti link-sharing:** `injected_user_hash` must equal the caller's `user_hash` (otherwise 403). The event must be `live`. A frozen player can't scan. **Trap:** each trap triggers once per player; `boom` subtracts points (minimum 0), `freeze` sets `frozen_until`. **seq mode:** tags must be scanned strictly in order (+1 point each). **open mode:** first come, first served; `claimed_by` is written into the event-tag content, and other players get "X claimed this tag before you". A journey completes when `score >= tags_count`. **Choose trap:** a player who finds a `choose` trap can turn it into `boom` or `freeze` once. | All repositories |
| `__init__.py` | Exports `AuthService`. | | |

### 2.6 `api/`: HTTP layer

| Folder | Files | Responsibility |
|---|---|---|
| `auth/` | `router.py` (prefix `/auth`), `schemas.py`, `dependencies.py` | Register, login (form + sets cookie), Google, logout, change, forgot and reset password, delete account. **`dependencies.py` is the auth gate for the whole API:** `get_current_user` (Bearer JWT → `User`, otherwise 401) and `get_current_admin` (`role == "admin"`, otherwise 403). |
| `users/` | `router.py` (prefix `/users`), `schemas.py` | `GET/PATCH /users/me`. `UserResponse` is the public shape of a user and includes `role`. |
| `admin/` | `router.py` (prefix `/admin`), `schemas.py` | Pack generation, packs list (paginated), factory view, mark printed. Every route uses `get_current_admin`. |
| `packs/` | `router.py` (prefix `/packs`), `schemas.py` | Public preview and authenticated claim by `master_auth_hash`. |
| `events/` | `router.py` (prefix `/events`), `schemas.py` | Owner event management. `TagConfig` has a validator that **cleans and validates** content per `tag_type` (see §4.6). |
| `journey/` | `router.py` (prefix `/journey`), `schemas.py` | Gameplay: scan, progress, set trap. |
| `nfc/` | `router.py` (prefix `/t`) | The URL written on the physical chip. Reads the `access_token` **cookie** and redirects to the frontend. |
| `health/` | `router.py` (prefix `/health`) | Liveness probe. |

### 2.7 `alembic/`

| File | Job |
|---|---|
| `env.py` | Imports `models` and sets `target_metadata = SQLModel.metadata`. **Overrides the URL with `settings.DATABASE_URL`**, so migrations always run against the database in `.env`. |
| `script.py.mako` | Template for `alembic revision`. |
| `versions/` | Migration chain, oldest → newest: `bbc81c3f9658` initial → `4a5803156a3d` users → `35e486d9bbf2` packs/tags/events/event_tags → `94fa227bd302` role → `39a4862d0f90` sequence + is_printed → `11ab39ccbe55` journey_progress → `03ff5c56feb3` user_hash → `a5de85087372` avatar_id → `ac0fae293274` event status + users.created_at → `6333893c2ce7` events.edit_count (**head**). |

---

## 3. Frontend ↔ backend connection & workflow

### 3.1 Transport

- **REST over HTTP with JSON.** There are no WebSockets.
- **Base URL:** `http://localhost:8000` locally (Docker maps `8000:8000`).
- **Interactive docs:** `/docs` (Swagger), `/redoc`, `/scalar`, and the raw schema at `/openapi.json`.
- **Pagination:** `GET /admin/packs` returns a `fastapi-pagination` `Page` (see §4.4).

### 3.2 Authentication model

| Mechanism | Where | Used for |
|---|---|---|
| **Bearer JWT** in `Authorization` | Every protected endpoint (`get_current_user`) | The main mechanism. The frontend keeps the token in `localStorage` (`raccoon_access_token`) and sends `Authorization: Bearer <token>`. |
| **`access_token` cookie** (`httponly`, `samesite=lax`, `secure=False`, value `"Bearer <jwt>"`) | Set by `POST /auth/login`; read **only** by `GET /t/{tag_hash}` | Phones that tap an NFC chip open the URL directly, without the SPA, so the cookie is the only way to know who scanned. That's why login uses `credentials: "include"`. |

**Token payload:** `{ "sub": "<user uuid>", "exp": …, "purpose": "access" }`. It lasts 7 days. There's no refresh token; when it expires, the user logs in again.

**Roles:** `role` lives on `users`, is returned by `GET /users/me`, and is enforced server-side by `get_current_admin`. To make an account admin, set `users.role = 'admin'` in Supabase (there's no endpoint for it).

**Logout is stateless.** `POST /auth/logout` only checks the token. The frontend must delete its stored token, and the JWT itself stays valid until it expires.

### 3.3 Environment variables

**`backend/.env`** (git-ignored; Docker loads it through `env_file`)

| Variable | Required | Example | Purpose |
|---|---|---|---|
| `DATABASE_URL` | ✅ | `postgresql://postgres.<ref>:<password>@aws-1-eu-central-1.pooler.supabase.com:6543/postgres` | SQLAlchemy and Alembic connection (Supabase **transaction pooler**, port 6543) |
| `SECRET_KEY` | ✅ | a random 64-char string | Signs every JWT. Changing it logs everyone out. |
| `RESEND_API_KEY` | ✅ | `re_…` | Password-reset emails (the app won't start without it) |
| `MAX_EDIT_LIMIT` | ✅ | `3` | How many times an owner can edit a non-draft event |
| `FRONTEND_URL` | ➖ (default `http://localhost:3000`) | `http://localhost:3000` | Redirect target of `GET /t/{tag_hash}` |
| `GOOGLE_CLIENT_ID` | ➖ | `…apps.googleusercontent.com` | Audience check for Google Sign-In |
| `AXIOM_TOKEN`, `AXIOM_DATASET` | ➖ | | Send logs to Axiom; if missing, logs go to the console |

Formatting rules for `.env` (python-dotenv): one `KEY=value` per line, **no spaces around `=`**, and quote values that contain `#` or spaces (`KEY="value"`). If you see `python-dotenv could not parse statement starting at line N`, line N breaks one of these rules.

**`frontend/raccoon/.env`**

| Variable | Example | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8000` | Base URL used by `src/api/apiClient.js`. Restart the dev server after changing it. |
| `HOST`, `PORT` | `0.0.0.0`, `8080` | The CRA dev server inside Docker (exposed on host port **3000**) |

### 3.4 CORS

`main.py` allows these origins, with `allow_credentials=True` and all methods and headers:

```
https://react-learning.aalsalhi-eng.workers.dev
http://localhost:8080   http://127.0.0.1:8080
http://localhost:3000   http://127.0.0.1:3000
```

If you serve the frontend from any other origin (a new deploy URL or another port), **add it to the `origins` list**. Otherwise the browser blocks the requests with a CORS error.

### 3.5 End-to-end flows

**Login → profile**

```
FE  POST /auth/login (form: username, password)  ─►  { access_token }  + Set-Cookie access_token
FE  localStorage.setItem("raccoon_access_token", token)
FE  GET /users/me (Bearer)                         ─►  UserResponse (incl. role → admin vs user UI)
```

**NFC scan**

```
Phone taps chip → https://<api>/t/Ab12Cd
  ├─ no or invalid cookie  → 307 → {FRONTEND_URL}/login?redirect_tag=Ab12Cd
  │                              FE logs in, then navigates to /scan?tag=Ab12Cd&user=<user_hash>
  └─ valid cookie          → 307 → {FRONTEND_URL}/scan?tag=Ab12Cd&user=<user_hash>
FE /scan page → POST /journey/scan { tag_hash, injected_user_hash } (Bearer)
```

**Claim a pack:** the QR or link in the box carries `master_auth_hash`.

```
FE /claim/:masterAuthHash → GET /packs/preview/{hash}   (public: show mode and pieces)
                          → POST /packs/claim { master_auth_hash } (Bearer) → event auto-created
```

**Password reset**

```
POST /auth/forgot-password { email } → email with link /reset-password?token=…
FE /reset-password page → POST /auth/reset-password { token, new_password }
```

### 3.6 Error format

Every error has a JSON body with a `detail` key.

```json
// Business error raised by a service (400 / 401 / 403 / 404)
{ "detail": "Username or Email already exists" }

// 422: request failed schema validation (FastAPI/Pydantic)
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "phone_number"],
      "msg": "String should match pattern '^\\d{9}$'",
      "input": "05123"
    }
  ]
}
```

On the frontend, `src/api/apiClient.js → apiRequest()` throws an `Error` with `.status` and `.detail`. Check `error.status`, and for 422 check whether `error.detail` is an array to show errors per field.

---

## 4. API reference & frontend integration guide

**Legend:** 🔓 public · 🔐 requires `Authorization: Bearer <token>` · 🛡️ admin only (`role = "admin"`)

All examples use the project's helper:

```js
// src/api/apiClient.js
import { apiRequest } from "../apiClient";
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const json = { "Content-Type": "application/json" };
```

### Endpoint index

| # | Method | Path | Access | Purpose |
|---|---|---|---|---|
| 1 | GET | `/` | 🔓 | Root alive message |
| 2 | GET | `/health/` | 🔓 | Health check |
| 3 | POST | `/auth/register` | 🔓 | Create account |
| 4 | POST | `/auth/login` | 🔓 | Log in (form) → JWT + cookie |
| 5 | POST | `/auth/google` | 🔓 | Google Sign-In → JWT |
| 6 | POST | `/auth/logout` | 🔐 | Confirm logout |
| 7 | POST | `/auth/change-password` | 🔐 | Change password |
| 8 | DELETE | `/auth/delete-account` | 🔐 | Delete own account |
| 9 | POST | `/auth/forgot-password` | 🔓 | Send reset email |
| 10 | POST | `/auth/reset-password` | 🔓 | Set new password with token |
| 11 | GET | `/users/me` | 🔐 | Current profile |
| 12 | PATCH | `/users/me` | 🔐 | Update profile |
| 13 | POST | `/admin/generate-packs` | 🛡️ | Create packs + tags |
| 14 | GET | `/admin/packs` | 🛡️ | Paginated packs list |
| 15 | GET | `/admin/factory/pack/{pack_id}` | 🛡️ | Factory programming view |
| 16 | PATCH | `/admin/factory/tags/{tag_id}/mark-printed` | 🛡️ | Mark a tag printed |
| 17 | GET | `/packs/preview/{master_auth_hash}` | 🔓 | Preview a pack before claiming |
| 18 | POST | `/packs/claim` | 🔐 | Claim pack (creates event) |
| 19 | GET | `/events` | 🔐 | My events |
| 20 | GET | `/events/{event_id}` | 🔐 owner | Event + per-tag config |
| 21 | PUT | `/events/{event_id}/setup` | 🔐 owner | Configure tags (draft only) |
| 22 | PUT | `/events/{event_id}/edit` | 🔐 owner | Re-configure tags (limited) |
| 23 | PATCH | `/events/{event_id}` | 🔐 owner | Rename / change status |
| 24 | POST | `/journey/scan` | 🔐 | Scan a tag in a live event |
| 25 | GET | `/journey/progress/{event_id}` | 🔐 | My progress in an event |
| 26 | POST | `/journey/set-trap` | 🔐 | Arm a "choose" trap |
| 27 | GET | `/t/{tag_hash}` | 🍪 cookie | NFC redirect into the frontend |

---

### 4.1 System

#### 1 · `GET /` 🔓 · 2 · `GET /health/` 🔓

**Purpose:** check that the API is up. Neither one queries the database.

```json
// GET /             → 200
{ "message": "System is running. Database connected!" }
// GET /health/      → 200
{ "status": "ok", "message": "Raccon APIs is running!" }
```

```js
const health = await apiRequest("/health/");
```

> Neither endpoint touches the DB, so a `200` here **doesn't** mean Supabase is reachable. To check the database, call something like `GET /users/me`.

---

### 4.2 Auth: `/auth`

#### 3 · `POST /auth/register` 🔓

**Purpose:** create a `user` account. The password is bcrypt-hashed, and `user_hash` and `role="user"` are assigned automatically.

**Body (JSON)**

| Field | Type | Rules |
|---|---|---|
| `name` | string | required |
| `username` | string | required, `^[a-z0-9_]+$` (lowercase, digits, `_`) |
| `email` | string | required (not format-validated on the server) |
| `phone_number` | string | required, **exactly 9 digits** `^\d{9}$` (e.g. `512345678`) |
| `password` | string | required, max **72** chars (bcrypt limit) |
| `avatar_id` | int | optional, default `1` |

```json
{ "name": "Eman", "username": "eman_h", "email": "eman@example.com",
  "phone_number": "512345678", "password": "S3cret!pass", "avatar_id": 3 }
```

**Responses**

| Code | Body |
|---|---|
| 200 | `{ "message": "User registered successfully", "user_id": "9b1e…-uuid" }` |
| 400 | `{ "detail": "Username or Email already exists" }` |
| 422 | Validation array (bad username, phone or password length) |

```js
export const registerUser = (data) =>
  apiRequest("/auth/register", { method: "POST", headers: json, body: JSON.stringify(data) },
             "تعذر إنشاء الحساب.");
```

> Registering doesn't log the user in. Call `/auth/login` next.

#### 4 · `POST /auth/login` 🔓

**Purpose:** exchange credentials for a JWT. It also sets the `access_token` cookie that the NFC redirect needs.

**Body: `application/x-www-form-urlencoded`** (OAuth2 password form, **not JSON**)

| Field | Notes |
|---|---|
| `username` | the **username or the email** |
| `password` | |
| `grant_type` | optional, `"password"` |

**Responses**

| Code | Body |
|---|---|
| 200 | `{ "access_token": "eyJhbGciOi…", "token_type": "bearer" }` + `Set-Cookie: access_token="Bearer …"; HttpOnly; SameSite=Lax` |
| 400 | `{ "detail": "Invalid credentials" }` ← wrong user or password (**400, not 401**) |
| 422 | missing `username` / `password` |

```js
export async function loginUser({ identifier, password }) {
  const form = new URLSearchParams({ username: identifier, password, grant_type: "password" });
  return apiRequest("/auth/login", {
    method: "POST",
    credentials: "include",            // keep this: the NFC flow needs the cookie
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  }, "تعذر تسجيل الدخول.");
}
```

#### 5 · `POST /auth/google` 🔓

**Purpose:** sign in with a Google ID token (from Google Identity Services). Creates the user on first login.

```json
{ "credential": "<Google ID token (JWT) from the GIS callback>" }
```

| Code | Body |
|---|---|
| 200 | `{ "access_token": "…", "token_type": "bearer" }` (**no cookie is set**, unlike `/auth/login`) |
| 400 | `{ "detail": "Invalid Google token" }` |

```js
const { access_token } = await apiRequest("/auth/google", {
  method: "POST", headers: json, body: JSON.stringify({ credential: response.credential }),
});
```

> A Google-created user gets the placeholder phone `000000000` and a username like `eman_a1b2c3`. Ask them to complete their profile with `PATCH /users/me`.

#### 6 · `POST /auth/logout` 🔐

**Purpose:** confirm the token is valid. The server keeps no state, so it **doesn't revoke the token or clear the cookie**.

| Code | Body |
|---|---|
| 200 | `{ "message": "Successfully logged out." }` |
| 401 | `{ "detail": "Could not validate credentials" }` |

```js
await apiRequest("/auth/logout", { method: "POST", headers: auth(token) });
clearSession();   // always remove the local token on the client, even if this call fails
```

#### 7 · `POST /auth/change-password` 🔐

```json
{ "old_password": "S3cret!pass", "new_password": "N3w!pass" }   // new_password ≤ 72
```

| Code | Body |
|---|---|
| 200 | `{ "message": "Password changed successfully" }` |
| 400 | `{ "detail": "Incorrect old password" }` |

```js
await apiRequest("/auth/change-password", {
  method: "POST", headers: { ...auth(token), ...json },
  body: JSON.stringify({ old_password, new_password }),
});
```

#### 8 · `DELETE /auth/delete-account` 🔐

**Purpose:** permanently delete the current user.

| Code | Body |
|---|---|
| 200 | `{ "message": "Account deleted successfully" }` |

```js
await apiRequest("/auth/delete-account", { method: "DELETE", headers: auth(token) });
```

> ⚠️ The delete doesn't cascade. If the user owns packs, the delete can fail with a 500 (foreign key on `packs.owner_id`).

#### 9 · `POST /auth/forgot-password` 🔓

```json
{ "email": "eman@example.com" }
```

| Code | Body |
|---|---|
| 200 | `{ "message": "If an account with this email exists, the reset link is sent." }` (always the same) |

The email is sent **after** the response (as a background task) and contains `…/reset-password?token=<jwt>`, valid for **15 minutes**.

```js
await apiRequest("/auth/forgot-password", { method: "POST", headers: json, body: JSON.stringify({ email }) });
```

#### 10 · `POST /auth/reset-password` 🔓

```json
{ "token": "<from ?token= in the email link>", "new_password": "N3w!pass" }
```

| Code | Body |
|---|---|
| 200 | `{ "message": "Password reset successful." }` |
| 400 | `{ "detail": "Invalid reset token" }` (expired, already used, or tampered with) |

```js
const token = new URLSearchParams(location.search).get("token");
await apiRequest("/auth/reset-password", {
  method: "POST", headers: json, body: JSON.stringify({ token, new_password }),
});
```

---

### 4.3 Users: `/users`

#### 11 · `GET /users/me` 🔐

**Purpose:** return the logged-in user. The frontend uses `role` to choose the admin or user UI.

```json
{
  "id": "9b1e2c3d-…",
  "user_hash": "aB3dE9xQ",
  "name": "Eman",
  "username": "eman_h",
  "email": "eman@example.com",
  "phone_number": "512345678",
  "avatar_id": 3,
  "role": "user",
  "created_at": "2026-10-30T09:12:44.120Z"
}
```

| Code | Meaning |
|---|---|
| 200 | as above |
| 401 | missing, expired or invalid token → clear the session and send the user to `/login` |

```js
export const getCurrentUser = (token, { signal } = {}) =>
  apiRequest("/users/me", { headers: auth(token), signal }, "تعذر تحميل بيانات الحساب.");
```

#### 12 · `PATCH /users/me` 🔐

**Purpose:** partial profile update. Send only the fields you're changing.

| Field | Rules |
|---|---|
| `name` | string |
| `username` | `^[a-z0-9_]+$`, must be free |
| `phone_number` | `^\d{9}$` |
| `avatar_id` | int |

```json
{ "name": "Eman H", "avatar_id": 5 }
```

| Code | Body |
|---|---|
| 200 | updated `UserResponse` |
| 400 | `{ "detail": "Username is already taken" }` |
| 422 | pattern mismatch |

```js
export const updateProfile = (token, changes) =>
  apiRequest("/users/me", { method: "PATCH", headers: { ...auth(token), ...json },
                            body: JSON.stringify(changes) });
```

> `email`, `password` and `role` can't be changed here.

---

### 4.4 Admin: `/admin` 🛡️

Every admin route returns **403** `{ "detail": "You do not have permission to access this resource" }` to a non-admin.

#### 13 · `POST /admin/generate-packs` 🛡️

**Purpose:** create `quantity` new, unclaimed packs, each with `tags_count` tags.

| Field | Type | Rules |
|---|---|---|
| `mode` | `"open"` \| `"seq"` | required |
| `tags_count` | int | required (the UI should use 3–30; the server doesn't enforce a range) |
| `quantity` | int | default `1`, ≥ 1 |

```json
{ "mode": "seq", "tags_count": 6, "quantity": 2 }
```

**200 response:** an array with one item per pack.

```json
[
  {
    "pack_id": "1f0c…",
    "master_auth_hash": "q8Zr3k1N_fXa2bLm",
    "tags": [
      { "id": "a1…", "static_hash": "Ab12Cd", "sequence_num": 1, "is_printed": false },
      { "id": "a2…", "static_hash": "Ef34Gh", "sequence_num": 2, "is_printed": false }
    ]
  }
]
```

```js
export const generatePacks = (token, body) =>
  apiRequest("/admin/generate-packs", { method: "POST", headers: { ...auth(token), ...json },
                                        body: JSON.stringify(body) });
```

> `master_auth_hash` is the secret behind the claim link (`/claim/{master_auth_hash}`). Show it only to admins, and mask it in lists (for example `q8Zr…bLm`).

#### 14 · `GET /admin/packs` 🛡️

**Purpose:** list all packs, paginated and ordered by id.

**Query:** `page` (default 1, ≥ 1) · `size` (default 50, 1–100)

```json
{
  "items": [
    { "id": "1f0c…", "mode": "seq", "tags_count": 6, "owner_id": null },
    { "id": "2a9d…", "mode": "open", "tags_count": 10, "owner_id": "9b1e…" }
  ],
  "total": 42, "page": 1, "size": 20, "pages": 3
}
```

```js
export const getPacks = (token, page = 1, size = 20) =>
  apiRequest(`/admin/packs?${new URLSearchParams({ page, size })}`, { headers: auth(token) });
```

> `owner_id: null` means the pack is still unclaimed.

#### 15 · `GET /admin/factory/pack/{pack_id}` 🛡️

**Purpose:** the data the factory needs to program the NFC chips of one pack.

```json
{
  "pack_id": "1f0c…",
  "mode": "seq",
  "tags_to_program": [
    { "sequence_num": 1, "tag_id": "a1…", "print_url": "https://raccon.link/t/Ab12Cd", "is_printed": false }
  ]
}
```

| Code | Body |
|---|---|
| 404 | `{ "detail": "Pack not found" }` |
| 422 | `pack_id` is not a UUID |

```js
const cfg = await apiRequest(`/admin/factory/pack/${packId}`, { headers: auth(token) });
```

#### 16 · `PATCH /admin/factory/tags/{tag_id}/mark-printed` 🛡️

**Purpose:** mark one tag as printed or programmed. There's no body.

| Code | Body |
|---|---|
| 200 | `{ "status": "success", "message": "Tag 3 marked as printed" }` |
| 404 | `{ "detail": "Tag not found" }` |

```js
await apiRequest(`/admin/factory/tags/${tagId}/mark-printed`, { method: "PATCH", headers: auth(token) });
```

---

### 4.5 Packs: `/packs`

#### 17 · `GET /packs/preview/{master_auth_hash}` 🔓

**Purpose:** show what's in a box before the user logs in or claims it.

```json
{ "id": "1f0c…", "mode": "seq", "tags_count": 6, "owner_id": null }
```

| Code | Body |
|---|---|
| 404 | `{ "detail": "Invalid Master Auth Hash. Pack not found." }` |

```js
const pack = await apiRequest(`/packs/preview/${encodeURIComponent(masterAuthHash)}`);
const alreadyClaimed = pack.owner_id !== null;
```

#### 18 · `POST /packs/claim` 🔐

**Purpose:** make the current user the owner. It **auto-creates a draft Event** for the pack.

```json
{ "master_auth_hash": "q8Zr3k1N_fXa2bLm" }
```

| Code | Body |
|---|---|
| 200 | `PackResponse` with `owner_id` = you |
| 400 | `"You already own this pack."` · `"This pack has already been claimed by another user."` |
| 404 | invalid hash |

```js
export const claimPack = (token, master_auth_hash) =>
  apiRequest("/packs/claim", { method: "POST", headers: { ...auth(token), ...json },
                               body: JSON.stringify({ master_auth_hash }) });
// then: const events = await apiRequest("/events", { headers: auth(token) }) to find the new event id
```

---

### 4.6 Events: `/events` (owner only)

Every route that takes `{event_id}` returns **404** `"Event not found."` or **403** `"You do not own this pack."`.

#### `TagConfig` / `TagContent` reference

```ts
TagConfig  = { tag_id: uuid, tag_type: "clue" | "trap" (default "clue"), content: TagContent }
TagContent = { hint?: string, image?: string,            // clue only
               boom?: int, freeze?: int, choose?: bool,  // trap only, exactly ONE of them
               was_choose?: bool, claimed_by?: string }  // server-managed, ignored on input
```

The validator cleans and validates `content`:

- `claimed_by` and `was_choose` are **always reset**, so clients can't set them.
- For **`clue`**, the trap fields are dropped.
- For **`trap`**, `hint` and `image` are dropped, and **exactly one** of `boom`, `freeze` or `choose` must be set:
  - `boom` must be `1`.
  - `freeze` must be 1–180 (seconds).
  - `choose: true` lets the player who finds it arm it later.
- **Traps are only allowed when the pack `mode` is `"open"`** (otherwise 400).

#### 19 · `GET /events` 🔐

**Purpose:** list events for every pack you own.

```json
[ { "id": "e1…", "pack_id": "1f0c…", "title": "UnTitled Event", "status": "draft" } ]
```

```js
export const listMyEvents = (token) => apiRequest("/events", { headers: auth(token) });
```

#### 20 · `GET /events/{event_id}` 🔐

**Purpose:** the full editor view: every physical tag of the pack (in sequence order) with its configuration, if there is one.

```json
{
  "id": "e1…", "pack_id": "1f0c…", "title": "Camp Night", "status": "draft",
  "tags": [
    { "sequence_num": 1, "tag_id": "a1…", "tag_type": "clue",
      "content": { "hint": "Under the big tent" }, "is_configured": true },
    { "sequence_num": 2, "tag_id": "a2…", "tag_type": null, "content": null, "is_configured": false }
  ],
  "edit_count": 0, "edits_remaining": 3, "max_edits": 3
}
```

```js
const event = await apiRequest(`/events/${eventId}`, { headers: auth(token) });
```

#### 21 · `PUT /events/{event_id}/setup` 🔐

**Purpose:** save the tag configuration while the event is **draft**. You can call it as many times as you like; tags are upserted, so you can send only the ones that changed.

```json
{
  "tags_config": [
    { "tag_id": "a1…", "tag_type": "clue", "content": { "hint": "Under the big tent" } },
    { "tag_id": "a2…", "tag_type": "trap", "content": { "freeze": 30 } }
  ]
}
```

| Code | Body |
|---|---|
| 200 | `{ "status": "success", "message": "Tag setup saved successfully." }` |
| 400 | `"You can't setup a saved/live event, use the edit option."` · `"Tag ID … does not belong to this pack."` · `"Only packs in 'open' mode can have trap tags configured."` |
| 422 | trap validation errors (see the rules above) |

```js
export const setupEvent = (token, eventId, tags_config) =>
  apiRequest(`/events/${eventId}/setup`, { method: "PUT", headers: { ...auth(token), ...json },
                                           body: JSON.stringify({ tags_config }) });
```

#### 22 · `PUT /events/{event_id}/edit` 🔐

**Purpose:** change the tag configuration **after** the event left draft. Each call uses one edit.

The body is the same as **setup**.

| Code | Body |
|---|---|
| 200 | `{ "edit_count": 1, "edits_remaining": 2, "max_edits": 3 }` |
| 400 | `"Event is still in draft. Use setup instead."` · `"You have reached the maximum edit limit."` (+ setup errors) |

```js
const { edits_remaining } = await apiRequest(`/events/${eventId}/edit`, {
  method: "PUT", headers: { ...auth(token), ...json }, body: JSON.stringify({ tags_config }),
});
```

#### 23 · `PATCH /events/{event_id}` 🔐

**Purpose:** rename an event and/or change its status. **Set it to `"live"` to start the game.**

```json
{ "title": "Camp Night", "status": "live" }      // both optional; status ∈ draft | paused | live
```

| Code | Body |
|---|---|
| 200 | `{ "id": "e1…", "pack_id": "1f0c…", "title": "Camp Night", "status": "live" }` |
| 422 | invalid status value |

```js
export const updateEvent = (token, eventId, changes) =>
  apiRequest(`/events/${eventId}`, { method: "PATCH", headers: { ...auth(token), ...json },
                                     body: JSON.stringify(changes) });
```

> Event status labels for the UI: `draft` = مسودة · `live` = منشورة / مباشرة · `paused` = متوقفة.

---

### 4.7 Journey (gameplay): `/journey`

#### 24 · `POST /journey/scan` 🔐

**Purpose:** a player scans a tag. Both values come from the `/scan?tag=…&user=…` URL that `/t/{hash}` redirects to.

```json
{ "tag_hash": "Ab12Cd", "injected_user_hash": "aB3dE9xQ" }
```

**200 response, clue (success)**

```json
{ "status": "success", "message": "Tag 2 scanned successfully!", "tag_sequence": 2,
  "tag_type": "clue", "content": { "hint": "Look behind the gate" }, "current_score": 2 }
```

**200 response, trap triggered**

```json
{ "status": "trap_triggered", "message": "Freeze! You are frozen for 30 seconds.",
  "tag_sequence": 4, "tag_type": "trap", "content": { "freeze": 30 }, "current_score": 0 }
```

If `content.choose === true`, show the "choose a trap" UI, which calls **#26**.

**Errors**

| Code | `detail` |
|---|---|
| 403 | `Security Violation: Link sharing detected.` (`injected_user_hash` ≠ your hash) |
| 404 | `Invalid Tag.` |
| 400 | `This event is not live.` |
| 400 | `You have already completed this event!` |
| 400 | `You are currently frozen and cannot scan tags.` |
| 400 | `You already triggered this trap.` |
| 400 | **seq:** `You have already scanned this tag.` · `Skipped tag! You must scan tag N first.` |
| 400 | **open:** `You already claimed this tag.` · `Sorry, <name> claimed this tag before you!` · `You already scanned this tag.` |

```js
export const scanTag = (token, tag_hash, injected_user_hash) =>
  apiRequest("/journey/scan", { method: "POST", headers: { ...auth(token), ...json },
                                body: JSON.stringify({ tag_hash, injected_user_hash }) });
```

> A player's journey becomes `completed` when `score >= tags_count`.

#### 25 · `GET /journey/progress/{event_id}` 🔐

```json
{ "score": 3, "status": "active", "visited_sequences": [1, 4, 5] }
// never scanned:
{ "score": 0, "status": "not_started", "visited_sequences": [] }
```

```js
const progress = await apiRequest(`/journey/progress/${eventId}`, { headers: auth(token) });
```

#### 26 · `POST /journey/set-trap` 🔐

**Purpose:** arm a `choose` trap (one time only) for the players who come next.

```json
{ "tag_hash": "Zz98Yy", "injected_user_hash": "aB3dE9xQ", "trap_type": "freeze", "trap_value": 60 }
```

`trap_type` is `boom` (value must be `1`) or `freeze` (value 1–180).

| Code | Body |
|---|---|
| 200 | `{ "status": "success", "message": "Trap freeze set successfully on tag 7." }` |
| 400 | `This tag is not a trap.` · `This trap has already been activated or is not available for activation.` · `This event is not live.` |
| 403 / 404 | same as scan |
| 422 | invalid `trap_value` |

```js
await apiRequest("/journey/set-trap", { method: "POST", headers: { ...auth(token), ...json },
  body: JSON.stringify({ tag_hash, injected_user_hash, trap_type: "boom", trap_value: 1 }) });
```

---

### 4.8 NFC redirect: `/t`

#### 27 · `GET /t/{tag_hash}` 🍪

**Purpose:** the URL programmed onto every chip. It's **not called with fetch**; the phone's browser opens it.

| Situation | Result |
|---|---|
| No `access_token` cookie, or an invalid one | `307 → {FRONTEND_URL}/login?redirect_tag={tag_hash}` (the bad cookie is deleted) |
| Valid cookie | `307 → {FRONTEND_URL}/scan?tag={tag_hash}&user={user_hash}` |

**What the frontend must do:**

- On `/login`, read `redirect_tag` and, after a successful login, navigate to `/scan?tag=<redirect_tag>&user=<me.user_hash>`. `LoginPage.jsx` already does this.
- On `/scan`, read `tag` and `user` and call **#24**.
- Always log in with `credentials: "include"` so the cookie is stored for the next tap.

---

## 5. Local setup & contribution guide

### 5.1 Prerequisites

- Docker Desktop (recommended), **or** Python 3.12 for running without Docker
- Git, with your fork cloned and `upstream` pointing to the team repo
- A `backend/.env` (ask the team lead for the values; never commit it)

### 5.2 Run with Docker (recommended)

From the **repo root**:

```bash
# 1. Create backend/.env (see §3.3) and make sure frontend/raccoon/.env has REACT_APP_API_URL=http://localhost:8000

# 2. Build + start API (8000) and frontend (3000)
docker compose up --build

# 3. Check it's up
#    http://localhost:8000/health/   → {"status":"ok",...}
#    http://localhost:8000/docs      → Swagger UI
#    http://localhost:3000           → frontend
```

| Command | When |
|---|---|
| `docker compose logs -f api` | Follow the backend logs |
| `docker compose logs api --tail 50` | The last 50 lines (look here first when the UI misbehaves) |
| `docker compose restart api` | After changing `.env` (code changes reload automatically through `--reload` and the volume mount) |
| `docker compose up --build` | After changing `requirements.txt` |
| `docker compose down` | Stop everything |
| `docker compose exec api bash` | A shell inside the container |

### 5.3 Database & migrations (Alembic)

The schema comes from `models/`, and Alembic turns model changes into versioned scripts. **Migrations never run automatically.**

```bash
# Apply all migrations to the DB in DATABASE_URL
docker compose exec api alembic upgrade head

# Where am I?
docker compose exec api alembic current
docker compose exec api alembic history

# After changing / adding a model:
#   1) edit models/<x>.py   (new model? also import it in models/__init__.py)
#   2) generate:
docker compose exec api alembic revision --autogenerate -m "add xyz to events"
#   3) READ the generated file in alembic/versions/ and fix it if needed
#      (autogenerate misses renames, server defaults and enum changes)
#   4) apply:
docker compose exec api alembic upgrade head

# Undo the last migration
docker compose exec api alembic downgrade -1
```

> ⚠️ The team shares **one Supabase database**. Running `upgrade` or `downgrade` changes it for everyone. Agree on it with the team first, and **never edit a migration that's already merged**; add a new one instead.

**Seeding:** there's no seed script. To get test data:

1. Register a user through `POST /auth/register` (or the UI).
2. Make that user an admin in the Supabase Table Editor: `users.role = admin`.
3. Log in, call `POST /admin/generate-packs`, then claim a pack through `/packs/claim` with its `master_auth_hash`.

### 5.4 Run without Docker

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate     macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Run these commands from inside `backend/`, because `core/config.py` reads `.env` from the **current directory**.

### 5.5 Adding a new endpoint (checklist)

1. **Model:** if you need a new table or column, edit `models/`, create a migration, and apply it (§5.3).
2. **Repository:** add query methods to `repositories/<entity>_repo.py`. **Don't commit here.**
3. **Service:** put the rules in `services/<feature>_service.py`. Raise `HTTPException` with a clear `detail`, check ownership or role, and call `self.session.commit()` once at the end.
4. **Schemas:** add request and response models to `api/<feature>/schemas.py`. **Never return a table model directly** if it has secrets (`password`, `master_auth_hash`).
5. **Router:** add the route to `api/<feature>/router.py` with `response_model=…`, `service: XService = Depends()`, and `get_current_user` or `get_current_admin`.
6. **New router file?** Register it in `main.py` with `app.include_router(...)`.
7. **Document it** in §4 of this README (method, path, body, response, errors, `fetch` example).
8. Test it in `/docs` (click **Authorize** and paste the token), then from the frontend.

### 5.6 Code conventions

- **Layering is strict:** router → service → repository → model. Don't put queries in routers or `HTTPException`s in repositories.
- **Naming:** snake_case in Python and in JSON fields; classes `XService`, `XRepository`; files `x_service.py`, `x_repo.py`.
- **Type hints** on every service and repository method.
- **Logging:** `from core.logger import logger`. Log important actions (`logger.info`) and caught failures (`logger.exception`). **Never log passwords, tokens or `master_auth_hash`.**
- **Errors:** use precise status codes (400 business rule, 401 auth, 403 permission, 404 missing) and a human-readable `detail`. The frontend shows or maps these strings.
- **Secrets:** only in `.env`. Never hard-code them, and never commit `.env`.
- **Dependencies:** pin new packages in `requirements.txt`.

### 5.7 Testing

There's **no automated test suite yet**. Until one exists:

- **Manual:** use `/docs` or `/scalar`. Cover the happy path, then each error in the endpoint's table in §4.
- **Recommended setup** (when you add tests): `pytest` + `httpx` with FastAPI's `TestClient`, overriding `get_session` with a throwaway database:

  ```python
  # tests/conftest.py (suggested)
  from fastapi.testclient import TestClient
  from main import app
  from core.database import get_session
  app.dependency_overrides[get_session] = lambda: test_session   # test DB session
  client = TestClient(app)
  ```

  Run them with `docker compose exec api pytest`.

### 5.8 Git workflow & pull requests

1. Sync first: `git switch Dev` → `git fetch upstream` → `git merge upstream/Dev`.
2. Branch: `git switch -c feature/<short-name>` (or `fix/…`).
3. Commit in small steps using **Conventional Commits**: `feat: …`, `fix: …`, `refactor: …`, `docs: …`, `chore: …`.
4. Before pushing:
   - The app starts with no errors: `docker compose up --build`, and the API log is clean.
   - New migrations are applied and committed.
   - The README is updated for any API change.
   - No `.env`, secrets or debug prints are included.
5. Push to **your fork**, then open a PR to **`t8pr/Raccon` → base `Dev`** (not `main`).
6. In the PR description, include: what changed, why, how to test (endpoints + sample bodies), migration notes, and any breaking API change for the frontend.
7. Request a review from a teammate. Resolve conflicts on your branch, not in the PR.

---

## 6. Known gaps & gotchas

Read these before debugging. They're current behaviours of the code, not bugs in your setup.

| Area | Note |
|---|---|
| **Supabase connection** | `OperationalError … pooler.supabase.com … port 6543 … server closed the connection` means the API can't reach the database, so every DB endpoint fails and the frontend may stay blank while it loads the profile. Check: the `DATABASE_URL` line in `.env`; whether the Supabase project is **paused** (Restore it in the dashboard); whether your network blocks port 6543 (try a hotspot). |
| `.env` parsing | `python-dotenv could not parse statement starting at line N` means line N is malformed (spaces around `=`, unclosed quote, unquoted `#`). |
| Login error code | Bad credentials return **400**, not 401. |
| Logout | It's stateless: tokens stay valid for 7 days, and the cookie isn't cleared. |
| Reset email link | `core/email.py` hard-codes `FRONTEND_URL` to the workers.dev deploy instead of `settings.FRONTEND_URL`, so local reset links open the deployed site. |
| Factory URL | `print_url` is hard-coded to `https://raccon.link/t/…`. |
| Google login | No cookie is set, so the NFC redirect treats Google users as logged out until they use password login. |
| `EventCreateRequest` | Defined but unused. Events are created only by `POST /packs/claim`. |
| Event status | `PATCH /events/{id}` allows any transition, including back to `draft`. |
| Delete account | No cascade; it fails if the user owns packs. |
| Pagination warning | `fastapi-pagination` warns that FastAPI 0.111 is below 0.128. It's harmless for now, but plan an upgrade. `requirements.txt` also lists `fastapi==0.111.1` twice. |
| SQL logging | `create_engine(..., echo=True)` prints every SQL statement. Expect noisy logs. |
| Admin status names | The frontend admin "experiences" pages use dummy data with `published/draft/archived`. The backend `Event.status` is `draft/paused/live`, so map them when you connect the pages. |
