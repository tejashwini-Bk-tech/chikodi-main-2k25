from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import aiohttp


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database configuration (Supabase first, fallback to Mongo)
SUPABASE_URL: Optional[str] = os.environ.get('SUPABASE_URL') or os.environ.get('REACT_APP_SUPABASE_URL')
SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

use_supabase = bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)

db = None
client = None
if not use_supabase:
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME')
    if mongo_url and db_name:
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]
    else:
        logging.warning("No DB configured: Set SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(client_name=input.client_name)
    if use_supabase:
        # Insert via Supabase REST
        insert_payload = status_obj.dict()
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{SUPABASE_URL}/rest/v1/status_checks",
                json=insert_payload,
                headers={
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "return=representation"
                },
            ) as resp:
                if resp.status >= 300:
                    text = await resp.text()
                    raise HTTPException(status_code=500, detail=f"Supabase insert failed: {text}")
                data = await resp.json()
                # Supabase returns a list of inserted rows
                row = data[0] if isinstance(data, list) and data else insert_payload
                return StatusCheck(**row)
    else:
        if not db:
            raise HTTPException(status_code=500, detail="Database not configured")
        _ = await db.status_checks.insert_one(status_obj.dict())
        return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    if use_supabase:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{SUPABASE_URL}/rest/v1/status_checks?select=*",
                headers={
                    "apikey": SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"
                },
            ) as resp:
                if resp.status >= 300:
                    text = await resp.text()
                    raise HTTPException(status_code=500, detail=f"Supabase fetch failed: {text}")
                data = await resp.json()
                return [StatusCheck(**row) for row in data]
    else:
        if not db:
            raise HTTPException(status_code=500, detail="Database not configured")
        status_checks = await db.status_checks.find().to_list(1000)
        return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
