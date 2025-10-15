from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import boto3
import re
import base64
import qrcode
from io import BytesIO
import random
import string
from PIL import Image, ImageDraw, ImageFont
import json
import requests

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_SERVICE_ROLE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

# Create upload directory
upload_dir = Path("uploads")
upload_dir.mkdir(exist_ok=True)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Profession definitions with requirements
PROFESSIONS = {
    "electrician": {"trade_license": False, "health_permit": False, "requires_trade_license": False},
    "carpenter": {"trade_license": False, "health_permit": False, "requires_trade_license": False},
    "plumber": {"trade_license": False, "health_permit": False, "requires_trade_license": False},
    "locksmith": {"trade_license": True, "health_permit": False, "requires_trade_license": True},  # Mandatory
    "gardener": {"trade_license": False, "health_permit": False, "requires_trade_license": False},
    "photographer": {"trade_license": True, "health_permit": False, "requires_trade_license": False},  # Optional
    "videographer": {"trade_license": True, "health_permit": False, "requires_trade_license": False},  # Optional
    "hairstylist": {"trade_license": True, "health_permit": True, "requires_trade_license": False},  # Optional
    "makeup_artist": {"trade_license": True, "health_permit": True, "requires_trade_license": False},  # Optional
    "massage_therapist": {"trade_license": True, "health_permit": True, "requires_trade_license": False},  # Optional
    "henna_artist": {"trade_license": True, "health_permit": True, "requires_trade_license": False},  # Optional
    "caterer": {"trade_license": False, "health_permit": False, "requires_trade_license": False}
}

# Models
class DocumentUpload(BaseModel):
    filename: str
    content_type: str
    data: str  # base64 encoded

class ProviderRegistration(BaseModel):
    # Basic Info
    email: Optional[EmailStr] = None
    mobile_number: str
    
    # Professions - can select multiple
    professions: List[str]
    
    # Documents - stored as base64 strings
    trade_license: Optional[str] = None
    health_permit: Optional[str] = None
    certificates: Optional[List[str]] = None
    work_sample: str  # Mandatory - best work image
    
    # ID Proofs
    aadhaar_card: str
    pan_card: str
    
    # Face recognition
    face_photo: str

class Provider(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    provider_id: str  # 6 digits + 1 letter (e.g., 123456A)
    email: Optional[EmailStr] = None
    mobile_number: str
    professions: List[str]
    
    # Document flags
    has_trade_license: bool = False
    has_health_permit: bool = False
    has_certificates: bool = False
    
    # Professional status
    professional_status: Dict[str, str] = {}  # profession -> "Professional" or "Amateur/Freelancer"
    
    # Documents (stored as file paths or base64)
    documents: Dict[str, Any] = {}
    
    # Verification
    is_verified: bool = False
    verification_date: Optional[datetime] = None
    email_verified: bool = False
    email_verified_at: Optional[datetime] = None
    
    # Wallet
    wallet_balance: float = 0.0
    
    # QR Code and ID Card
    qr_code: Optional[str] = None
    id_card_path: Optional[str] = None
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

def generate_provider_id():
    """Generate unique 6-digit number + 1 letter ID"""
    digits = ''.join(random.choices(string.digits, k=6))
    letter = random.choice(string.ascii_uppercase)
    return f"{digits}{letter}"

def generate_qr_code(provider_id: str, mobile: str) -> str:
    """Generate QR code for provider"""
    qr_data = {
        "provider_id": provider_id,
        "mobile": mobile,
        "verified": True,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(json.dumps(qr_data))
    qr.make(fit=True)
    
    qr_img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = BytesIO()
    qr_img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return qr_base64

def generate_id_card(provider_id: str, mobile: str, professions: List[str], qr_code_base64: str) -> str:
    """Generate downloadable ID card"""
    # Create ID card image
    card_width, card_height = 600, 400
    card = Image.new('RGB', (card_width, card_height), color='white')
    draw = ImageDraw.Draw(card)
    
    try:
        # Try to use a font (fallback to default if not available)
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
    except:
        title_font = ImageFont.load_default()
        text_font = ImageFont.load_default()
    
    # Draw card content
    draw.text((20, 20), "SERVICE PROVIDER ID", fill='black', font=title_font)
    draw.text((20, 60), f"ID: {provider_id}", fill='black', font=text_font)
    draw.text((20, 90), f"Mobile: {mobile}", fill='black', font=text_font)
    draw.text((20, 120), f"Professions: {', '.join(professions)}", fill='black', font=text_font)
    draw.text((20, 150), "Status: VERIFIED", fill='green', font=text_font)
    
    # Add QR code
    qr_img_data = base64.b64decode(qr_code_base64)
    qr_img = Image.open(BytesIO(qr_img_data))
    qr_img = qr_img.resize((120, 120))
    card.paste(qr_img, (450, 50))
    
    # Convert to base64
    buffer = BytesIO()
    card.save(buffer, format='PNG')
    card_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return card_base64

def determine_professional_status(profession: str, has_trade_license: bool, has_health_permit: bool) -> str:
    """Determine if provider is Professional or Amateur/Freelancer"""
    prof_requirements = PROFESSIONS.get(profession, {})
    
    # For professions that require specific documents
    if profession in ['photographer', 'videographer', 'massage_therapist', 'hairstylist', 'henna_artist', 'makeup_artist']:
        # If they haven't uploaded required documents, they're Amateur/Freelancer
        if prof_requirements.get('trade_license') and not has_trade_license:
            return "Amateur/Freelancer"
        if prof_requirements.get('health_permit') and not has_health_permit:
            return "Amateur/Freelancer"
        return "Professional"
    
    return "Professional"  # Default for other professions

# Routes
@api_router.get("/")
async def root():
    return {"message": "Service Provider Registration API"}

class MobileOtpRequest(BaseModel):
    mobile_number: str

class VerifyMobileOtpRequest(BaseModel):
    mobile_number: str
    otp: str

class EmailVerifiedPersistRequest(BaseModel):
    email: Optional[EmailStr] = None
    provider_id: Optional[str] = None

def generate_otp_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def store_otp(target: str, kind: str, code: str, ttl_seconds: int = 300):
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds)
    data = {
        "target": target,
        "type": kind,
        "code": str(code),
        "expires_at": expires_at.isoformat(),
        "attempts": 0,
    }
    # Upsert by composite unique key (target, type)
    supabase.table("otps").upsert(data, on_conflict=("target,type")).execute()

async def verify_otp(target: str, kind: str, code: str) -> bool:
    res = supabase.table("otps").select("code,expires_at,attempts").eq("target", target).eq("type", kind).limit(1).maybe_single().execute()
    rec = (res.data if hasattr(res, 'data') else res).get('data') if hasattr(res, 'data') else res
    if not rec:
        return False
    expires_at = rec.get("expires_at")
    if expires_at and datetime.now(timezone.utc) > datetime.fromisoformat(expires_at):
        return False
    if str(rec.get("code")) != str(code):
        # increment attempts
        supabase.table("otps").update({"attempts": (rec.get("attempts") or 0) + 1}).eq("target", target).eq("type", kind).execute()
        return False
    # delete on success
    supabase.table("otps").delete().eq("target", target).eq("type", kind).execute()
    return True

## Removed email SMTP sender (email verification handled by Supabase)

@api_router.post("/otp/send")
async def send_mobile_otp(payload: MobileOtpRequest):
    # Accept 10-digit local numbers or E.164 (+<country><number>)
    def format_e164(mobile: str) -> str:
        if re.fullmatch(r"\+\d{10,15}", mobile):
            return mobile
        if re.fullmatch(r"\d{10}", mobile):
            cc = os.environ.get("DEFAULT_COUNTRY_CODE", "+1")
            return f"{cc}{mobile}"
        raise HTTPException(status_code=400, detail="Invalid mobile number. Use 10 digits or E.164 format like +15551234567")

    e164 = format_e164(payload.mobile_number)
    code = generate_otp_code()
    await store_otp(payload.mobile_number, "mobile", code)

    # Try sending via n8n webhook if configured
    sent_via = "logged"
    webhook_url = os.environ.get("N8N_OTP_WEBHOOK_URL")
    if webhook_url:
        try:
            resp = requests.post(
                webhook_url,
                json={
                    "mobile_number": payload.mobile_number,
                    "e164": e164,
                    "otp": code,
                },
                timeout=10,
            )
            if 200 <= resp.status_code < 300:
                sent_via = "n8n"
            else:
                logger.warning(f"n8n webhook responded with {resp.status_code}: {resp.text}")
        except Exception as ex:
            logger.warning(f"n8n webhook send failed: {ex}")

    # Fallback to AWS SNS if not sent via n8n
    if sent_via == "logged":
        try:
            region = os.environ.get("AWS_REGION") or os.environ.get("AWS_DEFAULT_REGION")
            if region:
                sns = boto3.client("sns", region_name=region)
                sms_type = os.environ.get("SNS_SMS_TYPE", "Transactional")
                sender_id = os.environ.get("SNS_SENDER_ID")
                attrs = {
                    'AWS.SNS.SMS.SMSType': {'DataType': 'String', 'StringValue': sms_type},
                }
                if sender_id:
                    attrs['AWS.SNS.SMS.SenderID'] = {'DataType': 'String', 'StringValue': sender_id[:11]}
                sns.publish(
                    PhoneNumber=e164,
                    Message=f"Your OTP code is {code}. It expires in 5 minutes.",
                    MessageAttributes=attrs,
                )
                sent_via = "sns"
            else:
                logger.info("AWS_REGION not set, skipping SNS. Logging OTP.")
        except Exception as ex:
            logger.warning(f"SNS send failed: {ex}. Falling back to logging OTP.")

    if sent_via == "logged":
        logger.info(f"Mobile OTP for {e164}: {code}")
    return {"sent": True, "delivery": sent_via}

@api_router.post("/otp/verify")
async def verify_mobile_otp(payload: VerifyMobileOtpRequest):
    if not re.fullmatch(r"\d{6}", payload.otp):
        raise HTTPException(status_code=400, detail="Invalid OTP format")
    ok = await verify_otp(payload.mobile_number, "mobile", payload.otp)
    return {"verified": ok}


## Removed email OTP endpoints (Supabase sends confirmation emails)

@api_router.patch("/provider/email-verified")
async def set_email_verified(payload: EmailVerifiedPersistRequest):
    """Persist email verified status for a provider by email or provider_id.
    Use this endpoint after Supabase confirms email to mirror state in Mongo.
    """
    query: Dict[str, Any] = {}
    if payload.email:
        query = {"email": payload.email}
    elif payload.provider_id:
        query = {"provider_id": payload.provider_id}
    else:
        raise HTTPException(status_code=400, detail="Provide either email or provider_id")

    now = datetime.now(timezone.utc)
    if "email" in query:
        res = supabase.table("providers").update({"email_verified": True, "email_verified_at": now.isoformat(), "updated_at": now.isoformat()}).eq("email", query["email"]).execute()
    else:
        res = supabase.table("providers").update({"email_verified": True, "email_verified_at": now.isoformat(), "updated_at": now.isoformat()}).eq("provider_id", query["provider_id"]).execute()
    updated = len(getattr(res, 'data', []) or [])
    if updated == 0:
        raise HTTPException(status_code=404, detail="Provider not found for given identifier")
    return {"updated": updated}

class SupabaseUserPayload(BaseModel):
    email: Optional[str] = None
    email_confirmed_at: Optional[str] = None
    user: Optional[Dict[str, Any]] = None
    record: Optional[Dict[str, Any]] = None
    event: Optional[str] = None

@api_router.post("/supabase/auth-webhook")
async def supabase_auth_webhook(payload: SupabaseUserPayload):
    """Webhook to mirror Supabase email verification into providers.
    Configure this endpoint in Supabase Auth hooks (user update) or Edge Function.
    """
    # Extract email and confirmation timestamp
    email = payload.email or (payload.user or {}).get("email") or (payload.record or {}).get("email")
    confirmed_at = payload.email_confirmed_at or (payload.user or {}).get("email_confirmed_at") or (payload.record or {}).get("email_confirmed_at")
    if not email:
        raise HTTPException(status_code=400, detail="Email not provided in webhook payload")
    if not confirmed_at:
        # Nothing to mirror if not confirmed
        return {"updated": 0, "message": "email_confirmed_at not set"}

    now = datetime.now(timezone.utc)
    res = supabase.table("providers").update({
        "email_verified": True,
        "email_verified_at": confirmed_at,
        "updated_at": now.isoformat(),
    }).eq("email", email).execute()
    updated = len(getattr(res, 'data', []) or [])
    return {"updated": updated}

@api_router.get("/professions")
async def get_professions():
    """Get all available professions with their requirements"""
    return {
        "professions": [
            {
                "id": key,
                "name": key.replace('_', ' ').title(),
                "requires_trade_license": value["requires_trade_license"],
                "optional_trade_license": value["trade_license"] and not value["requires_trade_license"],
                "optional_health_permit": value["health_permit"]
            }
            for key, value in PROFESSIONS.items()
        ]
    }

@api_router.post("/register", response_model=Provider)
async def register_provider(
    email: Optional[EmailStr] = Form(None),
    mobile_number: str = Form(...),
    professions: List[str] = Form(...),
    trade_license: Optional[UploadFile] = File(None),
    health_permit: Optional[UploadFile] = File(None),
    certificates: Optional[List[UploadFile]] = File(None),
    work_sample: UploadFile = File(...),
    aadhaar_card: UploadFile = File(...),
    pan_card: UploadFile = File(...),
    face_photo: UploadFile = File(...),
):
    """Register a new service provider (multipart/form-data).
    - Accepts files via UploadFile for documents and images.
    - Keeps business logic (QR/ID generation, provider ID, status) intact.
    """

    # --- Validate professions ---
    for profession in professions:
        if profession not in PROFESSIONS:
            raise HTTPException(status_code=400, detail=f"Invalid profession: {profession}")

    # --- Check mandatory requirements ---
    for profession in professions:
        if profession == "locksmith" and not trade_license:
            raise HTTPException(status_code=400, detail="Trade License is mandatory for Locksmiths")

    # --- Check mobile number uniqueness ---
    existing_provider = supabase.table("providers").select("provider_id").eq("mobile_number", mobile_number).limit(1).maybe_single().execute()
    if (getattr(existing_provider, 'data', None) or {}).get('provider_id'):
        raise HTTPException(status_code=400, detail="Provider with this mobile number already exists")

    # --- Generate unique provider ID ---
    provider_id = generate_provider_id()
    while True:
        check = supabase.table("providers").select("provider_id").eq("provider_id", provider_id).limit(1).maybe_single().execute()
        if not (getattr(check, 'data', None) or {}).get('provider_id'):
            break
        provider_id = generate_provider_id()

    # --- Save uploaded files ---
    def save_file(file: UploadFile) -> str:
        file_path = upload_dir / f"{uuid.uuid4()}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        return str(file_path)

    documents: Dict[str, Any] = {}
    if trade_license:
        documents["trade_license"] = save_file(trade_license)
    if health_permit:
        documents["health_permit"] = save_file(health_permit)
    documents["work_sample"] = save_file(work_sample)
    documents["aadhaar_card"] = save_file(aadhaar_card)
    documents["pan_card"] = save_file(pan_card)
    documents["face_photo"] = save_file(face_photo)
    if certificates:
        documents["certificates"] = [save_file(cert) for cert in certificates]

    # --- Determine professional status ---
    professional_status: Dict[str, str] = {}
    for profession in professions:
        status = determine_professional_status(
            profession,
            bool(trade_license),
            bool(health_permit),
        )
        professional_status[profession] = status

    # --- Generate QR code and ID card ---
    qr_code = generate_qr_code(provider_id, mobile_number)
    id_card = generate_id_card(provider_id, mobile_number, professions, qr_code)

    # --- Create Provider object ---
    provider = Provider(
        provider_id=provider_id,
        email=email,
        mobile_number=mobile_number,
        professions=professions,
        has_trade_license=bool(trade_license),
        has_health_permit=bool(health_permit),
        has_certificates=bool(certificates),
        professional_status=professional_status,
        documents=documents,
        is_verified=True,  # Auto-verify for MVP
        verification_date=datetime.now(timezone.utc),
        qr_code=qr_code,
        id_card_path=id_card,
    )

    # --- Save to Supabase ---
    supabase.table("providers").insert(provider.dict()).execute()

    return provider

@api_router.get("/provider/{provider_id}", response_model=Provider)
async def get_provider(provider_id: str):
    """Get provider details"""
    res = supabase.table("providers").select("*").eq("provider_id", provider_id).limit(1).maybe_single().execute()
    provider = getattr(res, 'data', None)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return Provider(**provider)

@api_router.get("/provider/{provider_id}/id-card")
async def download_id_card(provider_id: str):
    """Download provider ID card"""
    res = supabase.table("providers").select("id_card_path").eq("provider_id", provider_id).limit(1).maybe_single().execute()
    provider = getattr(res, 'data', None)
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    if not provider.get('id_card_path'):
        raise HTTPException(status_code=404, detail="ID card not found")
    
    # Return base64 encoded ID card
    return {
        "id_card": provider['id_card_path'],
        "provider_id": provider_id,
        "format": "base64_png"
    }

@api_router.patch("/provider/{provider_id}/wallet")
async def update_wallet(provider_id: str, amount: float):
    """Update provider wallet balance"""
    # Read-modify-write (non-atomic). Prefer DB function/constraint in production.
    res = supabase.table("providers").select("wallet_balance").eq("provider_id", provider_id).limit(1).maybe_single().execute()
    current = (getattr(res, 'data', None) or {}).get('wallet_balance')
    if current is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    new_balance = float(current) + float(amount)
    supabase.table("providers").update({"wallet_balance": new_balance, "updated_at": datetime.now(timezone.utc).isoformat()}).eq("provider_id", provider_id).execute()
    
    return {"message": "Wallet updated successfully"}

@api_router.get("/providers", response_model=List[Provider])
async def list_providers():
    """List all providers (for admin)"""
    res = supabase.table("providers").select("*").limit(1000).execute()
    rows = getattr(res, 'data', []) or []
    return [Provider(**provider) for provider in rows]

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
    # No explicit shutdown needed for Supabase client
    pass
