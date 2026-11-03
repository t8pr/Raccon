# Raccon Frontend

Web app for **Raccon**, an NFC treasure-hunt kit. Players register, buy or claim a kit, set it up, and scan NFC pieces during the game. Admins manage experiences. The whole UI is Arabic and right-to-left.

> **Stack:** React 19 · Create React App (react-scripts 5) · React Router v7 · TanStack Query v5 · Zod v4 · Radix UI · lucide-react · plain CSS with design tokens · Thmanyah fonts · Docker (Node 20)

**Contents**

1. [Architecture & data flow](#1-frontend-architecture--data-flow)
2. [Directory & file structure](#2-directory--file-structure)
3. [Backend connection & API integration](#3-backend-connection--api-integration)
4. [Onboarding & contribution guide](#4-onboarding--contribution-guide)
5. [Known gaps & gotchas](#5-known-gaps--gotchas)

**If you're coming from the backend**, here's how the concepts map:

| Backend idea | Frontend equivalent here |
|---|---|
| `main.py` app setup | `src/index.js` (providers) + `src/app/App.js` (routes) |
| Router / URL table | `<Routes>` in `App.js` |
| `Depends(get_current_user)` | `<ProtectedRoute>` / `<AdminRoute>` wrappers + `useAuth()` |
| Repository / HTTP client | `src/api/**` functions on top of `apiRequest()` |
| Pydantic schemas | Zod schemas in `src/utils/validation.js` |
| Cache / session | TanStack Query cache + `localStorage` token |
| Jinja templates | JSX components (`src/components`, `src/pages`) |

---

## 1. Frontend architecture & data flow

### 1.1 Core setup

- **Create React App (CRA)** with `react-scripts` 5. Webpack, Babel, ESLint and Jest are preconfigured and hidden. There is no Vite or Next.js.
- **Client-side rendering only (SPA).** The server sends `public/index.html` with an empty `<div id="root">`, and React renders everything in the browser. There's no SSR or static generation.
- **Plain JavaScript (`.js` / `.jsx`)**, no TypeScript. Zod provides the runtime type checking.
- **Styling:** global CSS files imported in JavaScript. No CSS modules, Tailwind or styled-components. Colours, spacing and radii come from CSS variables in `styles/global.css` (see §4.4).

### 1.2 Boot sequence and provider tree

```
public/index.html  <div id="root">
        │
src/index.js
  ├─ import "./styles/global.css"          ← tokens, fonts, all shared styles
  └─ <React.StrictMode>
       <QueryClientProvider client={queryClient}>   ← TanStack Query cache (server state)
         <App />                                    ← src/app/App.js
src/app/App.js
  <BrowserRouter>                                   ← React Router (URL ↔ page)
    <AuthProvider>                                  ← token + current user (context)
      <AppContent>
        <main className={isAuthPage ? "" : "main-content"}>
          <Routes> … one <Route> per page … </Routes>
```

The order matters: `AuthProvider` uses `useQueryClient()`, so it must sit inside `QueryClientProvider`, and pages use `useNavigate()`, so they must sit inside `BrowserRouter`.

### 1.3 Routing (React Router v7)

All routes live in **`src/app/App.js`**.

| Path | Page component | Guard | Notes |
|---|---|---|---|
| `/` | redirects to `/register` | — | |
| `/register` | `pages/auth/RegisterPage` | public | Registers, then logs in automatically |
| `/login` | `pages/auth/LoginPage` | public | Reads `?redirect_tag` and `?redirect_user` (NFC flow) |
| `/forgot-password` | `pages/auth/ForgotPasswordPage` | public | |
| `/reset-password` | `pages/auth/ResetPasswordPage` | public | Reads `?token=` from the email link |
| `/home` | `pages/Home/HomePage` | `ProtectedRoute` | Bento home; content changes by `user.role` |
| `/profile` | `pages/Profile/ProfilePage` | `ProtectedRoute` | Edit profile, change password, delete account |
| `/store` | `pages/Store/StorePage` | public | Kits catalog (static data) |
| `/packages` | `pages/Packages/PackagesPage` | `ProtectedRoute` | "التجارب": the user's kits |
| `/customization`, `/customization/:packageId` | `pages/Customization/CustomizationPage` | `ProtectedRoute` | **Placeholder** (navbar only) |
| `/claim/:masterAuthHash` | `pages/Claim/ClaimPage` | public (handles guests itself) | Claim a kit by its master link |
| `/scan` | `pages/journey/ScanPage` | `ProtectedRoute` | `?tag=…&user=…`, scans automatically on load |
| `/admin/experiences` | `pages/Admin/Experiences/AdminExperiencesPage` | `AdminRoute` | List with filter, search, sort and pagination |
| `/admin/experiences/new` | `…/CreateExperiencePage` | `AdminRoute` | Create |
| `/admin/experiences/:id/edit` | `…/CreateExperiencePage` | `AdminRoute` | Same component in edit mode |

**Route guards:**

- **`ProtectedRoute`** (`pages/auth/ProtectedRoute.jsx`):
  - While the session is being restored, it shows "جاري التحميل...".
  - If restoring failed (network error), it shows a retry button.
  - With no token or user, it redirects to `/login`. For `/scan?tag=…`, it keeps the tag: `/login?redirect_tag=…&redirect_user=…`.
- **`AdminRoute`** (`pages/Admin/AdminRoute.jsx`) is `ProtectedRoute` plus a check for `user.role === "admin"`. Anyone else goes to `/home`.

> These guards only control the UI. The backend enforces permissions on its own (401/403), so never rely on a guard for security.

`AppContent` reads `location.pathname`. On the auth pages (`/register`, `/login`, `/forgot-password`, `/reset-password`) `<main>` gets no class, so those pages use their own full-screen layout. Every other page gets `.main-content`.

### 1.4 State management: four kinds of state, four tools

| Kind | Tool | Examples |
|---|---|---|
| **Server state** (data from the API) | **TanStack Query**: `useQuery` / `useQueries` / `useMutation` | profile (`["profile", token]`), pack preview, my events |
| **Auth / session** (global) | **React Context**: `AuthContext` + `localStorage` | access token, current `user`, `signIn`, `clearSession` |
| **UI state** (one component) | `useState`, `useRef`, `useMemo` | form values, dialog open, filter, current page |
| **Browser persistence** | `localStorage` / `sessionStorage` through `utils/` | test purchases per user, return-to-claim path |

There's **no Redux or Zustand**. If a value comes from the server, use TanStack Query. If many unrelated components need it, use Context. Otherwise keep it local.

**Query keys in use.** Reuse these exact keys, because pages share cache entries through them.

| Key | Fetches | Used in |
|---|---|---|
| `["profile", accessToken]` | `GET /users/me` | `AuthContext` |
| `["pack-preview", hash, userId \| "guest"]` | `GET /packs/preview/{hash}` | `ClaimPage`, `PackagesPage` |
| `["claim-events", userId, packId]` | `GET /events` | `ClaimPage` |
| `["my-events", userId]` | `GET /events` | `PackagesPage` (invalidated after a claim) |
| `["pack-info", userId, packId]` | (set manually after a claim) | `ClaimPage` → `PackagesPage` |
| `["local-purchases", userId]` | `localStorage` (not HTTP) | `StorePage`, `PackagesPage` |

**Browser storage keys:**

| Key | Storage | Written by | Purpose |
|---|---|---|---|
| `raccoon_access_token` | localStorage | `AuthContext.signIn` | JWT for `Authorization: Bearer` |
| `raccoon:local-purchases:v1:<userId>` | localStorage | `utils/localPurchases.js` | Kits "bought" in the store demo (there's no payment backend yet) |
| `raccoon_claim_return` | sessionStorage | `utils/claimReturn.js` | Brings a guest back to `/claim/…` after login or register (1-hour limit) |

### 1.5 Auth flow (`context/AuthContext.jsx`)

```
App start
  token = localStorage["raccoon_access_token"]
  if token → useQuery(["profile", token]) → GET /users/me
               ├─ pending        → isRestoring = true   (guards show loading; LoginPage renders nothing)
               ├─ 200            → user = data          (role drives admin vs user UI)
               ├─ 401 / 403      → clearSession()       (token removed → user = null)
               └─ other error    → restoreError message (guards show retry)

Login / Register page
  loginUser() → { access_token } → getCurrentUser(token) → signIn(token, profile) → navigate

Logout (AppNavbar)
  logoutUser(token) → clearSession() → navigate("/login")
```

`useAuth()` returns `{ accessToken, user, isRestoring, restoreError, signIn, clearSession, updateUser, markAccountDeleted }`. It throws if it's used outside `AuthProvider`.

### 1.6 Component hierarchy

```
pages/  (one per route: fetch data, own state, handle navigation)
  └─ components/layout/   app chrome: AppNavbar, AuthLayout, AuthNavbar, AuthPromo
  └─ components/auth/     auth forms & screens: LoginForm, RegisterForm, …
  └─ components/ui/       reusable, dumb building blocks: Button, Chip, AuthField, Pagination, …
```

- **Pages** are "smart": they call APIs (through `useQuery` / `useMutation` or `async` handlers), decide where to navigate, and pass data down.
- **`components/ui`** are "dumb": they get everything through props and never call the API. Keep them that way so they stay reusable.
- **Forms** (`components/auth/*Form.jsx`) validate locally with Zod, then call an `onSubmit` / `onLogin` prop. The page does the network call and passes `serverError` back down.

### 1.7 Typical data flow (example: claiming a kit)

```
URL /claim/q8Zr…  ─► ClaimPage
   1. claimHashSchema.safeParse(hash)                       (Zod: reject bad links without calling the API)
   2. useQuery(["pack-preview", …]) → previewPack()          → GET /packs/preview/{hash}
   3. guest? → rememberClaimReturn("/claim/q8Zr…") → /login → after login takeClaimReturn() → back here
   4. useMutation(claimPack) → POST /packs/claim
        onSuccess: setQueryData(preview) + invalidate ["my-events", userId]
   5. useQuery(["claim-events"]) → find the event for this pack → "customize" button
```

---

## 2. Directory & file structure

```
frontend/raccoon/
├── Dockerfile               # node:20-alpine → npm install → npm start (port 8080)
├── .dockerignore            # keeps node_modules/build/.git out of the image
├── .env                     # committed, non-secret: HOST, PORT, REACT_APP_API_URL
├── .gitignore               # CRA default (node_modules, build, .env.*.local)
├── package.json             # deps + scripts (start/build/test)
├── package-lock.json        # exact dependency tree; commit it with dependency changes
├── README.md                # this file
├── public/                  # copied as-is into the build
│   ├── index.html           # HTML shell with <div id="root">
│   ├── favicon.ico  logo192.png  logo512.png  manifest.json  robots.txt
└── src/
    ├── index.js             # entry: global CSS + QueryClientProvider + <App/>
    ├── app/App.js           # router, AuthProvider, all routes
    ├── api/                 # every backend call
    ├── context/             # React Context (auth)
    ├── pages/               # one folder per route/feature
    ├── components/          # reusable UI (auth, layout, ui)
    ├── utils/               # validation (Zod) + browser-storage helpers
    ├── styles/              # global.css + per-page CSS
    ├── assets/              # fonts, logo, avatars, images
    ├── reportWebVitals.js   # CRA perf hook (unused)
    ├── setupTests.js        # jest-dom matchers for tests
    ├── App.test.js          # CRA sample test (broken, see §5)
    └── logo.svg             # CRA leftover (unused)
```

### 2.1 Entry & app

| File | Role | Imports / calls |
|---|---|---|
| `src/index.js` | Creates the `QueryClient` and renders `<App/>` inside `StrictMode` and `QueryClientProvider`. Imports **`global.css` once for the whole app**. | `@tanstack/react-query`, `app/App`, `styles/global.css`, `reportWebVitals` |
| `src/app/App.js` | `BrowserRouter` → `AuthProvider` → `AppContent` (`<main>` + `<Routes>`). The single source of truth for URLs and guards. | every page in `pages/`, `ProtectedRoute`, `AdminRoute`, `AuthProvider` |

### 2.2 `src/api/`: backend calls

There's one file per backend area. Each function returns a Promise of the parsed JSON, or throws an error with `.status` and `.detail`.

| File | Exports | Endpoint(s) | Used by |
|---|---|---|---|
| `apiClient.js` | `apiRequest(path, options, errorMessage)` | — (the shared wrapper, see §3.2) | every file below |
| `auth/authApi.js` | `registerUser`, `loginUser`, `logoutUser`, `changePassword`, `deleteAccount`, `requestPasswordReset`, `resetPassword` | `/auth/*` | Register/Login/Forgot/Reset pages, `AppNavbar`, `ProfilePage` |
| `users/usersApi.js` | `getCurrentUser`, `updateProfile` | `GET/PATCH /users/me` | `AuthContext`, Login/Register, `ProfilePage` |
| `packs/packsApi.js` | `previewPack`, `claimPack` (both validate the hash with Zod first) | `/packs/preview/{hash}`, `/packs/claim` | `ClaimPage`, `PackagesPage` |
| `events/eventsApi.js` | `getMyEvents` | `GET /events` | `ClaimPage`, `PackagesPage` |
| `journeyApi.js` | `scanTagData(tagHash, userHash, token)` | `POST /journey/scan` | `ScanPage` (uses raw `fetch`, not `apiRequest`) |
| `authApi.js` | `registerUser`, `loginUser`, `logoutUser`, `getCurrentUser` | `/auth/*`, `/users/me` | **Nobody: legacy duplicate** of `auth/authApi.js`. Don't import it. |

### 2.3 `src/context/`

| File | Role |
|---|---|
| `AuthContext.jsx` | `AuthProvider` + `useAuth()`. Keeps the token in `localStorage`, loads the user with TanStack Query, clears the session on 401/403, and exposes `signIn`, `clearSession`, `updateUser` (writes the new profile into the cache) and `markAccountDeleted`. Calls `api/users/usersApi.getCurrentUser`. |

### 2.4 `src/pages/`: one folder per feature

| File | What it does | Main imports |
|---|---|---|
| `auth/RegisterPage.jsx` | Calls `registerUser`, then logs in automatically (`loginUser` → `getCurrentUser` → `signIn`), then shows `RegisterWelcome` or goes back to a pending claim. Maps 400 to "username/email taken" and 422 `detail[]` to per-field errors. | `RegisterForm`, `RegisterWelcome`, `AuthLayout`, `AuthPromo`, `DehmScan`, `authApi`, `usersApi`, `claimReturn` |
| `auth/LoginPage.jsx` | Logs in, then goes to `/scan?…` (when `redirect_tag` is set), the pending claim, or `/home`. If already signed in, it redirects straight away. **Renders `null` while `isRestoring`.** | `LoginForm`, `AuthLayout`, `AuthPromo`, `DehmScan`, `authApi`, `usersApi`, `claimReturn` |
| `auth/ForgotPasswordPage.jsx` | Sends the reset email and shows an `AuthStatus` confirmation. | `ForgotPasswordForm`, `AuthStatus`, `authApi.requestPasswordReset` |
| `auth/ResetPasswordPage.jsx` | Reads `?token`, posts the new password, then goes to `/login` with a "password changed" notice. | `ResetPasswordForm`, `AuthStatus`, `authApi.resetPassword` |
| `auth/ProtectedRoute.jsx` | Auth guard (§1.3). | `useAuth`, router |
| `Admin/AdminRoute.jsx` | Admin guard: `ProtectedRoute` + role check. | `ProtectedRoute`, `useAuth` |
| `Admin/Experiences/AdminExperiencesPage.jsx` | Store-style admin list: mode chips (`FilterBar`), search, status select, `SortButton`, `Pagination` (9 per page on laptop, 4 on phone ≤ 767px), empty state, success notice from `location.state`. | `AppNavbar`, `AdminExperienceCard`, `FilterBar`, `SortButton`, `Pagination`, `InlineMessage`, `ExperiencesData` |
| `Admin/Experiences/CreateExperiencePage.jsx` | Create **and** edit (`:id`). Two cards (info + pack). Validation: name required and ≤ 25 characters, place required to publish, pieces 3–30 with a stepper. Actions: أنشئ / حفظ كمسودة / إلغاء (with a `<dialog>` confirm). | `AppNavbar`, `Button`, `ExperiencesData` |
| `Admin/Experiences/ExperiencesData.js` | **In-memory dummy data** (the store packages plus extras) with `getExperiences`, `addExperience`, `getExperience`, `updateExperience`. Resets on page reload. Replace it with API calls when the backend is ready. | `Store/packages` |
| `Claim/ClaimPage.jsx` | Full claim flow (§1.7): validate the hash, preview, guest → login/register with a return path, claim mutation with a double-submit lock, find the event. | `packsApi`, `eventsApi`, `validation`, `claimReturn`, `Button`, `Chip`, `InlineMessage` |
| `Home/HomePage.jsx` | Bento hero (NFC coil + Dehem) + 2 side cards + 2 bottom cards. A `homeContent` object switches between `user` and `admin` content based on `user.role`. | `AppNavbar`, `NfcCoil`, `useAuth`, `HomePage.css` |
| `Packages/PackagesPage.jsx` | "التجارب": the user's kits = local purchases + a live `previewPack` for each one (`useQueries`) + `getMyEvents`. Shows a status per kit (pending, linked, other account, draft, paused, live). Lets you rename locally. Syncs across tabs through the `storage` event. | `localPurchases`, `packsApi`, `eventsApi`, `FilterBar`, `Chip`, `Button` |
| `Profile/ProfilePage.jsx` | Edit name, username, phone and avatar, change password, delete account. Uses Radix `Dialog` modals and a single `useMutation` keyed by `kind`. | `usersApi.updateProfile`, `authApi.changePassword/deleteAccount`, `validation.getProfileSchema`, `CharacterPicker`, `AuthField` |
| `Store/StorePage.jsx` | Catalog with filter, sort, details dialog and confirm. "Buying" writes a **local purchase** (no payment) and then goes to `/packages`. | `packages.js`, `localPurchases`, `PackageCard`, `FilterBar`, `SortButton` |
| `Store/packages.js` | Static catalog: 6 kits with title, pieces, mode, price, `claimHash`, etc. | — |
| `Store/testClaims.js` | Placeholder test claim hashes, only in development. | — |
| `Customization/CustomizationPage.jsx` | Placeholder that renders only the navbar. | `AppNavbar` |
| `journey/ScanPage.jsx` | Reads `?tag` and `?user`, calls `scanTagData` on mount, and shows the result (clue hint or image, trap effect, score) or the backend's `detail` message. | `journeyApi`, `AppNavbar`, `InlineMessage`, `Button` |

### 2.5 `src/components/`

**`layout/`: page chrome**

| File | Role | Uses |
|---|---|---|
| `AppNavbar.jsx` | Top navbar for signed-in pages. Picks links by role (`navigationByRole.user` / `.admin`), shows the avatar and name, and handles logout. | `Navbar`, `ProfileMenu`, `useAuth`, `authApi.logoutUser`, `avatarImages`, `Mark.png` |
| `AuthLayout.jsx` | Two-column auth shell: form + promo, with tabs. | `AuthNavbar`, `AuthTabs` |
| `AuthNavbar.jsx` | Logo bar on auth pages. | `Mark.png` |
| `AuthPromo.jsx` | Animated side panel (desktop) or title (mobile) on auth pages. | — (receives `scene`, usually `<DehmScan/>`) |

**`auth/`: auth-specific pieces**

| File | Role |
|---|---|
| `LoginForm.jsx` | Identifier and password fields. Validates with `loginSchema`, then calls `onLogin`. |
| `RegisterForm.jsx` | Name, username, email, phone, password and confirm. Validates with `registerSchema` (sends `avatar_id: 1`). Merges `fieldErrors` from the server. |
| `ForgotPasswordForm.jsx` / `ResetPasswordForm.jsx` | Email form / new-password form, each with its own small validator. |
| `AuthTabs.jsx` | Login ⇄ Register `NavLink` tabs (keeps the query string). |
| `AuthStatus.jsx` | A status card (`info`, `success`, `error`, `loading`) with action slots. |
| `RegisterWelcome.jsx` | The "welcome" screen after registering, with the chosen avatar. |

**`ui/`: generic building blocks (props in, JSX out, no API calls)**

| File | Props (main) | Notes |
|---|---|---|
| `Button.jsx` | `variant` (`primary`, `accent`, `secondary`, `outline`, `tertiary`), `loading`, `fullWidth`, `type`, `disabled` | Class `ui-button ui-button--<variant>`; shows a spinner and `aria-busy` while loading |
| `Chip.jsx` | `tone`, `size` | `chip chip--<tone> chip--<size>` |
| `InlineMessage.jsx` | `type` (`info`, `success`, `error`, `warning`), `message` | Banners |
| `AuthField.jsx` | `label`, `name`, `type`, `value`, `onChange`, `error`, `helper`, `success` | Accessible input (label `htmlFor`, `aria-invalid`, `aria-describedby`), show/hide password |
| `Navbar.jsx` | `logo`, `items[{label,to,end,disabled}]`, `account` | Uses `NavLink`; the active page gets a mint bar |
| `ProfileMenu.jsx` | `name`, `username`, `avatarSrc`, `onLogout`, `isLoggingOut` | Radix `DropdownMenu` |
| `FilterBar.jsx` | `filters`, `value`, `onChange`, `sort` | Chip-style filter group + a sort slot |
| `SortButton.jsx` | `options`, `value`, `onChange` | Native select + chevron |
| `Pagination.jsx` | `page`, `totalPages`, `onChange`, `summary` | Numbered pages with "…", السابق/التالي, a compact "صفحة x من y" on phone |
| `PackageCard.jsx` | `pkg`, `onDetails` | Store card |
| `AdminExperienceCard.jsx` | `experience` | Store-style admin card; edit link ("كمّل" for drafts); the ⋯ button is a placeholder |
| `NfcCoil.jsx` | `line`, `chip`, `className` | SVG brand pattern (spiral coil) |
| `DehmScan.jsx` | `tagNumber`, `title`, `paused`, … | Animated Dehem-scanning illustration (`DehmScan.css`) |
| `CharacterPicker.jsx` / `AvatarOption.jsx` | `value`, `onChange` | Avatar chooser (4 characters) |
| `avatarImages.js` | — | Maps `avatar_id` → image `{1: Dehem, 2: Ghamda, 3: Mento, 4: Sakhr}` |

### 2.6 `src/utils/`

| File | Exports | Role |
|---|---|---|
| `validation.js` | `registerSchema`, `loginSchema`, `getProfileSchema(kind, username)`, `validateForm(schema, values)`, `claimHashSchema`, `claimRequestSchema`, `claimReturnSchema` | All the **Zod** rules, with Arabic messages: username `^[a-z0-9_]{3,20}$`, Saudi phone `^5\d{8}$`, password 8 chars to 72 bytes, avatar 1–4. `validateForm` returns `{ success, data, errors: { field: firstMessage } }` so forms can show one error per field. |
| `localPurchases.js` | `readLocalPurchases`, `addLocalPurchase`, `renameLocalPurchase`, `localPurchasesKey`, `purchasesStorageKey` | The demo "my purchases" list per user in `localStorage`, validated with Zod on every read. |
| `claimReturn.js` | `rememberClaimReturn(path)`, `takeClaimReturn()` | Saves `/claim/…` in `sessionStorage` before sending a guest to login, and reads it once afterwards (only `/claim/<hash>` paths, at most 1 hour old). |

### 2.7 `src/styles/` & `src/assets/`

| File | Role |
|---|---|
| `styles/global.css` | **Design tokens** (`:root`: colours, fonts, spacing, radii), `@font-face` for Thmanyah, resets, and the styles for every shared component and most pages, in commented sections. Imported once in `index.js`. |
| `styles/HomePage.css` | Home page (`.rc-home*`), including the laptop → tablet → phone layout. |
| `styles/AdminExperiences.css` | Admin list and create pages, including `<dialog>` and the textarea. |
| `styles/DehmScan.css` | The Dehem animation. |
| `assets/fonts/` | `thmanyahsans` Regular / Medium / Bold, `thmanyahserifdisplay` Black. **These are the only fonts allowed.** |
| `assets/Mark.png`, `assets/avatars/*`, `assets/images/tail-bands.svg`, `googleLogo.png`, `view.png` / `hide.png` | Logo mark, the 4 characters, decorative art, icons. **Don't modify the logo or Dehem.** |

---

## 3. Backend connection & API integration

### 3.1 Where the API lives

- Backend: FastAPI, at **`http://localhost:8000`** locally (Swagger docs at `/docs`). See `backend/README.md` for every endpoint.
- The base URL comes from **`REACT_APP_API_URL`** and is read in `src/api/apiClient.js`:

  ```js
  const API_URL = process.env.REACT_APP_API_URL?.replace(/\/+$/, ""); // trailing "/" removed
  ```

- The backend only accepts browser requests from the origins listed in `backend/main.py` → `origins` (localhost/127.0.0.1 on ports 3000 and 8080, plus the workers.dev deploy). **If you run the frontend from a new URL, add it there,** or the browser blocks the requests with a CORS error.

### 3.2 The API client: `apiRequest()`

There's no axios; it's a small `fetch` wrapper:

```js
export async function apiRequest(path, options = {}, errorMessage = "تعذر تنفيذ الطلب.") {
  if (!API_URL) throw new Error("…REACT_APP_API_URL…");           // misconfiguration guard
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));            // empty or non-JSON → {}
  if (!response.ok) {
    const error = new Error(errorMessage);                         // Arabic message for the UI
    error.status = response.status;                                // 400, 401, 403, 404, 422, 500…
    error.detail = data.detail;                                    // FastAPI's detail (string or array)
    throw error;
  }
  return data;
}
```

**How to use it:**

```js
// src/api/events/eventsApi.js
import { apiRequest } from "../apiClient";

export function getEvent(accessToken, eventId, { signal } = {}) {
  return apiRequest(
    `/events/${eventId}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal },   // pass signal so Query can cancel
    "تعذر تحميل التجربة.",
  );
}
```

```js
// in a page
const { accessToken, user } = useAuth();
const eventQuery = useQuery({
  queryKey: ["event", user?.id, eventId],
  queryFn: ({ signal }) => getEvent(accessToken, eventId, { signal }),
  enabled: Boolean(accessToken && eventId),
  retry: false,
});
```

**Handling errors:**

```js
try { await registerUser(values); }
catch (error) {
  if (error.status === 400) setServerError(error.detail);           // business rule (string)
  else if (error.status === 422 && Array.isArray(error.detail)) {   // validation (array)
    for (const item of error.detail) fieldErrors[item.loc?.[1]] = item.msg;
  }
  else setServerError(error.message);                               // fallback Arabic message
}
```

| Status | Meaning | What the UI should do |
|---|---|---|
| 400 | Business rule (`detail` is a string) | Show a mapped Arabic message or `detail` |
| 401 | Missing or expired token | `AuthContext` clears the session, and the guard sends the user to `/login` |
| 403 | Not allowed (not owner or not admin) | Show "no permission" |
| 404 | Not found | Empty or not-found state |
| 422 | Request failed validation (`detail` is an array) | Per-field errors |
| network / 500 | Backend or database down | Retry message (see §5, Supabase) |

### 3.3 Authentication on requests

- **Token:** after login, `signIn(token, profile)` stores it in `localStorage["raccoon_access_token"]`. Get it with `const { accessToken } = useAuth()` and send `Authorization: Bearer ${accessToken}`.
- **Login body is form-encoded, not JSON:** `username` (username or email), `password`, `grant_type=password`. See `auth/authApi.js → loginUser`.
- **Cookie (NFC flow):** the backend also sets an `access_token` cookie on login, so a phone tapping a chip (`/t/{hash}` on the backend) can be recognised. A cross-origin cookie (3000 → 8000) is only stored when the request uses **`credentials: "include"`** (see §5).
- **Role:** `user.role` (`"user"` or `"admin"`) comes from `GET /users/me` and drives the navbar, the home content and `AdminRoute`.

### 3.4 Environment variables & environments

CRA only exposes variables that start with **`REACT_APP_`**. It **bakes them into the bundle at build or start time**, so restart `npm start` (or the container) after you change one.

| Variable | Dev value | Purpose |
|---|---|---|
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend base URL |
| `HOST` | `0.0.0.0` | Lets the dev server accept connections from outside the Docker container |
| `PORT` | `8080` | Dev server port **inside** the container (Docker maps it to **3000** on your machine) |

**Which file wins** (CRA, highest priority first):

| Command | Files read |
|---|---|
| `npm start` | `.env.development.local` → `.env.local` → `.env.development` → `.env` |
| `npm run build` | `.env.production.local` → `.env.local` → `.env.production` → `.env` |
| `npm test` | `.env.test.local` → `.env.test` → `.env` (no `.env.local`) |

**Recommended setup:**

- `.env` (committed) holds the shared dev defaults (as above).
- `.env.local` (git-ignored) holds your personal overrides, for example `REACT_APP_API_URL=http://192.168.1.20:8000` to test on a phone over Wi-Fi.
- `.env.production` holds the production API URL (for example `REACT_APP_API_URL=https://api.<domain>`), used by `npm run build`.

> ⚠️ Everything in `REACT_APP_*` ends up in the public JavaScript bundle. **Never put secrets in it** (API keys, database URLs). Secrets belong only in `backend/.env`.

`process.env.NODE_ENV` is `"development"` for `npm start` and `"production"` for `npm run build` (`Store/testClaims.js` uses it to turn test hashes on or off).

---

## 4. Onboarding & contribution guide

### 4.1 Prerequisites

- **Docker Desktop** (easiest; it runs the frontend and backend together), **or** **Node.js 20 LTS** + npm 10
- Git, with your fork cloned and `upstream` pointing to the team repo
- `backend/.env` from the team lead if you run the backend too
- VS Code with: ESLint, Prettier, ES7+ React snippets (recommended)

### 4.2 Run it

**Option A: Docker (frontend + backend), from the repo root**

```bash
docker compose up --build
# wait for: raccon_frontend | webpack compiled successfully
```

Open **http://localhost:3000**. The log prints `localhost:8080`; that's the port inside the container, so use 3000.

| Command | Use |
|---|---|
| `docker compose logs -f frontend` | Follow the frontend logs |
| `docker compose restart frontend` | After editing `.env` |
| `docker compose up --build` | After changing `package.json` |
| `docker compose down` | Stop everything |

**Option B: Node only (frontend alone)**

```bash
cd frontend/raccoon
npm install            # first time, and whenever package.json changes
npm start              # dev server with hot reload
```

- `.env` sets `PORT=8080`, so this opens on **http://localhost:8080**. That origin is already allowed by the backend's CORS.
- To use 3000 instead, create `.env.local` with `PORT=3000`.

You still need the backend running (Docker, or `uvicorn` in `backend/`) for anything beyond static pages.

**Test accounts:**

1. Register in the UI.
2. To get an admin, set `users.role = admin` for your account in Supabase, then log in again.

### 4.3 Scripts

| Script | What it does |
|---|---|
| `npm start` | Dev server, hot reload, ESLint warnings in the terminal |
| `npm run build` | Optimised production bundle in `build/` (static files, deployable to any static host) |
| `npm test` | Jest + React Testing Library in watch mode |
| `npm run eject` | ⚠️ One-way; copies the CRA config into the repo. **Don't run it.** |

### 4.4 Style guide & conventions

**Files & naming**

| Thing | Convention | Example |
|---|---|---|
| Component file and name | `PascalCase.jsx`, one default-exported component per file | `PackageCard.jsx` → `export default function PackageCard()` |
| Page | `<Feature>Page.jsx` in `pages/<Feature>/` | `pages/Store/StorePage.jsx` |
| API module | `<area>Api.js` in `api/<area>/`, **named exports**, verb-first | `api/packs/packsApi.js` → `previewPack`, `claimPack` |
| Utils / data | `camelCase.js` | `claimReturn.js` |
| Hooks (if you add some) | `useSomething.js` in `src/hooks/` | `useMediaQuery.js` |
| Event handlers | `handleX`; props for callbacks `onX` | `handleSubmit`, `onLogin` |
| Booleans | `is…` / `has…` / `can…` | `isSubmitting`, `signedIn` |

> **File names are case-sensitive in Docker (Linux), but not on Windows.** `import "./ExperiencesData"` must match the file name exactly, or Docker fails with "Module not found" even though it works on your machine.

**Components**

- Use function components and hooks only.
- Keep `components/ui/*` pure: data and callbacks come in as props, with **no API calls and no `useAuth()`**. Pages do the fetching.
- Use the existing primitives before writing new markup: `Button`, `AuthField`, `InlineMessage`, `Chip`, `Pagination`, `FilterBar`, `SortButton`.
- Put `dir="rtl"` on the page root. Write UI text in Arabic. For mixed text, use `dir="ltr"` or `<bdi>` around ids, emails and numbers.
- Server data goes through TanStack Query (`useQuery` / `useMutation`), not `useEffect` + `fetch`. Always pass `signal`, and use `enabled` to wait for the token.
- Forms: validate with Zod in `utils/validation.js` → `validateForm()`, show the first error under each field, disable submit while it's pending (`loading` on `Button`), and handle 400/422 from the server.

**CSS**

- Use **tokens only**: `var(--accent)`, `var(--space-4)`, `var(--radius-lg)`, `var(--font-display)`. Don't hard-code hex values or new fonts.
- Class names follow **BEM**: `.block`, `.block__element`, `.block--modifier` (`.ui-button--primary`, `.package-card__cover`). Prefix each page or feature (`.rc-home__…`, `.admin-exp__…`).
- Shared component styles go in `global.css`, in their commented section. A large page gets its own CSS file, imported by that page.
- **Brand rules:** solid surfaces only, with **no glass, blur or transparency effects**. Keep the 4/8 px spacing scale. Use Thmanyah fonts only.
- Make every layout work on **phone (~390px)** and **laptop (~1440px)**. Use the existing breakpoints (`max-width: 1199px`, `767px`).
- Avoid inline `style={{…}}`. Some older pages use it (for example `ScanPage`); move it to CSS when you touch them.

**Accessibility (WCAG 2.1 AA)**

- Use real `<button>` and `<a>`/`<Link>`, never a clickable `<div>`.
- Give every input a label (`AuthField` does this).
- Give icon-only buttons an `aria-label`.
- Keep the visible `:focus-visible` outline.
- Touch targets should be **at least 44px**.
- Respect `prefers-reduced-motion` for animations.

**General**

- Write comments when the reason isn't obvious (Arabic or English is fine).
- Remove `console.log` before committing.
- Don't add a dependency without discussing it with the team. If you do add one, commit `package-lock.json` with it.

### 4.5 Adding a feature, step by step

**Example: a page that shows one event.**

1. **API.** Add a function in `src/api/events/eventsApi.js` (see §3.2). Check the endpoint's body and response in `backend/README.md` or at `http://localhost:8000/docs`.
2. **Validation (if there's a form).** Add a Zod schema to `utils/validation.js` with Arabic messages.
3. **Page.** Create `src/pages/Events/EventPage.jsx`:

   ```jsx
   import { useParams } from "react-router-dom";
   import { useQuery } from "@tanstack/react-query";
   import AppNavbar from "../../components/layout/AppNavbar";
   import InlineMessage from "../../components/ui/InlineMessage";
   import { useAuth } from "../../context/AuthContext";
   import { getEvent } from "../../api/events/eventsApi";
   import "../../styles/EventPage.css";

   export default function EventPage() {
     const { eventId } = useParams();
     const { accessToken, user } = useAuth();
     const eventQuery = useQuery({
       queryKey: ["event", user?.id, eventId],
       queryFn: ({ signal }) => getEvent(accessToken, eventId, { signal }),
       enabled: Boolean(accessToken),
       retry: false,
     });

     return (
       <div dir="rtl">
         <AppNavbar />
         <main className="event-page">
           {eventQuery.isPending && <p role="status">جاري التحميل...</p>}
           {eventQuery.isError && <InlineMessage type="error" message={eventQuery.error.message} />}
           {eventQuery.data && <h1 className="event-page__title">{eventQuery.data.title}</h1>}
         </main>
       </div>
     );
   }
   ```

4. **Route.** In `src/app/App.js`, import the page and add:

   ```jsx
   <Route path="/events/:eventId" element={<ProtectedRoute><EventPage /></ProtectedRoute>} />
   ```

   Use `<AdminRoute>` for admin-only pages.
5. **Navigation.** If the page needs a navbar link, add it to `navigationByRole` in `components/layout/AppNavbar.jsx`.
6. **States.** Handle the loading, error, empty and success states, and check the page at 390px and 1440px in DevTools device mode.
7. **Test** manually against the running backend, and add a unit test if the logic isn't trivial (§4.6).

### 4.6 Testing

- **Runner:** `npm test` (Jest + React Testing Library + `@testing-library/jest-dom`). Test files: `*.test.js(x)` next to the code, or in `__tests__/`.
- The only existing test, `src/App.test.js`, is the CRA sample and **fails** (it imports a missing `./App`). Delete it or replace it when you add real tests.
- **What to test first:**
  - Zod schemas in `utils/validation.js` (pure functions, easy).
  - `ui/` components (render with props, then assert on the text or role).
  - Forms (type, submit, check that the error messages appear).

  ```js
  // src/utils/validation.test.js
  import { loginSchema, validateForm } from "./validation";

  test("login requires an identifier", () => {
    const r = validateForm(loginSchema, { identifier: "", password: "12345678" });
    expect(r.success).toBe(false);
    expect(r.errors.identifier).toBeTruthy();
  });
  ```

- **Manual checklist before a PR:**
  - The happy path works.
  - Backend errors (400/401/422) show a sensible message.
  - Logged-out access to the page redirects.
  - Admin vs user behaviour is right.
  - The phone and laptop layouts look right.
  - Keyboard navigation works.
  - The browser console has no errors.

### 4.7 Build

```bash
npm run build      # → build/ (minified, hashed files)
npx serve -s build # optional: preview the production build locally
```

Set `REACT_APP_API_URL` for the target environment **before** you build (in `.env.production` or the CI environment), and add the deployed origin to the backend's CORS list. The app uses client-side routing, so the static host must serve `index.html` for every path. Otherwise refreshing `/home` returns 404.

### 4.8 Git workflow & pull requests

1. **Sync** your fork's `Dev` with the team: `git switch Dev` → `git fetch upstream` → `git merge upstream/Dev`.
2. **Branch:** `git switch -c feature/<short-name>` (or `fix/…`).
3. **Commit** small steps with Conventional Commits: `feat:`, `fix:`, `style:`, `refactor:`, `docs:`, `chore:`.
4. **Before pushing:**
   - `docker compose up --build` compiles with no errors, and the browser console is clean.
   - Import paths match the file-name case.
   - There's no `console.log`, unused import or hard-coded colour.
   - `.env.local` and secrets aren't committed.
5. **Push to your fork**, then open a PR to **`t8pr/Raccon` → base `Dev`** (not `main`).
6. **PR description:** what changed, screenshots (phone + laptop), how to test (routes, test account role), and any new env variable or API dependency.
7. **Merge conflicts:**
   - Resolve them on your branch.
   - In `App.js`, conflicts are usually two sides adding routes. Use **Accept Combination** to keep both, then make sure every route and import appears only once.
   - Run the app again after resolving.

---

## 5. Known gaps & gotchas

| Area | What happens / what to do |
|---|---|
| **White page on `/login`** | `LoginPage` returns `null` while `isRestoring` (a token is saved and `/users/me` hasn't answered). If the backend or Supabase is down, it stays white. Check `docker compose logs api`, or clear the token in the console: `localStorage.removeItem("raccoon_access_token"); location.reload();` |
| **Backend database down** | Register, login and profile all fail when the API can't reach Supabase (`OperationalError … pooler.supabase.com:6543` in the API log). That's a backend or network issue, not a frontend bug. |
| **NFC cookie not stored** | `api/auth/authApi.js → loginUser` doesn't send `credentials: "include"` (the unused legacy `api/authApi.js` does). Cross-origin, the `access_token` cookie isn't saved, so tapping a chip always goes through `/login?redirect_tag=…`. Fix: add `credentials: "include"` to the login request. |
| **Duplicate API files** | `src/api/authApi.js` is a legacy copy that nothing imports. Use `src/api/auth/authApi.js`. |
| **`journeyApi.js`** | Uses raw `fetch` instead of `apiRequest`. Migrate it when you change it, for consistent errors. |
| **Store / purchases** | Payment isn't implemented. "Buying" saves a local purchase in the browser, and claim hashes come from `Store/packages.js`. |
| **Admin experiences** | `ExperiencesData.js` is in-memory dummy data and resets on reload. Its statuses (`published/draft/archived`) must be mapped to the backend's `draft/live/paused` when you connect the API. The ⋯ menu on cards does nothing yet. |
| **Customization page** | Placeholder (navbar only). |
| **Tests** | `App.test.js` fails (wrong import). There's no real test suite yet. |
| **ESLint "jest/globals" crash** | If `npm start` crashes with this when run outside Docker, start once with `DISABLE_ESLINT_PLUGIN=true npm start` (on PowerShell: `$env:DISABLE_ESLINT_PLUGIN="true"; npm start`) and report it to the team. |
| **Warnings in logs** | `DEP_WEBPACK_DEV_SERVER_ON_AFTER/BEFORE_SETUP_MIDDLEWARE` and `'session' is assigned a value but never used` (in `AuthContext`) are harmless. |
| **Browser console noise** | Errors from `chrome-extension://…` come from browser extensions, not Raccon. Filter them out, or use a private window. |
| **CRA is in maintenance mode** | It works, but a future move to Vite is worth planning (env prefix `VITE_`, `index.html` at the root). |
