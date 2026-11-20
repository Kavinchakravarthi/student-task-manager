# Project Metadata

## Project identity

| Field | Value |
|---|---|
| Project name | Smart Campus Complaint Management System |
| Frontend package | `smart-campus-frontend` |
| Repository | [Kavinchakravarthi/student-task-manager](https://github.com/Kavinchakravarthi/student-task-manager) |
| Project type | Full-stack web application |
| Purpose | Submit, track, manage, and report campus maintenance complaints |
| Primary users | Students, college administrators, and maintenance staff |
| Student login required | No |
| Admin login required | Yes |
| Production deployment URL | Not configured |

## Technology stack

| Area | Technologies |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, CSS |
| Backend | Python 3.11, FastAPI, Pydantic v2, Motor, PyJWT, Passlib, HTTPX, Uvicorn |
| Database | MongoDB; database name `smart_campus` |
| Containerization | Docker, Docker Compose |
| Production static web server | Nginx |

### Declared dependency versions

Backend dependencies are pinned in the service-specific `requirements.txt` files:

| Dependency | Version |
|---|---:|
| FastAPI | 0.115.6 |
| Uvicorn | 0.34.0 |
| Motor | 3.6.0 |
| Pydantic | 2.10.4 |
| PyJWT | 2.10.1 |
| Passlib | 1.7.4 |
| bcrypt | 4.0.1 |
| HTTPX | 0.28.1 |

Frontend dependency ranges are declared in `frontend/package.json` and resolved in `frontend/package-lock.json`:

| Dependency | Declared range |
|---|---|
| React / React DOM | `^18.3.1` |
| Vite | `^6.0.7` |
| React Router DOM | `^7.1.1` |
| Axios | `^1.7.9` |
| Vite React plugin | `^4.3.4` |

Container base images are declared by the Dockerfiles: Python `3.11-slim`, Node `20-alpine`, Nginx `1.27-alpine`, and MongoDB `7`.

## Architecture and local ports

The browser sends API requests through the API gateway. The gateway forwards requests to the relevant backend service. Backend services share the `smart_campus` MongoDB database.

| Component | Responsibility | Port |
|---|---|---:|
| Frontend | Student submission and tracking pages; protected admin dashboard | 5173 (Vite) or 80 (Docker/Nginx) |
| API gateway | Single API entry point, request logging, CORS, authentication checks, and service health | 8000 |
| Auth service | Admin login, JWT issuance, and token verification | 8001 |
| Complaint service | Complaint submission, retrieval, filtering, and status updates | 8002 |
| Analytics service | Complaint summaries, status/category counts, and trends | 8003 |
| MongoDB | Persistent complaint and admin data | 27017 when using local MongoDB |

## Functional scope

- Accepts complaints without student login.
- Supports categories: Projectors, Wi-Fi, Drinking Water, Lab Equipment, Washrooms, Hostel Maintenance, and Other.
- Supports priorities: Low, Medium, High, and Critical.
- Generates a complaint ID for tracking.
- Provides complaint lookup by ID and an ordered status timeline.
- Provides an admin dashboard with search, status/category/priority filters, status updates, and resolution notes.
- Provides summary metrics and category/status analytics.

## API route inventory

Frontend-facing endpoints are served by the API gateway at `http://localhost:8000`.

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Gateway and downstream-service health |
| `POST` | `/api/auth/login` | Public | Sign in as an administrator |
| `GET` | `/api/auth/verify` | Bearer token | Verify the admin JWT |
| `POST` | `/api/complaints` | Public | Submit a complaint |
| `GET` | `/api/complaints/{complaint_id}` | Public | Track one complaint |
| `GET` | `/api/complaints` | Admin | List complaints; supports `status`, `category`, `priority`, and `search` query parameters |
| `PATCH` | `/api/complaints/{complaint_id}` | Admin | Update status and resolution notes |
| `GET` | `/api/analytics/summary` | Admin | Overall complaint metrics |
| `GET` | `/api/analytics/categories` | Admin | Counts grouped by category |
| `GET` | `/api/analytics/statuses` | Admin | Counts grouped by status |
| `GET` | `/api/analytics/trend` | Admin | Complaint counts by date for the recent two-week period |

## Complaint statuses

The application uses these status values:

1. `Submitted`
2. `Acknowledged`
3. `In Progress`
4. `Resolved`

## Configuration

Configuration is supplied through environment variables. Keep real credentials in an untracked `.env` file or the deployment platform's secret settings; never commit them.

| Variable | Used by | Description |
|---|---|---|
| `MONGODB_URI` | Database-backed services | MongoDB connection string |
| `JWT_SECRET` | Auth service and gateway | Shared signing secret for admin JWTs |
| `ADMIN_USERNAME` | Auth service | Username of the seeded admin |
| `ADMIN_PASSWORD` | Auth service | Password used when seeding the admin account |
| `CORS_ORIGINS` | API gateway | Comma-separated allowed browser origins |
| `AUTH_SERVICE_URL` | API gateway | Auth-service base URL |
| `COMPLAINT_SERVICE_URL` | API gateway | Complaint-service base URL |
| `ANALYTICS_SERVICE_URL` | API gateway | Analytics-service base URL |

See [.env.example](./.env.example) for variable names and placeholder values only.

## Run and build

### Docker Compose

Create a root `.env` with the required configuration, then run:

```bash
docker compose up --build
```

The frontend is served at `http://localhost`; the API gateway is at `http://localhost:8000`. Compose persists its MongoDB data in the `mongo-data` named volume.

### Local development on Windows

With Python and Node.js installed, create a root `.env` and run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-local.ps1
```

Open `http://localhost:5173`. Stop the local API processes with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\stop-local.ps1
```

The local-development scripts use the MongoDB URI configured in the root `.env`. For a local Compass/MongoDB Community instance, the URI can point to `mongodb://127.0.0.1:27017/smart_campus`; use a separate Atlas URI when configuring Atlas.

### Frontend build

```bash
cd frontend
npm ci
npm run build
```

## Deployment notes

- The repository includes Dockerfiles and a Docker Compose configuration for the full stack.
- The frontend is a Vite static build and can be deployed separately to a static hosting provider.
- A separately deployed frontend requires a reachable hosted API and matching API/CORS configuration. A browser on the public internet cannot call a backend running only on a developer's `localhost`.
- No production frontend URL or hosted backend URL is configured in this repository.

## Data and security notes

- MongoDB stores admin records in `admins` and complaints in `complaints`.
- The Compose setup persists database data in its named Docker volume.
- Admin endpoints require a bearer JWT; tokens are issued with an eight-hour expiry.
- The public complaint tracking route uses the complaint ID. Do not put sensitive personal information in complaint descriptions.
- Rotate any credential that has been exposed. Do not add `.env` files, access tokens, database passwords, or production secrets to this metadata file or Git.
