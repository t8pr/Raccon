# Raccon REST API Documentation

**Version:** 0.1 (API documentation — work in progress)  

## 1. Conventions

### 1.1 Authentication

Protected endpoints require:

```http

Authorization: Bearer <access_token>

```

The backend identifies the authenticated user from the token; clients must not send a `player_id` to impersonate another player. Owner-only endpoints verify ownership of the requested package. Admin-only endpoints require an explicit admin authorization via credentials.

### 1.2 Content types and identifiers

- Most requests and responses use `Content-Type: application/json`.

- Login currently uses `application/x-www-form-urlencoded` (OAuth2 form fields).

- All durations  use **seconds**.

## 2. Endpoint summary

| Method | Path | Auth | User story | Status |
|---|---|---|---|---|
| `POST` | `/auth/register` | Public | US-01 | Existing; needs story-alignment review |
| `POST` | `/auth/login` | Public | US-02 | Existing |
| `POST` | `/auth/logout` | User | US-02 | Existing; token revocation not implemented in prior review |
| `POST` | `/auth/change-password` | User | Account management | Existing |
| `DELETE` | `/auth/delete-account` | User | Account management | Existing |
| `GET` | `/users/me` | User | US-01/02 | Existing |
| `PATCH` | `/users/me` | User | Account management | Existing |
| `GET` | `/` | Public | Operations | Existing |
| `GET` | `/health/` | Public | Operations | Existing |
| `GET` | `/api/package-options` | Public | Claiming a Package | To Do |
| `POST` | `/api/packages/claim` | User | Claiming a Package | To Do |
| `GET` | `/api/packages` | Owner | US-03 | To Do |
| `GET` | `/api/packages/{package_id}` | Owner | US-03 | To Do |
| `PATCH` | `/api/packages/{package_id}` | Owner | US-03 | To Do |
| `GET` | `/api/packages/{package_id}/configuration` | Owner | US-04–08 | To Do |
| `PUT` | `/api/packages/{package_id}/tags/{tag_id}` | Owner | US-04,05,07 | To Do |
| `POST` | `/api/packages/{package_id}/images` | Owner | US-05 | To Do |
| `PUT` | `/api/packages/{package_id}/settings` | Owner | US-08, Timer | To Do |
| `POST` | `/api/packages/{package_id}/configuration/save` | Owner | US-04,06,07,08 | To Do |
| `GET` | `/api/packages/{package_id}/play-state` | Player | US-12–14, Timer | To Do |
| `GET` | `/api/packages/{package_id}/leaderboard` | Player | US-15 | To Do |


## 3. Authentication and user profile

### 3.1 `POST /auth/register`

**Purpose:** Create an account (US-01).  

**Auth:** Public.  

**Content-Type:** `application/json`.

**To Do request:**

```json

{

  "name": "Ahmed Ali",

  "username": "ahmed_ali",

  "email": "ahmed@example.com",

  "phone_number": "512345678",

  "password": "examplePassword",

  "avatar_id": "avatar_03"

}

```

**To Do `201` response:**

```json

{

  "user_id": "user_42",

  "message": "User registered successfully"

}

```

**Validation and rules:** Name, username, email, phone, password, and avatar are mandatory under US-01; username and email must be unique; email format must be valid. US-01 additionally requires automatic sign-in after registration, **which is not satisfied by the sample response alone**. Decide whether registration returns a JWT or the frontend calls login immediately. The previously reviewed backend did not include `avatar_id` in registration; implementation changes are required. Suggested errors: `409` for duplicate username/email, `422` for invalid fields.

### 3.2 `POST /auth/login`

**Purpose:** Authenticate with username **or email** and password (US-02).  

**Auth:** Public.  

**Content-Type:** `application/x-www-form-urlencoded`.

```text

username=ahmed_ali&password=examplePassword

```

**`200` response:**

```json

{

  "access_token": "<jwt>",

  "token_type": "bearer"

}

```

**Rules:** Return a generic invalid-credentials error without disclosing account existence. If login followed an NFC scan, the frontend should preserve the intended tag destination and navigate back to it after login; never blindly trust an arbitrary external redirect URL. The prior implementation issued seven-day JWTs; confirm the intended lifetime and refresh strategy.

### 3.3 `POST /auth/logout`

**Purpose:** End the client session.  

**Auth:** User.  

**Request body:** None.

**`200` response:**

```json

{ "message": "Successfully logged out." }

```

**Limitation:** The previously reviewed backend did not revoke JWTs server-side. The frontend must discard its token; server-side revocation requires a separate design.

### 3.4 `POST /auth/change-password`

**Purpose:** Change password.  

**Auth:** User.  

**Content-Type:** JSON.

```json

{

  "old_password": "oldPassword",

  "new_password": "newPassword"

}

```

**`200` response:**

```json

{ "message": "Password changed successfully" }

```

**Errors:** `400` for incorrect old password; `401` for invalid authentication; `422` for invalid fields.

### 3.5 `DELETE /auth/delete-account`

**Purpose:** Delete authenticated account.  

**Auth:** User.  

**Request body:** None.

**`200` response:**

```json

{ "message": "Account deleted successfully" }

```

**Open question:** Define what happens to owned packages, gameplay records, and purchases before enabling this in production.

### 3.6 `GET /users/me`

**Purpose:** Retrieve current profile.  

**Auth:** User.  

**Request body:** None.

**`200` response (illustrative):**

```json

{

  "id": "user_42",

  "name": "Ahmed Ali",

  "username": "ahmed_ali",

  "email": "ahmed@example.com",

  "phone_number": "512345678",

  "avatar_id": "avatar_03"

}

```

**Note:** `avatar_id` is planned from US-01, not confirmed in the existing API. Password hashes must never be returned.

### 3.7 `PATCH /users/me`

**Purpose:** Update editable profile fields.  

**Auth:** User.  

**Content-Type:** JSON; all fields optional.

```json

{

  "name": "Ahmed Mohammed",

  "username": "ahmed_m",

  "phone_number": "598765432"

}

```

**`200` response:** Updated user profile in the same shape as `GET /users/me`.  

**Rules:** Enforce username uniqueness; the previously reviewed implementation did not support changing email. Avatar updates need explicit confirmation.

### 3.8 `GET /` and `GET /health/`

**Purpose:** Basic operational checks.  

**Auth:** Public.  

**Request body:** None.

Example responses from the previously reviewed backend:

```json

{ "message": "System is running. Database connected!" }

```

```json

{ "status": "ok", "message": "Raccon APIs is running!" }

```

## 4. Package purchase, claiming, and ownership

### 4.1 `GET /api/package-options`

**Purpose:** Display package purchase options and their Ramz links.  

**Auth:** Public.  

**Query:** None initially.  

**`200` response:**

```json

{

  "options": [

    {

      "option_id": "option_20_open",

      "name": "20-tag Open Hunt",

      "mode": "open_hunt",

      "tag_count": 20,

      "store_url": "https://<ramz-store>/<product>"

    }

  ]

}

```

**Note:** Product catalog shape and store URL source are not specified in the story.

### 4.2 `POST /api/packages/claim`

**Purpose:** Associate a purchased package with the authenticated owner using the master authorization link/token.  

**Auth:** User.  

**Content-Type:** JSON.

```json

{ "claim_token": "<single-use-claim-token>" }

```

**`200` response:**

```json

{

  "package_id": "pkg_123",

  "name": "Untitled",

  "mode": "open_hunt",

  "tag_count": 20,

  "status": "unconfigured",

  "owner_id": "user_42"

}

```

**Rules:** Validate token authenticity, expiry, and package association; reject claims for packages already owned by another account. Suggested errors: `401`, `404`, `409`. Delivery of the master authorization link by email or within Raccon is not specified yet.

### 4.3 `GET /api/packages`

**Purpose:** List packages belonging to the authenticated owner (US-03).  

**Auth:** Owner.  

**Query:** Optional `page`, `page_size` (pagination is planned, not required by story).

**`200` response:**

```json

{

  "packages": [

    {

      "package_id": "pkg_123",

      "name": "Untitled",

      "mode": "open_hunt",

      "tag_count": 20,

      "status": "configured"

    }

  ]

}

```

### 4.4 `GET /api/packages/{package_id}`

**Purpose:** Retrieve one owned package (US-03).  

**Auth:** Owner.  

**Path:** `package_id` required.  

**`200` response:**

```json

{

  "package_id": "pkg_123",

  "name": "Campus Hunt",

  "mode": "open_hunt",

  "tag_count": 20,

  "status": "configured"

}

```

**Rules:** Only owner can access. Package ID, mode, tag count, and status are not editable through package-info updates.

### 4.5 `PATCH /api/packages/{package_id}`

**Purpose:** Rename an owned package (US-03).  

**Auth:** Owner.  

**Content-Type:** JSON.

```json

{ "name": "Campus Hunt" }

```

**`200` response:**

```json

{ "package_id": "pkg_123", "name": "Campus Hunt" }

```

**Rules:** `name` maximum 20 characters; duplicates permitted; rename at any time; renaming does **not** consume a customization edit. No other fields accepted. Suggested errors: `403`/`404`, `422`.

## 5. Package customization

**To Do model:** The owner edits a **draft** configuration. Individual draft changes do not consume an edit. `configuration/save` commits the entire draft. Initial commit consumes zero of the three allowed post-initial editing sessions; subsequent commits with actual changes consume one each. This draft workflow is a design proposal to satisfy US-04–06, not a specified implementation.

### 5.1 `GET /api/packages/{package_id}/configuration`

**Purpose:** Load tag list, saved/draft configurations, settings, and remaining edits (US-04–08).  

**Auth:** Owner.  

**Path:** `package_id`.  

**`200` response:**

```json

{

  "package_id": "pkg_123",

  "mode": "open_hunt",

  "status": "configured",

  "edits_used": 1,

  "edits_remaining": 2,

  "settings": {

    "hashing_enabled": false,

    "timer_enabled": true,

    "duration_seconds": 3600,

    "tags_left_enabled": true

  },

  "tags": [

    {

      "tag_id": "tag_01",

      "number": 1,

      "configured": true,

      "hint_text": "Look under the old tree.",

      "image_id": null,

      "points": 1,

      "trap": null

    }

  ]

}

```

**Rules:** Return all tags in ascending order. Whether to return saved and draft versions separately requires a team decision. Frontend handles selected-circle/hover UI.

### 5.2 `PUT /api/packages/{package_id}/tags/{tag_id}`

**Purpose:** Save an individual tag's **draft** configuration (US-04,05,07).  

**Auth:** Owner.  

**Content-Type:** JSON.  

**Path:** `package_id`, `tag_id`.

**Normal tag:**

```json

{

  "hint_text": "Look under the old tree.",

  "image_id": "img_456",

  "points": 1,

  "trap": null

}

```

**Freeze trap:**

```json

{

  "hint_text": "You found a trap!",

  "image_id": null,

  "trap": { "type": "freeze", "duration_seconds": 60 }

}

```

**Boom trap:**

```json

{

  "trap": { "type": "boom", "deduction": 1 }

}

```

**Choose trap:**

```json

{

  "trap": { "type": "choose" }

}

```

**`200` response:**

```json

{ "tag_id": "tag_01", "draft_saved": true }

```

**Rules:** `hint_text` optional, 0–255 characters; `image_id` optional; at most one trap type per tag; traps only for Open Hunt. Boom deduction is one point under US-07. The exact Freeze range is **unresolved** in US-07; Open Hunt tag-point limits are also **unresolved**. Define whether `PUT` replaces all fields (as REST convention suggests) or switch to `PATCH` for partial draft edits. Drafts must not affect live gameplay until committed.

### 5.3 `POST /api/packages/{package_id}/images`

**Purpose:** Upload a tag image (US-05).  

**Auth:** Owner.  

**Content-Type:** `multipart/form-data`.  

**Form field:** `file` (binary JPG, PNG, or WEBP, maximum 5 MB).

**`201` response:**

```json

{

  "image_id": "img_456",

  "image_url": "https://<media-host>/images/img_456.webp"

}

```

**Rules:** Validate real file type and size server-side. Invalid replacement uploads must leave the previously saved image unchanged. Suggested errors: `413`, `415`, `422`. Storage provider and URL format are implementation details.

### 5.4 `PUT /api/packages/{package_id}/settings`

**Purpose:** Update draft package-wide behavior (US-08 and Timer).  

**Auth:** Owner.  

**Content-Type:** JSON.

```json

{

  "hashing_enabled": true,

  "timer_enabled": true,

  "duration_seconds": 3600,

  "tags_left_enabled": true

}

```

**`200` response:**

```json

{ "draft_saved": true }

```

**Rules:** Settings apply to the **whole package**, not an individual tag; independent toggles default to disabled; duration required when timer enabled. Timer expiration prevents successful scans and game-state changes. Timer start event and permissible duration range are **not specified** in the stories. The hash setting's planned protection must not be described as proof of physical NFC contact.

### 5.5 `POST /api/packages/{package_id}/configuration/save`

**Purpose:** Commit all pending tag/settings draft changes (US-04,06–08).  

**Auth:** Owner.  

**Request body:** None (or a draft version identifier if concurrency control is adopted).

**`200` response:**

```json

{

  "package_id": "pkg_123",

  "status": "configured",

  "edits_used": 1,

  "edits_remaining": 2

}

```

**Rules:** Initial save does not consume an edit. A later save with real changes consumes **one** package edit, regardless of number of changed tags. No-op saves and discarded changes consume zero. Once three post-initial edits are used, customization is read-only but renaming remains available. Commit must be atomic; do not partially activate traps/settings. Suggested error: `409` when edit limit reached or another save conflicts.

### 5.6 Preview (US-09)

**No backend endpoint planned.** The frontend can render unsaved tag settings directly in its mobile preview, without writing data or consuming an edit. If server-rendered preview is later required, it should be added explicitly as a separate non-mutating operation.

## 6. NFC gameplay

### 6.1 `POST /api/packages/{package_id}/tags/{tag_id}/scan`

**Purpose:** Process an authenticated scan, validate rules, apply effects, and return the display result (US-10–14).  

**Auth:** Player.  

**Path:** `package_id`, `tag_id`.  

**Content-Type:** JSON.

**To Do request:**

```json

{ "tag_access_token": "<optional-access-proof>" }

```

`tag_access_token` is optional if link protection is disabled. The user stories specify a username-derived hash in a tag link, but do **not** specify a secure mechanism for proving that a physical scan occurred. A hash or bearer link alone can be copied; the exact protocol must be threat-modeled before implementation.

**`200` sequential success:**

```json

{

  "result": "success",

  "mode": "sequential",

  "tag_number": 5,

  "content": {

    "hint_text": "Look under the old tree.",

    "image_url": null

  },

  "progress": {

    "highest_tag": 5,

    "tags_left": 15

  },

  "time_remaining_seconds": 1800

}

```

**`200` Open Hunt claim:**

```json

{

  "result": "claimed",

  "mode": "open_hunt",

  "tag_number": 5,

  "points_awarded": 2,

  "total_score": 12,

  "content": {

    "hint_text": "You found it!",

    "image_url": null

  }

}

```

`points_awarded` here illustrates configured points plus the **one extra first-claim point** in US-12; the tag's base-point policy is not finalized.

**`200` already claimed:**

```json

{

  "result": "already_claimed",

  "points_awarded": 0,

  "message": "This tag has already been claimed."

}

```

**`200` Freeze activation or repeat during Freeze:**

```json

{

  "result": "frozen",

  "trap": {

    "type": "freeze",

    "remaining_seconds": 50

  },

  "points_awarded": 0

}

```

**`200` Boom activation:**

```json

{

  "result": "boom",

  "trap": {

    "type": "boom",

    "points_deducted": 1

  },

  "total_score": 8

}

```

**`200` expired timer:**

```json

{

  "result": "experience_ended",

  "message": "This experience has ended."

}

```

**Rules:**

1\. Require authenticated user; return the player to the scanned tag after login if needed.

2\. Resolve tag and package, validate ownership of the tag by the package, and validate any enabled link binding.

3\. Enforce experience expiration **before** awarding points, changing progress, claiming tags, or activating traps.

4\. If the player is frozen, return the **existing** remaining countdown for attempted scans; do not restart it or change score/progress.

5\. Sequential success updates player progress. The exact out-of-order scan rule is **not fully specified** in Stage 3.

6\. In Open Hunt, the first player to successfully scan an **unclaimed normal tag** claims it and receives its points plus one extra point. Subsequent scans by anyone award zero points.

7\. Trap tags are **never claimed**; their effects are player-specific. Re-scanning a Freeze tag during an existing freeze returns the same decreasing timer.

8\. Boom deducts the configured amount, with score clamped at zero. Repeated Boom-trigger eligibility/cooldown requires final rules.

9\. Return only enabled optional fields (`tags_left`, remaining playtime).

10\. Ensure concurrent scans of one unclaimed tag cannot both receive the first-claim reward; implement atomic state changes in the persistence layer.

**Possible errors:** `401` unauthenticated, `403` invalid tag access binding, `404` unknown tag/package, `409` conflicting game state. Choose consistently whether gameplay denials are typed `200` results or non-2xx errors.

### 6.2 `POST /api/packages/{package_id}/tags/{tag_id}/choose-trap`

**Purpose:** Let a player select/configure a trap after interacting with a Choose tag (US-07).  

**Auth:** Player.  

**Content-Type:** JSON.

```json

{

  "trap_type": "freeze",

  "duration_seconds": 60

}

```

**`200` response:**

```json

{

  "result": "trap_configured",

  "tag_id": "tag_05",

  "trap_type": "freeze"

}

```

**Status: provisional.** Stage 3 mentions Freeze, Boom, and Take Points, but does not fully specify when a player may choose, whether a choice affects the current player or subsequent players, or the exact repeated-use rules. These rules must be finalized before this endpoint is implemented. The backend must verify that the player is eligible to choose for that tag; it must not accept arbitrary tag reconfiguration.

### 6.3 `GET /api/packages/{package_id}/play-state`

**Purpose:** Restore current player state when refreshing the page or revisiting a tag (US-12–14, Timer).  

**Auth:** Player.  

**Query:** None.

**`200` response:**

```json

{

  "package_id": "pkg_123",

  "mode": "open_hunt",

  "score": 12,

  "highest_sequential_tag": null,

  "freeze_remaining_seconds": 50,

  "time_remaining_seconds": 1800,

  "tags_left": 15,

  "experience_ended": false

}

```

**Rules:** Return values applicable to the selected mode and enabled options. Remaining times should be calculated from authoritative timestamps, not decremented only in browser memory. This endpoint is planned to support persistence and recovery; it is not explicitly named in the stories.

## 7. Leaderboard

### 7.1 `GET /api/packages/{package_id}/leaderboard`

**Purpose:** Show ranked players for the current experience (US-15).  

**Auth:** Player.  

**Query:** Optional `limit`, `offset` if pagination is needed.

**`200` response:**

```json

{

  "mode": "open_hunt",

  "current_player_id": "user_42",

  "players": [

    {

      "rank": 1,

      "user_id": "user_42",

      "username": "ahmed",

      "score": 25

    },

    {

      "rank": 2,

      "user_id": "user_17",

      "username": "sara",

      "score": 20

    }

  ]

}

```

**Rules:** Open Hunt ranking uses total successfully earned points adjusted by traps. Sequential ranking uses the highest successfully scanned sequential tag; in that mode the numeric field should be renamed to `highest_tag` or a neutral `value` rather than `score`. Frontend highlights the current player. Ties and refresh strategy remain to be specified.

## 8. Admin and store integration — **To Do — needs requirements**

The admin story has no acceptance criteria, and the purchase integration lacks a finalized provider contract. The following are **placeholders** and should not be treated as an approved implementation specification.

### 8.1 `POST /api/admin/packages`

**Purpose:** Register/generate a physical package for NFC production.  

**Auth:** Admin.  

**To Do JSON request:**

```json

{ "mode": "sequential", "tag_count": 20 }

```

**Illustrative `201` response:**

```json

{ "package_id": "pkg_123", "status": "unclaimed" }

```

**Open:** Package creation permissions, unique ID generation, master-link lifecycle, physical provisioning process.

### 8.2 `GET /api/admin/packages/{package_id}/tags`

**Purpose:** Retrieve tag identifiers/URLs for the NFC programming station.  

**Auth:** Admin.  

**`200` response:**

```json

{

  "package_id": "pkg_123",

  "tags": [

    { "tag_id": "tag_01", "number": 1, "nfc_url": "https://<frontend-host>/t/<opaque-tag-token>" }

  ]

}

```

**Security:** Provisioning URLs/tokens should be access-controlled. URL scheme and anti-sharing design are unresolved.

### 8.3 `GET /api/admin/users`

**Purpose:** List registered users (incomplete admin story).  

**Auth:** Admin.  

**Query:** Optional `page`, `page_size`.  

**`200` response:**

```json

{

  "users": [

    { "id": "user_42", "username": "ahmed", "email": "ahmed@example.com" }

  ]

}

```

**Open:** Admin roles, permitted user fields, filtering, and audit logging.

### 8.4 `POST /api/webhooks/purchases`

**Purpose:** Receive purchase confirmation from Ramz/store platform and begin the package-claim workflow.  

**Auth:** Verified provider webhook signature or equivalent authentication, **not** a user JWT.  

**Content-Type:** Provider-specific, likely JSON.

**Illustrative normalized payload only (not a verified Ramz schema):**

```json

{

  "event_id": "evt_123",

  "event_type": "order.paid",

  "order_id": "order_456",

  "product_id": "option_20_open"

}

```

**Illustrative `200` response:**

```json

{ "received": true }

```

**Rules:** Verify source authenticity, deduplicate repeated webhook deliveries, and only provision/associate packages for qualifying paid orders. Final path, headers, signature verification, and payload fields depend on the actual provider's documentation.

## 9. External integrations (not internal REST endpoints)

| Integration | To Do use | Status/qualification |
|---|---|---|
| Axiom | Centralized application logs | Optional integration noted in previously reviewed backend |
| Upstash Redis | Optional live leaderboard/short-lived game state | Planned; assess whether PostgreSQL alone is sufficient |
| Cloudflare R2 | Store tag images/media | Planned |
| Ramz/store provider | Package catalog, orders, purchase events | Provider/API details unresolved |
| GitHub Actions | CI/CD automation | Deployment tool, not a runtime gameplay API |

## 10. Traceability summary

| User story | API coverage |
|---|---|
| US-01 Registration | `POST /auth/register`, `GET /users/me` |
| US-02 Login | `POST /auth/login`, `POST /auth/logout` |
| Claiming a Package | `GET /api/package-options`, `POST /api/packages/claim`, purchase webhook candidate |
| US-03 Purchased Packages | `GET /api/packages`, `GET/PATCH /api/packages/{package_id}` |
| US-04 Package Customization | `GET .../configuration`, `PUT .../tags/{tag_id}`, `POST .../configuration/save` |
| US-05 Tag Content | `PUT .../tags/{tag_id}`, `POST .../images` |
| US-06 Edit Limit | `GET .../configuration`, `POST .../configuration/save` |
| US-07 Open Hunt Traps | `PUT .../tags/{tag_id}`, `POST .../scan`, `POST .../choose-trap` |
| US-08 Package Settings | `PUT .../settings`, `POST .../configuration/save` |
| Timer | `PUT .../settings`, `POST .../scan`, `GET .../play-state` |
| US-09 Preview | Frontend-only; no endpoint required |
| US-10 Scan | `POST .../scan` |
| US-11 Hashed Tag | Access verification within `POST .../scan`; mechanism unresolved |
| US-12 Scan Results | `POST .../scan`, `GET .../play-state` |
| US-13 Freeze | `POST .../scan`, `GET .../play-state` |
| US-14 Boom | `POST .../scan`, `GET .../play-state` |
| US-15 Leaderboard | `GET .../leaderboard` |

---
