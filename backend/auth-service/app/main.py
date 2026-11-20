import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from fastapi import Depends, FastAPI, Header, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from pydantic import BaseModel

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
JWT_SECRET = os.getenv("JWT_SECRET", "smart-campus-change-this-secret")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

app = FastAPI(title="Auth Service")
client = AsyncIOMotorClient(MONGODB_URI)
db = client["smart_campus"]
admins = db["admins"]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class LoginRequest(BaseModel):
    username: str
    password: str


@app.on_event("startup")
async def seed_admin():
    existing = await admins.find_one({"username": ADMIN_USERNAME})
    password_hash = pwd_context.hash(ADMIN_PASSWORD)
    if existing:
        await admins.update_one({"_id": existing["_id"]}, {"$set": {"password_hash": password_hash}})
    else:
        await admins.insert_one({"username": ADMIN_USERNAME, "password_hash": password_hash, "role": "admin"})


@app.get("/health")
async def health():
    await db.command("ping")
    return {"status": "ok"}


@app.post("/login")
async def login(payload: LoginRequest):
    admin = await admins.find_one({"username": payload.username})
    if not admin or not pwd_context.verify(payload.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    expires = datetime.now(timezone.utc) + timedelta(hours=8)
    token = jwt.encode(
        {"sub": admin["username"], "role": "admin", "exp": expires},
        JWT_SECRET,
        algorithm="HS256",
    )
    return {"access_token": token, "token_type": "bearer", "expires_at": expires.isoformat()}


@app.get("/verify")
async def verify(authorization: Optional[str] = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return {"valid": True, "username": payload.get("sub"), "role": payload.get("role")}
