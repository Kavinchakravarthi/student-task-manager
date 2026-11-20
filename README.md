# Smart Campus Complaint Management System

## Run

Create a `.env` file from `.env.example` and set `MONGODB_URI` to a MongoDB Atlas connection string, then run:

```bash
docker compose up --build
```

Open `http://localhost`. The API is at `http://localhost:8000`.

Default local admin credentials are `admin` / `admin123` unless overridden in `.env`.

## Run locally without Docker (Windows PowerShell)

Set `MONGODB_URI` and your admin credentials in the root `.env` file, then start the services:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\run-local.ps1
```

The script creates `.venv`, installs dependencies as needed, and starts the four API services and Vite frontend. Open `http://localhost:5173`; the API gateway is on `http://localhost:8000`. Stop services with `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\stop-local.ps1`.

## Services

- Frontend: Nginx + React
- API gateway: port 8000
- Auth service: port 8001
- Complaint service: port 8002
- Analytics service: port 8003
