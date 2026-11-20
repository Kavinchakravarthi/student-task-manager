import os
import secrets
import string
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
app = FastAPI(title="Complaint Service")
client = AsyncIOMotorClient(MONGODB_URI)
db = client["smart_campus"]
complaints = db["complaints"]

CATEGORIES = {"Projectors", "Wi-Fi", "Drinking Water", "Lab Equipment", "Washrooms", "Hostel Maintenance", "Other"}
STATUSES = {"Submitted", "Acknowledged", "In Progress", "Resolved"}
PRIORITIES = {"Low", "Medium", "High", "Critical"}


class ComplaintCreate(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    student_id: Optional[str] = Field(default=None, max_length=50)
    category: str
    location: str = Field(min_length=2, max_length=150)
    description: str = Field(min_length=10, max_length=3000)
    priority: str = "Medium"


class ComplaintUpdate(BaseModel):
    status: str
    resolution_notes: Optional[str] = Field(default=None, max_length=3000)


def public_complaint(document):
    document["_id"] = str(document["_id"])
    document["complaint_id"] = document.get("complaint_id")
    return document


def complaint_number():
    suffix = "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))
    return f"CMP-{suffix}"


@app.on_event("startup")
async def create_indexes():
    await complaints.create_index("complaint_id", unique=True)
    await complaints.create_index([("created_at", -1)])


@app.get("/health")
async def health():
    await db.command("ping")
    return {"status": "ok"}


@app.post("/complaints")
async def create_complaint(payload: ComplaintCreate):
    if payload.category not in CATEGORIES:
        raise HTTPException(status_code=422, detail="Invalid category")
    if payload.priority not in PRIORITIES:
        raise HTTPException(status_code=422, detail="Invalid priority")
    now = datetime.now(timezone.utc)
    document = payload.model_dump()
    document.update({
        "complaint_id": complaint_number(),
        "status": "Submitted",
        "resolution_notes": "",
        "created_at": now,
        "updated_at": now,
    })
    result = await complaints.insert_one(document)
    document["_id"] = str(result.inserted_id)
    return document


@app.get("/complaints")
async def list_complaints(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    priority: Optional[str] = None,
):
    query = {}
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if priority:
        query["priority"] = priority
    if search:
        regex = {"$regex": search, "$options": "i"}
        query["$or"] = [
            {"complaint_id": regex},
            {"name": regex},
            {"student_id": regex},
            {"location": regex},
            {"description": regex},
        ]
    cursor = complaints.find(query).sort("created_at", -1)
    return [public_complaint(doc) async for doc in cursor]


@app.get("/complaints/{complaint_id}")
async def get_complaint(complaint_id: str):
    document = await complaints.find_one({"complaint_id": complaint_id.upper()})
    if not document:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return public_complaint(document)


@app.patch("/complaints/{complaint_id}")
async def update_complaint(complaint_id: str, payload: ComplaintUpdate):
    if payload.status not in STATUSES:
        raise HTTPException(status_code=422, detail="Invalid status")
    update = {"status": payload.status, "updated_at": datetime.now(timezone.utc)}
    if payload.resolution_notes is not None:
        update["resolution_notes"] = payload.resolution_notes
    result = await complaints.update_one({"complaint_id": complaint_id.upper()}, {"$set": update})
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Complaint not found")
    document = await complaints.find_one({"complaint_id": complaint_id.upper()})
    return public_complaint(document)
