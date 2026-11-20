import os
from typing import Optional

import httpx
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.cors import CORSMiddleware

AUTH_URL = os.getenv("AUTH_SERVICE_URL", "http://localhost:8001")
COMPLAINT_URL = os.getenv("COMPLAINT_SERVICE_URL", "http://localhost:8002")
ANALYTICS_URL = os.getenv("ANALYTICS_SERVICE_URL", "http://localhost:8003")
origins = [item.strip() for item in os.getenv("CORS_ORIGINS", "http://localhost").split(",") if item.strip()]

app = FastAPI(title="Smart Campus API Gateway")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)
    print(f"{request.method} {request.url.path} -> {response.status_code}", flush=True)
    return response


async def forward(request: Request, base_url: str, path: str):
    body = await request.body()
    headers = {key: value for key, value in request.headers.items() if key.lower() not in {"host", "content-length"}}
    async with httpx.AsyncClient(timeout=20.0) as client:
        try:
            upstream = await client.request(
                request.method,
                f"{base_url}{path}",
                params=request.query_params,
                content=body,
                headers=headers,
            )
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=503, detail=f"Downstream service unavailable: {exc}")
    return Response(content=upstream.content, status_code=upstream.status_code,
                    headers={"content-type": upstream.headers.get("content-type", "application/json")})


@app.get("/health")
async def health():
    results = {}
    async with httpx.AsyncClient(timeout=3.0) as client:
        for name, url in (
            ("auth", AUTH_URL),
            ("complaints", COMPLAINT_URL),
            ("analytics", ANALYTICS_URL),
        ):
            try:
                response = await client.get(f"{url}/health")
                results[name] = "ok" if response.status_code == 200 else "degraded"
            except httpx.HTTPError:
                results[name] = "unavailable"
    all_ok = all(value == "ok" for value in results.values())
    return {"status": "ok" if all_ok else "degraded", "services": results}


@app.api_route("/api/auth/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
async def auth_proxy(path: str, request: Request):
    return await forward(request, AUTH_URL, f"/{path}")


async def require_admin(request: Request):
    authorization = request.headers.get("authorization")
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    async with httpx.AsyncClient(timeout=5.0) as client:
        try:
            response = await client.get(f"{AUTH_URL}/verify", headers={"Authorization": authorization})
        except httpx.HTTPError:
            raise HTTPException(status_code=503, detail="Auth service unavailable")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="Invalid or expired token")


@app.api_route("/api/complaints", methods=["GET", "POST"])
async def complaints_collection(request: Request):
    if request.method == "GET":
        await require_admin(request)
    return await forward(request, COMPLAINT_URL, "/complaints")


@app.api_route("/api/complaints/{complaint_id}", methods=["GET", "PATCH", "DELETE"])
async def complaints_item(complaint_id: str, request: Request):
    if request.method != "GET":
        await require_admin(request)
    return await forward(request, COMPLAINT_URL, f"/complaints/{complaint_id}")


@app.api_route("/api/analytics/{path:path}", methods=["GET"])
async def analytics_proxy(path: str, request: Request):
    await require_admin(request)
    return await forward(request, ANALYTICS_URL, f"/analytics/{path}")
