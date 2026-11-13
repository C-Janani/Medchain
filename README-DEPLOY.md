# MedChain / RxChain - single Render deployment

One Node.js Web Service serves the front-end (`index.html`, `css/`, `js/`, `pages/`, `assets/`) and the API (`/api/*`) from one URL.

## Render steps
1. Push this project folder to GitHub (the `.gitignore` already excludes `.env` and `node_modules`).
2. MongoDB Atlas (free M0): create a cluster, a database user, and under **Network Access** allow `0.0.0.0/0` (Render free instances have no fixed IP). Copy the connection string, e.g. `mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/rxchain`.
3. Render -> **New + -> Web Service** -> pick the repo.
   - **Root Directory:** `rxchain-backend` (if the repo root is this folder; if the repo root is its parent, use `medical-prescription-system/rxchain-backend`)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/api/health`
   - (Or use **Blueprint** with the included `render.yaml`.)
4. Environment variables (Environment tab):

   | Name | Value |
   |---|---|
   | `NODE_ENV` | `production` |
   | `MONGO_URI` | your Atlas connection string |
   | `JWT_SECRET` | long random string (Blueprint generates one) |
   | `ADMIN_REGISTRATION_ID` | e.g. `ADM-9001` (creates your first real admin) |
   | `ADMIN_PASSWORD` | a strong password |
   | `APP_TZ` | `Asia/Kolkata` (optional) |
   | `ANTHROPIC_API_KEY` | optional |

   `PORT` is set by Render automatically.
5. Deploy. Open the Render URL: the homepage loads with **Explore Demo**. Check `/api/health` shows `"database":"connected"`.

## How demo mode works
- "Explore Demo" stores a local flag and routes the UI to `/api/demo/*`, a **read-only** API over a fictional in-memory dataset. It never reads or writes MongoDB and sends no token.
- Every write on `/api/demo/*` returns 403. The real endpoints (`/api/auth`, `/api/prescriptions`, `/api/admin`, ...) still need a valid JWT and the right role.
- Safety checks, QR generation/verification, hash-chain verification, integrity check, fraud scoring and English/Tamil explanations run the real code on the demo data.
- The ledger is a **simulated blockchain**: SHA-256 hash chaining stored in the database. It is not a public blockchain network.

## Real accounts
- The README demo logins (DOC-1024 / doctor123, ...) are **not created in production**. Create the first admin with `ADMIN_REGISTRATION_ID` + `ADMIN_PASSWORD`; the admin dashboard can then register doctors, pharmacies and patients (there is no public self-registration in the original app).
- Local development still seeds the README logins (see README-RUN.md).

## Notes
- Render free instances sleep after inactivity; the first request can take about 50 seconds.
- `.env` was removed from this package. If it ever left your machine, rotate its JWT secret and MongoDB password.
