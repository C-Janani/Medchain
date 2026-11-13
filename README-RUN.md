# RxChain - how to run

1. Start MongoDB (local service on port 27017).
2. Backend:
       cd rxchain-backend
       npm install
       npm start
   The first start creates the demo users and the genesis block automatically.
3. Open http://localhost:5000  (backend serves the frontend too - no CORS / file:// problems)

Demo logins (Registration ID / password)
- Doctor   DOC-1024 / doctor123
- Patient  PAT-2048 / patient123
- Pharmacy PHR-3072 / pharmacy123
- Admin    ADM-4096 / admin123

If you still see "Cannot reach the server": the backend is not running, or port 5000 is busy.
Check http://localhost:5000/api/health in the browser. To change the port, set PORT in rxchain-backend/.env
(copy .env.example to .env first). The front-end finds the API automatically (same origin).

Public demo (no login): open the homepage and click "Explore Demo". See README-DEPLOY.md for Render.


## New features (v2)

| Area | Feature | Where to find it |
|---|---|---|
| Prescription safety | Drug interaction checker (severity: low / medium / high) | Doctor > Create Prescription, live "Safety check" panel |
| Prescription safety | Allergy + dosage + age validator (blocks until the doctor confirms) | Same page. Allergies are saved per patient |
| Doctor productivity | Medicine autocomplete, diagnosis-based templates, "Save as template" | Create Prescription |
| Doctor productivity | Voice dictation for diagnosis and notes (English / Tamil) | Microphone buttons. Chrome or Edge |
| Patient experience | Medicine reminders + taken/missed tracker + adherence % | Patient > Reminders |
| Patient experience | Plain-language explainer, English / Tamil toggle | Patient > My Prescriptions > View |
| Security | Ledger integrity verifier (re-hashes every block, cross-checks every record) | Admin dashboard, runs on load + "Verify now" |
| Security | Fraud / anomaly detection with risk score | Admin dashboard, "Fraud & anomaly risk" |

New backend endpoints: `POST /api/prescriptions/check`, `GET /api/prescriptions/:id/analysis`,
`GET /api/prescriptions/:id/explain?lang=en|ta`, `PUT /api/users/patients/:id/allergies`,
`/api/clinical/*` (autocomplete + templates), `/api/adherence/*` (reminders), `GET /api/admin/integrity`, `GET /api/admin/fraud`.

### Demo for your project review
1. Admin dashboard shows "Ledger intact".
2. In `rxchain-backend` run `npm run tamper` (changes a dosage straight in MongoDB, like an attacker would).
3. Press **Verify now** on the Admin dashboard. It turns red with "Tampering detected" and the risk score goes to 100.
4. `npm run tamper:restore` puts it back.

### Tests
`cd rxchain-backend && npm test` runs the offline unit tests (safety rules, parsing, ledger, fraud, reminders).

### Settings in rxchain-backend/.env
- `APP_TZ` time zone for reminders (default Asia/Kolkata).
- `ANTHROPIC_API_KEY` optional. Only used to explain medicines that are not in the built-in list. Leave blank to skip.

### Good to know
- The safety checks are rule-based screening for a college project, covering about 26 common medicines. They are not a licensed drug database and never replace a clinician's judgement. Unknown medicines are reported as "not checked".
- Reminder notifications fire while the Reminders page is open in the browser.
- New blocks are hashed with an ISO timestamp, so the ledger verifies the same on any server time zone. Blocks created before this update still verify.
