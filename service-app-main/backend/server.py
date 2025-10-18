from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
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

def _generate_reply(text: str, lang: str) -> str:
    t = text.lower()
    greetings = {"hi", "hello", "hey", "namaste", "namaskar", "ಹಲೋ", "ನಮಸ್ಕಾರ"}
    ask_services = any(k in t for k in ["service", "services", "provide", "book", "price", "help", "ಬುಕ್", "ಬೆಲೆ", "ಸೇವೆ", "ಸೇವೆಗಳು"]) or t in greetings

    if lang == "kn":
        if t in greetings:
            return "ಹಲೋ! ನಾನು ಫಿಕ್ಸೋರಾ ಸಹಾಯಕ. ನಿಮಗೆ ಏನು ಸಹಾಯ ಬೇಕು? ನಮ್ಮ ಸೇವೆಗಳು: ಪ್ಲಂಬಿಂಗ್, ಎಲೆಕ್ಟ್ರಿಕಲ್, ಹೌಸ್ ಕ್ಲೀನಿಂಗ್, ಪೇಂಟಿಂಗ್. ನೀವು ಯಾವ ಸೇವೆಯನ್ನು ಹುಡುಕುತ್ತಿದ್ದೀರಿ?"
        if "price" in t or "ಬೆಲೆ" in t:
            return "ಬೆಲೆ ಸೇವೆಯ ಪ್ರಕಾರ ಮತ್ತು ಸ್ಥಳದ ಮೇಲೆ ಅವಲಂಬಿತವಾಗಿರುತ್ತದೆ. ನೀವು ಯಾವ ಸೇವೆ ಬೇಕು ಎಂದು ತಿಳಿಸಿದರೆ ಅಂದಾಜು ಕೊಡುತ್ತೇನೆ."
        if "book" in t or "ಬುಕ್" in t:
            return "ಬುಕಿಂಗ್ ಮಾಡಲು, ನೀವು ಪೂರೈಕೆದಾರರ ಪ್ರೊಫೈಲ್ ತೆರೆಯಬಹುದು ಮತ್ತು 'Book Now' ಆಯ್ಕೆಮಾಡಬಹುದು. ನೀವು ಯಾವ ಸೇವೆ ಬಯಸುತ್ತೀರಿ?"
        if ask_services:
            return "ನಾವು ನೀಡುವ ಜನಪ್ರಿಯ ಸೇವೆಗಳು: ಪ್ಲಂಬಿಂಗ್, ಎಲೆಕ್ಟ್ರಿಕಲ್, ಹೌಸ್ ಕ್ಲೀನಿಂಗ್, ಪೇಂಟಿಂಗ್. ಯಾವ ಸೇವೆಗೆ ಸಹಾಯ ಬೇಕು?"
        return f"ನಾನು ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿ ಇದ್ದೇನೆ. ನೀವು ಹೇಳಿದರು: {text}"
    else:
        if t in greetings:
            return "Hi! I’m the Fixora assistant. How can I help? Popular services: Plumbing, Electrical, Home Cleaning, Painting. Which one do you need?"
        if "price" in t or "cost" in t:
            return "Pricing depends on service type and location. Tell me the service you need and I’ll give an estimate."
        if "book" in t or "booking" in t:
            return "To book, open the provider’s profile and choose 'Book Now'. Which service do you want to book?"
        if ask_services:
            return "We offer Plumbing, Electrical, Home Cleaning, and Painting. Which service do you need help with?"
        return f"I am here to help. You said: {text}"

async def _llm_reply(text: str, lang: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return None
    system_en = (
        "You are Fixora's helpful assistant for a local services marketplace (plumbing, electrical, home cleaning, painting). "
        "Always reply concisely and help the user find or book providers."
    )
    system_kn = (
        "ನೀವು ಫಿಕ್ಸೋರಾ ಸಹಾಯಕ. ಪ್ಲಂಬಿಂಗ್, ಎಲೆಕ್ಟ್ರಿಕಲ್, ಕ್ಲೀನಿಂಗ್, ಪೇಂಟಿಂಗ್ ಸೇವೆಗಳಿಗೆ ಸಹಾಯ ಮಾಡಿ. "
        "ಹೆಚ್ಚು ಮಾತು ಬೇಡ, ಸ್ಪಷ್ಟವಾಗಿ ಮತ್ತು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ಉತ್ತರಿಸಿ."
    )
    system_prompt = system_kn if lang == "kn" else system_en
    user_prefix = "ಬಳಕೆದಾರ: " if lang == "kn" else "User: "

    payload = {
        "model": os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        "temperature": 0.3,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"{user_prefix}{text}"},
        ],
    }
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=15)) as session:
            async with session.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            ) as resp:
                if resp.status >= 300:
                    txt = await resp.text()
                    logger.warning("OpenAI error %s: %s", resp.status, txt)
                    return None
                data = await resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content")
                return content or None
    except Exception as e:
        logger.warning("LLM call failed: %s", e)
        return None

# Real-time Chatbot WebSocket
@app.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            text = data.get("text", "").strip()
            lang = data.get("lang", "en")
            if not text:
                await websocket.send_json({"sender": "bot", "text": ""})
                continue
            # Try LLM first if configured; otherwise use rule-based reply
            reply = await _llm_reply(text, lang)
            if not reply:
                reply = _generate_reply(text, lang)
            await websocket.send_json({"sender": "bot", "text": reply})
    except WebSocketDisconnect:
        return
