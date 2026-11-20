import os
from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
app = FastAPI(title="Analytics Service")
client = AsyncIOMotorClient(MONGODB_URI)
db = client["smart_campus"]
complaints = db["complaints"]


@app.get("/health")
async def health():
    await db.command("ping")
    return {"status": "ok"}


@app.get("/analytics/summary")
async def summary():
    total = await complaints.count_documents({})
    resolved = await complaints.count_documents({"status": "Resolved"})
    open_count = await complaints.count_documents({"status": {"$ne": "Resolved"}})
    in_progress = await complaints.count_documents({"status": "In Progress"})
    return {
        "total": total,
        "resolved": resolved,
        "open": open_count,
        "in_progress": in_progress,
        "resolution_rate": round((resolved / total * 100) if total else 0, 1),
    }


@app.get("/analytics/categories")
async def categories():
    pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    return [{"category": row["_id"], "count": row["count"]} async for row in complaints.aggregate(pipeline)]


@app.get("/analytics/statuses")
async def statuses():
    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    return [{"status": row["_id"], "count": row["count"]} async for row in complaints.aggregate(pipeline)]


@app.get("/analytics/trend")
async def trend():
    start = datetime.now(timezone.utc) - timedelta(days=13)
    pipeline = [
        {"$match": {"created_at": {"$gte": start}}},
        {"$group": {
            "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id": 1}},
    ]
    return [{"date": row["_id"], "count": row["count"]} async for row in complaints.aggregate(pipeline)]
