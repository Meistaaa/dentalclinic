# Dental Clinic Management

A clinic dashboard for managing doctors and patient appointments. The React frontend calls an Express JSON API backed by PostgreSQL. Dashboard counts and upcoming appointments come from API data.

## Prerequisites

- Node.js **22.18 or newer** and npm. The backend runs TypeScript directly with Node.
- PostgreSQL **14 or newer**, running locally or available through a connection URL.
- A PostgreSQL user allowed to create a database and tables.

## Run locally from a fresh clone

```bash
git clone https://github.com/Meistaaa/dentalclinic.git
cd dentalclinic
createdb -U YOUR_USER dentalclinic
```

Replace `YOUR_USER` with your PostgreSQL user. In the first terminal, set up the API:

```bash
cd backend
npm ci
cp .env.example .env
```

Edit `backend/.env` and set `DATABASE_URL` to your own connection URL, such as `postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/dentalclinic`. Then run:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

The seed is optional, but gives the dashboard sample data. Check the API and database together:

```bash
curl http://localhost:3000/api/v1/health
# {"status":"ok"}
```

In a second terminal, start the frontend:

```bash
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`. The frontend example points to `http://localhost:3000/api/v1`, so no further edit is needed for these ports. Keep both terminals running. If the migration fails, check that PostgreSQL is running, the `DATABASE_URL` user and password are correct, and that user can create tables.

## Architecture

```text
frontend/  React 18, React Router, Vite, TypeScript
    │     /dashboard, /doctors, /doctors/:id, /appointments
    ▼
backend/   Express REST API, TypeScript, Zod validation
    │      routes → controllers → services → database pool
    ▼
PostgreSQL  doctors and appointments
```

The backend starts at `backend/src/server.ts`. `backend/src/routes/` defines URL paths; controllers validate requests and choose HTTP status codes; services in `backend/src/services/` run SQL. Schema, sample data, and the SQL runner are in `backend/src/db/`. The frontend API client is in `frontend/src/services/`, with pages in `frontend/src/pages/`.

Doctors have structured weekly working periods in `doctor_availability` (ISO weekdays 1=Monday through 7=Sunday). Multiple non-overlapping periods per day are supported. Appointments last 30 minutes and must fit entirely within a working period. The database enforces unique doctor emails and unique active `(doctor_id, appointment_date, appointment_time)` slots; cancelled appointments release their slot. A doctor with appointments cannot be deleted; set `is_active` to `false` to retire them while keeping patient history. Database triggers maintain `updated_at`.

## Environment files

Copy each directory's `.env.example` to `.env`. Both `.env` files are ignored by Git. The example files contain placeholders only; never commit real credentials.

| File | Variable | Default/example | Purpose |
| --- | --- | --- | --- |
| `backend/.env` | `DATABASE_URL` | edit the placeholder | Required PostgreSQL connection URL |
| `backend/.env` | `PORT` | `3000` | API listen port |
| `backend/.env` | `NODE_ENV` | `development` | Set `production` when deployed; enables HSTS |
| `backend/.env` | `CORS_ORIGIN` | `http://localhost:5173` | Comma-separated allowed frontend origins, without trailing slashes |
| `frontend/.env` | `VITE_API_URL` | `http://localhost:3000/api/v1` | Full API base URL, including `/api/v1` |

Vite embeds `VITE_API_URL` **at build time**. Rebuild the frontend after changing it. The API validates backend environment variables on startup. Local `localhost` database URLs use a plain connection; remote URLs use SSL.

## Database commands

Run these from `backend/` after setting `DATABASE_URL`:

| Command | Action |
| --- | --- |
| `npm run db:migrate` | Apply the base schema, then unapplied SQL files in `src/db/migrations/` |
| `npm run db:seed` | Add sample doctors and appointments |
| `npm run db:reset` | Reapply schema, then seed; **does not delete existing data** |

The base schema and seed can be rerun. Versioned migrations are recorded in `schema_migrations` and applied once each. Seeded appointment dates are relative to the date of the first seed; rerunning the seed will not move existing appointments forward.

## API

The canonical base is `http://localhost:3000/api/v1`. `/api` is also mounted as an unversioned alias for existing clients. Resource endpoints use JSON; `/docs` serves HTML and `204` responses have no body. No authentication is implemented yet, so protect these endpoints before using real patient data on a public deployment.

| Method | Path after `/api/v1` | Purpose |
| --- | --- | --- |
| `GET` | `/health` | API and database health |
| `GET` | `/doctors` | List doctors; optional `search`, `is_active=true\|false` |
| `POST` | `/doctors` | Create a doctor |
| `GET` | `/doctors/:id` | Get a doctor |
| `PUT` | `/doctors/:id` | Replace a doctor |
| `DELETE` | `/doctors/:id` | Delete a doctor without appointments |
| `GET` | `/doctors/:id/availability?date=YYYY-MM-DD` | Show available and booked 30-minute slots |
| `GET` | `/appointments` | List appointments; optional `status`, `doctorId`, `date` filters |
| `POST` | `/appointments` | Create an appointment |
| `GET` | `/appointments/:id` | Get an appointment |
| `PUT` | `/appointments/:id` | Replace an appointment |
| `DELETE` | `/appointments/:id` | Delete an appointment |
| `GET` | `/openapi.json` | Full OpenAPI 3.1 specification |
| `GET` | `/docs` | Interactive Swagger UI |

Filters can be combined. Appointment status is `pending`, `confirmed`, `completed`, or `cancelled`; dates use `YYYY-MM-DD` and times use 24-hour `HH:MM` at `:00` or `:30`. `PUT` expects the full writable record. Doctor create/update bodies include `weekly_availability`, an array of `{ "day_of_week": 1, "start_time": "09:00", "end_time": "17:00" }` periods. The [OpenAPI specification](backend/src/docs/openapi.ts) lists every field and response.

Examples, with the API running:

```bash
curl 'http://localhost:3000/api/v1/doctors?is_active=true'
curl 'http://localhost:3000/api/v1/appointments?status=pending&date=2099-12-31'

curl -X POST 'http://localhost:3000/api/v1/doctors' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Dr. Sam Lee","specialization":"General Dentistry","phone":"+1-555-0100","email":"sam.lee@example.test","weekly_availability":[{"day_of_week":4,"start_time":"09:00","end_time":"17:00"}],"is_active":true}'

curl 'http://localhost:3000/api/v1/doctors/1/availability?date=2099-12-31'

# Replace doctor_id with the ID returned by the previous request.
curl -X POST 'http://localhost:3000/api/v1/appointments' \
  -H 'Content-Type: application/json' \
  -d '{"patient_name":"Alex Kim","patient_phone":"+1-555-0200","patient_email":"alex@example.test","doctor_id":1,"appointment_date":"2099-12-31","appointment_time":"10:30","reason":"Checkup","status":"pending"}'
```

Success responses use `200` or `201` with the record; deletes return `204` without a body. Errors use one JSON shape:

```json
{"errors":["appointment_date: must be a real calendar date"]}
```

Common statuses: `400` invalid input or missing doctor reference, `404` missing record, `409` duplicate doctor email, inactive doctor, outside working hours, or occupied slot, `429` rate limit, and `500` unexpected server error. Stack traces are not returned to clients.

## Development and tests

Run commands in the indicated directory:

| Directory | Command | Purpose |
| --- | --- | --- |
| `backend/` | `npm run dev` | API with file watching |
| `backend/` | `npm start` | API without file watching |
| `backend/` | `npm run typecheck` | Backend TypeScript check |
| `backend/` | `npm test` | Schema and error-handler tests; no database needed |
| `backend/` | `npm run test:integration` | Live API CRUD and edge-case checks; API and database must be running |
| `frontend/` | `npm run dev` | Vite development server |
| `frontend/` | `npm run build` | Typecheck and create `dist/` production bundle |
| `frontend/` | `npm run preview` | Preview the built bundle |

The integration test creates uniquely named disposable records and removes them. Run it against a **development or test database**, not production. Set `API_BASE_URL` if the API is somewhere other than `http://localhost:3000/api/v1`.

When changing an API resource, update its route, controller, service, validation schema, and OpenAPI description together. Run backend tests and typecheck, then build the frontend. Use the integration test with a running development API to verify database behavior.

## Deployment

Deploy PostgreSQL first, then the API, then the frontend. For a host such as Render:

1. Create a PostgreSQL database and use its connection URL as the backend `DATABASE_URL`.
2. Create a Node web service with root directory `backend`, Node 22.18+, build command `npm ci`, start command `npm start`, `NODE_ENV=production`, and `CORS_ORIGIN` set to the exact public frontend origin. The host supplies `PORT` if needed.
3. Apply the schema against the production database once: from `backend/`, with the production `DATABASE_URL` set, run `npm run db:migrate`. Seed only if sample data is appropriate for that environment.
4. Set the service health-check path to `/api/v1/health`.
5. Create a static site with root directory `frontend`, build command `npm ci && npm run build`, and publish directory `dist`. Set `VITE_API_URL` to the public API URL ending in `/api/v1` **before building**.
6. Configure a single-page-app rewrite from `/*` to `/index.html`, so refreshing `/doctors` or `/appointments` works.

Use HTTPS for both public origins. After deployment, open the health endpoint and the frontend, then verify the doctors and appointments pages load. Rebuild the frontend if its API URL changes.

Render references: [Express web services](https://render.com/docs/deploy-node-express-app), [static sites](https://render.com/docs/static-sites), and [single-page-app rewrites](https://render.com/docs/redirects-rewrites).

## Known limitations

- No authentication or roles; API endpoints are public. Do not use real patient information until access control is added.
- Rate limiting uses process memory. Counters reset on restart and are not shared across multiple API instances.
- The availability model has weekly periods only; holidays, recurring exceptions, variable durations, multiple clinics, and time zones are not yet supported.
- Lists have no pagination. Large clinics will need paginated API endpoints and UI controls.
- The dashboard computes metrics from the fetched appointment list rather than a dedicated aggregate endpoint.
