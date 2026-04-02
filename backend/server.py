from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Request
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import uuid
import struct
import math
from datetime import datetime, timedelta, timezone
import re
from bson import ObjectId
import openai
import stripe as stripe_lib
import io
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=True)

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Initialize OpenAI client
openai_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY")
openai_client = openai.AsyncOpenAI(api_key=openai_api_key)

# Initialize Stripe
stripe_api_key = os.getenv("STRIPE_API_KEY", "sk_test_emergent")
stripe_lib.api_key = stripe_api_key

PREMIUM_PACKAGES: Dict[str, Dict[str, object]] = {
    "hair_glow": {"title": "Beauty Glow", "amount": 4.99, "purchase_type": "pack"},
    "weight_loss": {"title": "Weight Loss Metabolism", "amount": 4.99, "purchase_type": "pack"},
    "anti_age": {"title": "Anti-Aging Rejuvenation", "amount": 4.99, "purchase_type": "pack"},
    "stress_relief": {"title": "Stress Relief Calm", "amount": 4.99, "purchase_type": "pack"},
    "energy_boost": {"title": "Energy Boost", "amount": 4.99, "purchase_type": "pack"},
    "lifetime_unlock": {"title": "Lifetime Unlock All", "amount": 49.00, "purchase_type": "lifetime"},
}

# ===================== MODELS =====================

class Task(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    type: str = "note"
    status: str = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(hours=24))
    saved: bool = False
    reminder_time: Optional[datetime] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = "note"
    reminder_time: Optional[str] = None

class StressMetrics(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    speech_rate: float
    volume_variance: float
    pause_count: int
    stress_level: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class CalmStreak(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    calm_sessions: int
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class FrequencySchedule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    frequency_id: str
    frequency_name: str
    schedule_type: str
    time: Optional[str] = None
    duration_minutes: int = 30
    enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    message: str
    context: Optional[str] = None


class VoiceMoodAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    transcription: str
    detected_mood: str  # happy, sad, anxious, stressed, calm, tired, energetic, neutral
    stress_level: int  # 1-10 scale
    energy_level: int  # 1-10 scale
    mood_confidence: float  # 0-1 confidence score
    emotional_indicators: List[str]  # Keywords/phrases that indicate mood
    recommended_frequencies: List[Dict]  # List of recommended frequency sessions
    personalized_plan: Dict  # Full wellness plan
    analysis_summary: str  # Human-readable summary
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class PremiumCheckoutRequest(BaseModel):
    pack_id: str
    return_url: str


class PaymentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    pack_id: str
    pack_title: str
    purchase_type: str
    amount: float
    currency: str = "usd"
    status: str = "initiated"
    payment_status: str = "pending"
    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class PaymentIntentRequest(BaseModel):
    pack_id: str


class PaymentIntentTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    payment_intent_id: str
    pack_id: str
    pack_title: str
    purchase_type: str
    amount: float
    currency: str = "usd"
    status: str = "created"
    payment_status: str = "pending"
    metadata: Dict[str, str] = Field(default_factory=dict)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


def validate_return_url(return_url: str) -> str:
    if return_url.startswith("freqflow://") or return_url.startswith("http://") or return_url.startswith("https://"):
        return return_url.rstrip("/")
    raise HTTPException(status_code=400, detail="Invalid return URL")


def get_premium_package(pack_id: str) -> Dict[str, object]:
    premium_package = PREMIUM_PACKAGES.get(pack_id)
    if not premium_package:
        raise HTTPException(status_code=400, detail="Invalid premium pack")
    return premium_package


def add_query_params(base_url: str, query_string: str) -> str:
    separator = "&" if "?" in base_url else "?"
    return f"{base_url}{separator}{query_string}"

# ===================== MASSIVE FREQUENCY CATALOG =====================

FREQUENCY_CATALOG = [
    # ─── SLEEP & REST ───
    {
        "id": "deep_sleep",
        "name": "Deep Sleep",
        "category": "Sleep",
        "frequency_hz": 2,
        "base_hz": 200,
        "description": "Delta waves guide your brain into the deepest stage of sleep. Shuts down racing thoughts like flipping a switch.",
        "benefits": ["Fall asleep faster", "Deeper sleep cycles", "Wake refreshed", "Beat insomnia"],
        "icon": "moon",
        "color": "#4a00e0",
        "gradient": ["#4a00e0", "#8e2de2"],
        "duration_options": [15, 30, 60, 120],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "sleep_apnea",
        "name": "Sleep Apnea Relief",
        "category": "Sleep",
        "frequency_hz": 3,
        "base_hz": 174,
        "description": "Ultra-low delta frequencies that promote relaxed breathing patterns and deeper oxygen-rich sleep.",
        "benefits": ["Calmer breathing", "Deeper oxygen flow", "Relaxed airways", "Restful night"],
        "icon": "cloud",
        "color": "#6c5ce7",
        "gradient": ["#6c5ce7", "#a29bfe"],
        "duration_options": [30, 60, 120, 240],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "lucid_dreaming",
        "name": "Lucid Dreaming",
        "category": "Sleep",
        "frequency_hz": 6.3,
        "base_hz": 200,
        "description": "Theta frequencies tuned to the lucid dream state. Take control of your dream world tonight.",
        "benefits": ["Control your dreams", "Enhanced awareness", "Creative dreams", "Self-discovery"],
        "icon": "eye",
        "color": "#6c5ce7",
        "gradient": ["#6c5ce7", "#4a00e0"],
        "duration_options": [30, 60, 90],
        "best_time": "sleep",
        "intensity": "moderate"
    },
    {
        "id": "night_terrors",
        "name": "Peaceful Dreams",
        "category": "Sleep",
        "frequency_hz": 4,
        "base_hz": 200,
        "description": "Calming theta waves that gently guide your subconscious into peaceful dreamscapes. No more nightmares.",
        "benefits": ["Stop nightmares", "Peaceful sleep", "Calmer subconscious", "Feel safe"],
        "icon": "shield-checkmark",
        "color": "#a29bfe",
        "gradient": ["#a29bfe", "#6c5ce7"],
        "duration_options": [30, 60, 120],
        "best_time": "sleep",
        "intensity": "gentle"
    },

    # ─── STRESS & ANXIETY ───
    {
        "id": "stress_relief",
        "name": "Stress Melt",
        "category": "Calm",
        "frequency_hz": 10,
        "base_hz": 200,
        "description": "Alpha waves that dissolve tension like ice in warm water. Your go-to when life gets heavy.",
        "benefits": ["Melt tension", "Lower cortisol", "Feel centered", "Emotional balance"],
        "icon": "water",
        "color": "#00ccff",
        "gradient": ["#00ccff", "#0088ff"],
        "duration_options": [10, 20, 30, 45],
        "best_time": "anytime",
        "intensity": "moderate"
    },
    {
        "id": "anxiety_relief",
        "name": "Anxiety Shield",
        "category": "Calm",
        "frequency_hz": 10,
        "base_hz": 180,
        "description": "Specifically tuned to silence racing thoughts and calm your nervous system. Breathe in, breathe out.",
        "benefits": ["Stop racing thoughts", "Calm panic attacks", "Soothe nerves", "Ground yourself"],
        "icon": "leaf",
        "color": "#00d4aa",
        "gradient": ["#00d4aa", "#00b894"],
        "duration_options": [5, 10, 20, 30],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "ptsd_healing",
        "name": "Trauma Release",
        "category": "Calm",
        "frequency_hz": 10,
        "base_hz": 396,
        "description": "Combines alpha brainwaves with the 396 Hz Solfeggio frequency for liberation from fear and emotional trauma.",
        "benefits": ["Release fear", "Process trauma", "Emotional freedom", "Feel safe again"],
        "icon": "heart",
        "color": "#00b894",
        "gradient": ["#00b894", "#00d4aa"],
        "duration_options": [15, 30, 45, 60],
        "best_time": "anytime",
        "intensity": "gentle"
    },

    # ─── DEPRESSION & MOOD ───
    {
        "id": "depression_lift",
        "name": "Depression Fighter",
        "category": "Mood",
        "frequency_hz": 10,
        "base_hz": 396,
        "description": "Lifts the heavy fog. 396 Hz releases guilt and fear while alpha waves reset your emotional baseline. You deserve to feel good.",
        "benefits": ["Lift heavy mood", "Release guilt", "Find motivation", "Feel lighter"],
        "icon": "sunny",
        "color": "#fdcb6e",
        "gradient": ["#fdcb6e", "#f39c12"],
        "duration_options": [15, 30, 45, 60],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "mood_boost",
        "name": "Mood Sunshine",
        "category": "Mood",
        "frequency_hz": 12,
        "base_hz": 528,
        "description": "The miracle frequency 528 Hz + alpha waves. Stimulates your brain's feel-good chemistry naturally. Sunshine in your ears.",
        "benefits": ["Elevate mood", "Natural serotonin", "Feel optimistic", "Inner joy"],
        "icon": "happy",
        "color": "#2ecc71",
        "gradient": ["#2ecc71", "#00b894"],
        "duration_options": [15, 30, 45],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "self_love",
        "name": "Self Love",
        "category": "Mood",
        "frequency_hz": 10,
        "base_hz": 639,
        "description": "639 Hz - the frequency of connection and love, turned inward. Learn to love yourself the way you deserve.",
        "benefits": ["Self acceptance", "Inner peace", "Heal self-worth", "Radiate love"],
        "icon": "heart-circle",
        "color": "#fd79a8",
        "gradient": ["#fd79a8", "#e84393"],
        "duration_options": [15, 30, 45],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "confidence",
        "name": "Confidence Builder",
        "category": "Mood",
        "frequency_hz": 14,
        "base_hz": 396,
        "description": "Beta brainwaves for alertness combined with 396 Hz to crush self-doubt. Walk into any room like you own it.",
        "benefits": ["Crush self-doubt", "Bold energy", "Speak up", "Own your space"],
        "icon": "trophy",
        "color": "#e17055",
        "gradient": ["#e17055", "#d63031"],
        "duration_options": [10, 20, 30],
        "best_time": "morning",
        "intensity": "energizing"
    },

    # ─── FOCUS & MIND ───
    {
        "id": "laser_focus",
        "name": "Laser Focus",
        "category": "Focus",
        "frequency_hz": 18,
        "base_hz": 200,
        "description": "Beta waves sharpen your mind like a blade. Lock in for deep work. Distractions don't exist here.",
        "benefits": ["Razor-sharp focus", "Deep work mode", "Block distractions", "Mental clarity"],
        "icon": "flash",
        "color": "#fdcb6e",
        "gradient": ["#fdcb6e", "#f39c12"],
        "duration_options": [15, 30, 45, 60],
        "best_time": "morning",
        "intensity": "energizing"
    },
    {
        "id": "memory_boost",
        "name": "Memory Boost",
        "category": "Focus",
        "frequency_hz": 12,
        "base_hz": 200,
        "description": "Alpha-Beta bridge frequency for enhanced memory encoding and recall. Remember everything.",
        "benefits": ["Better recall", "Faster learning", "Study aid", "Mental sharpness"],
        "icon": "bulb",
        "color": "#00cec9",
        "gradient": ["#00cec9", "#0984e3"],
        "duration_options": [15, 30, 45, 60],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "adhd_focus",
        "name": "ADHD Focus",
        "category": "Focus",
        "frequency_hz": 18,
        "base_hz": 200,
        "description": "Specifically calibrated beta waves that help scattered minds find their center. Focus isn't broken, just untrained.",
        "benefits": ["Tame scattered thoughts", "Single-task mode", "Calm hyperactivity", "Sustained attention"],
        "icon": "locate",
        "color": "#0984e3",
        "gradient": ["#0984e3", "#6c5ce7"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "morning",
        "intensity": "energizing"
    },
    {
        "id": "creativity_flow",
        "name": "Creative Flow",
        "category": "Focus",
        "frequency_hz": 7.5,
        "base_hz": 200,
        "description": "Theta-Alpha border where genius lives. Ideas flow like water. Your inner artist wakes up.",
        "benefits": ["Unlock creativity", "Break mental blocks", "Artistic flow", "Wild ideas"],
        "icon": "color-palette",
        "color": "#fd79a8",
        "gradient": ["#fd79a8", "#e84393"],
        "duration_options": [15, 30, 45, 60],
        "best_time": "anytime",
        "intensity": "moderate"
    },
    {
        "id": "study_mode",
        "name": "Study Mode",
        "category": "Focus",
        "frequency_hz": 14,
        "base_hz": 200,
        "description": "The perfect study companion. Low beta waves keep you alert but relaxed enough to absorb information like a sponge.",
        "benefits": ["Absorb info faster", "Stay alert", "Better comprehension", "Exam ready"],
        "icon": "book",
        "color": "#74b9ff",
        "gradient": ["#74b9ff", "#0984e3"],
        "duration_options": [30, 45, 60, 90],
        "best_time": "morning",
        "intensity": "moderate"
    },

    # ─── ENERGY & PERFORMANCE ───
    {
        "id": "energy_boost",
        "name": "Energy Surge",
        "category": "Energy",
        "frequency_hz": 40,
        "base_hz": 200,
        "description": "Gamma waves fire up every neuron. Like espresso for your brain without the crash. Peak performance mode.",
        "benefits": ["Instant energy", "Peak performance", "No crash", "Full power"],
        "icon": "rocket",
        "color": "#e17055",
        "gradient": ["#e17055", "#d63031"],
        "duration_options": [10, 15, 20, 30],
        "best_time": "morning",
        "intensity": "energizing"
    },
    {
        "id": "athletic_performance",
        "name": "Athletic Edge",
        "category": "Energy",
        "frequency_hz": 40,
        "base_hz": 200,
        "description": "Gamma state for physical peak performance. Sharper reflexes, better coordination, stronger drive.",
        "benefits": ["Peak reflexes", "Stronger drive", "Better coordination", "Push limits"],
        "icon": "fitness",
        "color": "#ff7675",
        "gradient": ["#ff7675", "#d63031"],
        "duration_options": [10, 20, 30],
        "best_time": "morning",
        "intensity": "energizing"
    },
    {
        "id": "morning_energy",
        "name": "Morning Kickstart",
        "category": "Energy",
        "frequency_hz": 14,
        "base_hz": 528,
        "description": "The perfect morning alarm replacement. Gentle beta waves with 528 Hz miracles to start your day with intention.",
        "benefits": ["Wake up energized", "Positive morning", "Set intentions", "Beat grogginess"],
        "icon": "sunny",
        "color": "#ffeaa7",
        "gradient": ["#ffeaa7", "#fdcb6e"],
        "duration_options": [10, 15, 20],
        "best_time": "morning",
        "intensity": "energizing"
    },

    # ─── BEAUTY & ANTI-AGING ───
    {
        "id": "anti_aging",
        "name": "Anti-Aging Rejuvenation",
        "category": "Beauty",
        "frequency_hz": 10,
        "base_hz": 285,
        "description": "285 Hz promotes cellular regeneration. Combined with alpha waves for deep relaxation that lets your body repair and renew.",
        "benefits": ["Cellular renewal", "Slow aging process", "Youthful energy", "Deep repair"],
        "icon": "sparkles",
        "color": "#fd79a8",
        "gradient": ["#fd79a8", "#e84393"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "clear_skin",
        "name": "Clear Skin Glow",
        "category": "Beauty",
        "frequency_hz": 10,
        "base_hz": 741,
        "description": "741 Hz detox frequency clears toxins while alpha waves reduce stress — the #1 cause of breakouts. Glow from within.",
        "benefits": ["Clear breakouts", "Detox skin", "Reduce inflammation", "Natural glow"],
        "icon": "star",
        "color": "#dfe6e9",
        "gradient": ["#dfe6e9", "#b2bec3"],
        "duration_options": [20, 30, 45],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "beauty_radiance",
        "name": "Beauty Radiance",
        "category": "Beauty",
        "frequency_hz": 10,
        "base_hz": 528,
        "description": "528 Hz — the love frequency — combined with deep relaxation. When you're at peace inside, beauty radiates outside.",
        "benefits": ["Inner radiance", "Collagen support", "Stress-free beauty", "Youthful glow"],
        "icon": "diamond",
        "color": "#e84393",
        "gradient": ["#e84393", "#fd79a8"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "hair_growth",
        "name": "Hair Growth",
        "category": "Beauty",
        "frequency_hz": 10,
        "base_hz": 295,
        "description": "Frequencies that promote blood circulation to scalp follicles. Relaxation reduces cortisol — a major hair loss trigger.",
        "benefits": ["Stimulate follicles", "Reduce hair loss", "Thicker hair", "Scalp health"],
        "icon": "leaf",
        "color": "#00b894",
        "gradient": ["#00b894", "#00cec9"],
        "duration_options": [20, 30, 45],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "weight_loss",
        "name": "Weight Loss Support",
        "category": "Beauty",
        "frequency_hz": 10,
        "base_hz": 295,
        "description": "Alpha waves reduce cortisol (belly fat hormone) while specific frequencies boost metabolism. Your body knows how to be healthy.",
        "benefits": ["Reduce stress eating", "Boost metabolism", "Lower cortisol", "Healthy cravings"],
        "icon": "scale",
        "color": "#00cec9",
        "gradient": ["#00cec9", "#00b894"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "anytime",
        "intensity": "moderate"
    },

    # ─── PAIN & HEALING ───
    {
        "id": "headache_relief",
        "name": "Headache Killer",
        "category": "Pain",
        "frequency_hz": 10,
        "base_hz": 174,
        "description": "174 Hz — the foundation of pain relief. Soothing alpha waves ease tension headaches and migraines naturally.",
        "benefits": ["Ease headaches", "Reduce migraines", "Relax tension", "Natural relief"],
        "icon": "bandage",
        "color": "#74b9ff",
        "gradient": ["#74b9ff", "#0984e3"],
        "duration_options": [10, 20, 30],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "chronic_pain",
        "name": "Pain Management",
        "category": "Pain",
        "frequency_hz": 4,
        "base_hz": 174,
        "description": "Deep delta waves + 174 Hz foundation frequency. Your brain's natural painkillers activated. Not a cure, but a companion.",
        "benefits": ["Natural pain relief", "Endorphin release", "Muscle relaxation", "Better tolerance"],
        "icon": "medkit",
        "color": "#a29bfe",
        "gradient": ["#a29bfe", "#6c5ce7"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "wound_healing",
        "name": "Wound Healing",
        "category": "Pain",
        "frequency_hz": 4,
        "base_hz": 285,
        "description": "285 Hz is known for tissue repair and cellular regeneration. Let your body's natural healing process work while you rest.",
        "benefits": ["Faster healing", "Tissue repair", "Reduce inflammation", "Cell regeneration"],
        "icon": "pulse",
        "color": "#55efc4",
        "gradient": ["#55efc4", "#00b894"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "back_pain",
        "name": "Back & Joint Relief",
        "category": "Pain",
        "frequency_hz": 6,
        "base_hz": 174,
        "description": "Theta relaxation with pain-foundation 174 Hz. Targets deep muscle tension and joint inflammation naturally.",
        "benefits": ["Ease back pain", "Joint relief", "Deep muscle relax", "Spine decompression"],
        "icon": "body",
        "color": "#81ecec",
        "gradient": ["#81ecec", "#00cec9"],
        "duration_options": [20, 30, 45],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "tooth_healing",
        "name": "Dental Healing",
        "category": "Pain",
        "frequency_hz": 6,
        "base_hz": 285,
        "description": "285 Hz cellular repair frequency targeted for oral health. Promotes tissue regeneration and reduces dental inflammation.",
        "benefits": ["Gum health", "Reduce tooth pain", "Tissue repair", "Oral healing"],
        "icon": "happy",
        "color": "#dfe6e9",
        "gradient": ["#dfe6e9", "#74b9ff"],
        "duration_options": [15, 30, 45],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "bone_healing",
        "name": "Bone Strengthening",
        "category": "Pain",
        "frequency_hz": 40,
        "base_hz": 285,
        "description": "Research shows 40 Hz vibrations promote bone density. Combined with 285 Hz cellular repair for skeletal health.",
        "benefits": ["Bone density", "Fracture recovery", "Stronger skeleton", "Joint support"],
        "icon": "fitness",
        "color": "#b2bec3",
        "gradient": ["#b2bec3", "#636e72"],
        "duration_options": [20, 30, 45],
        "best_time": "anytime",
        "intensity": "moderate"
    },
    {
        "id": "muscle_recovery",
        "name": "Muscle Recovery",
        "category": "Pain",
        "frequency_hz": 6,
        "base_hz": 174,
        "description": "Post-workout recovery accelerator. Theta waves promote growth hormone release while 174 Hz eases sore muscles.",
        "benefits": ["Faster recovery", "Reduce soreness", "Growth hormone", "Ready for tomorrow"],
        "icon": "barbell",
        "color": "#00cec9",
        "gradient": ["#00cec9", "#00b894"],
        "duration_options": [20, 30, 45],
        "best_time": "sleep",
        "intensity": "gentle"
    },

    # ─── BODY & HEALTH ───
    {
        "id": "immune_boost",
        "name": "Immune Shield",
        "category": "Health",
        "frequency_hz": 10,
        "base_hz": 285,
        "description": "Alpha relaxation boosts immune function up to 50%. Combined with 285 Hz cellular repair. Your body's defense system activated.",
        "benefits": ["Stronger immunity", "Fight illness", "Cell repair", "Stay healthy"],
        "icon": "shield",
        "color": "#55efc4",
        "gradient": ["#55efc4", "#00b894"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "detox",
        "name": "Full Body Detox",
        "category": "Health",
        "frequency_hz": 10,
        "base_hz": 741,
        "description": "741 Hz — the cleansing frequency. Purifies cells, clears toxins, awakens intuition. A sonic reset for your entire system.",
        "benefits": ["Cellular detox", "Clear toxins", "Liver support", "Fresh start"],
        "icon": "water",
        "color": "#00b894",
        "gradient": ["#00b894", "#55efc4"],
        "duration_options": [20, 30, 45],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "blood_pressure",
        "name": "Blood Pressure Calm",
        "category": "Health",
        "frequency_hz": 10,
        "base_hz": 639,
        "description": "Alpha waves lower blood pressure naturally by calming the autonomic nervous system. 639 Hz harmonizes heart energy.",
        "benefits": ["Lower BP naturally", "Calm heart rate", "Reduce hypertension", "Cardiovascular health"],
        "icon": "heart",
        "color": "#ff7675",
        "gradient": ["#ff7675", "#d63031"],
        "duration_options": [15, 20, 30],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "digestion",
        "name": "Gut Health",
        "category": "Health",
        "frequency_hz": 10,
        "base_hz": 317,
        "description": "Stress destroys your gut. Alpha waves reset the gut-brain axis while specific frequencies soothe digestive inflammation.",
        "benefits": ["Better digestion", "Reduce bloating", "Gut-brain healing", "IBS relief"],
        "icon": "nutrition",
        "color": "#ffeaa7",
        "gradient": ["#ffeaa7", "#fdcb6e"],
        "duration_options": [15, 20, 30],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "hormone_balance",
        "name": "Hormone Balance",
        "category": "Health",
        "frequency_hz": 10,
        "base_hz": 528,
        "description": "528 Hz DNA repair frequency combined with alpha state promotes endocrine system balance. Your hormones find their rhythm.",
        "benefits": ["Balance hormones", "Reduce PMS", "Better thyroid", "Endocrine harmony"],
        "icon": "sync",
        "color": "#a29bfe",
        "gradient": ["#a29bfe", "#fd79a8"],
        "duration_options": [20, 30, 45],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "eye_health",
        "name": "Eye Relaxation",
        "category": "Health",
        "frequency_hz": 10,
        "base_hz": 528,
        "description": "Alpha state relaxes strained eye muscles while 528 Hz promotes cellular repair. Essential for screen-heavy lifestyles.",
        "benefits": ["Reduce eye strain", "Better vision support", "Relax eye muscles", "Screen recovery"],
        "icon": "eye",
        "color": "#74b9ff",
        "gradient": ["#74b9ff", "#0984e3"],
        "duration_options": [10, 15, 20],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "dna_repair",
        "name": "DNA Repair",
        "category": "Health",
        "frequency_hz": 6,
        "base_hz": 528,
        "description": "528 Hz — the miracle tone. Scientists call it the DNA repair frequency. Deep theta meditation amplifies its power.",
        "benefits": ["DNA repair", "Cellular healing", "Genetic harmony", "Deep restoration"],
        "icon": "infinite",
        "color": "#00ccff",
        "gradient": ["#00ccff", "#6c5ce7"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "sleep",
        "intensity": "gentle"
    },

    # ─── CHAKRA BALANCE ───
    {
        "id": "root_chakra",
        "name": "Root Chakra (Muladhara)",
        "category": "Chakra",
        "frequency_hz": 8,
        "base_hz": 396,
        "description": "396 Hz — liberation from fear and guilt. Grounds you like roots of an ancient tree. Security, stability, survival.",
        "benefits": ["Feel grounded", "Release fear", "Financial security", "Physical safety"],
        "icon": "globe",
        "color": "#d63031",
        "gradient": ["#d63031", "#e17055"],
        "duration_options": [15, 20, 30],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "sacral_chakra",
        "name": "Sacral Chakra (Svadhisthana)",
        "category": "Chakra",
        "frequency_hz": 8,
        "base_hz": 417,
        "description": "417 Hz — undoing situations, facilitating change. Unlocks creativity, passion, and emotional fluidity.",
        "benefits": ["Unlock passion", "Creative energy", "Emotional flow", "Healthy desires"],
        "icon": "water",
        "color": "#e17055",
        "gradient": ["#e17055", "#fdcb6e"],
        "duration_options": [15, 20, 30],
        "best_time": "anytime",
        "intensity": "moderate"
    },
    {
        "id": "solar_plexus",
        "name": "Solar Plexus (Manipura)",
        "category": "Chakra",
        "frequency_hz": 8,
        "base_hz": 528,
        "description": "528 Hz — transformation and miracles. Fire up your personal power center. Confidence, willpower, purpose.",
        "benefits": ["Personal power", "Strong willpower", "Self-confidence", "Inner fire"],
        "icon": "sunny",
        "color": "#fdcb6e",
        "gradient": ["#fdcb6e", "#f39c12"],
        "duration_options": [15, 20, 30],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "heart_chakra",
        "name": "Heart Chakra (Anahata)",
        "category": "Chakra",
        "frequency_hz": 8,
        "base_hz": 639,
        "description": "639 Hz — connecting and relationships. Open your heart center. Unconditional love, compassion, forgiveness.",
        "benefits": ["Open heart", "Heal relationships", "Forgiveness", "Unconditional love"],
        "icon": "heart",
        "color": "#00b894",
        "gradient": ["#00b894", "#55efc4"],
        "duration_options": [15, 20, 30],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "throat_chakra",
        "name": "Throat Chakra (Vishuddha)",
        "category": "Chakra",
        "frequency_hz": 8,
        "base_hz": 741,
        "description": "741 Hz — expression and truth. Speak your truth fearlessly. Communication, authenticity, self-expression.",
        "benefits": ["Speak your truth", "Clear communication", "Authentic voice", "Express yourself"],
        "icon": "mic",
        "color": "#0984e3",
        "gradient": ["#0984e3", "#74b9ff"],
        "duration_options": [15, 20, 30],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "third_eye",
        "name": "Third Eye (Ajna)",
        "category": "Chakra",
        "frequency_hz": 6,
        "base_hz": 852,
        "description": "852 Hz — returning to spiritual order. Activate your inner vision. Intuition, wisdom, clarity beyond the physical.",
        "benefits": ["Heighten intuition", "Inner wisdom", "Clear vision", "Spiritual sight"],
        "icon": "eye",
        "color": "#6c5ce7",
        "gradient": ["#6c5ce7", "#a29bfe"],
        "duration_options": [15, 20, 30, 45],
        "best_time": "anytime",
        "intensity": "moderate"
    },
    {
        "id": "crown_chakra",
        "name": "Crown Chakra (Sahasrara)",
        "category": "Chakra",
        "frequency_hz": 4,
        "base_hz": 963,
        "description": "963 Hz — divine connection. The highest Solfeggio frequency. Cosmic consciousness, enlightenment, oneness.",
        "benefits": ["Divine connection", "Enlightenment", "Cosmic awareness", "Pure consciousness"],
        "icon": "prism",
        "color": "#dfe6e9",
        "gradient": ["#dfe6e9", "#b2bec3"],
        "duration_options": [15, 20, 30, 45],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "full_chakra",
        "name": "Full Chakra Alignment",
        "category": "Chakra",
        "frequency_hz": 7.83,
        "base_hz": 528,
        "description": "Schumann Resonance (Earth's heartbeat) at 7.83 Hz aligns all seven chakras simultaneously. Total energetic reset.",
        "benefits": ["Align all chakras", "Earth connection", "Full body harmony", "Energetic reset"],
        "icon": "sync-circle",
        "color": "#00ccff",
        "gradient": ["#00ccff", "#6c5ce7"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "morning",
        "intensity": "moderate"
    },

    # ─── MEDITATION & SPIRITUAL ───
    {
        "id": "deep_meditation",
        "name": "Deep Meditation",
        "category": "Meditation",
        "frequency_hz": 6,
        "base_hz": 200,
        "description": "Theta waves take you deeper than you've ever gone. Like having a Zen master guide you into stillness.",
        "benefits": ["Profound stillness", "Ego dissolution", "Inner peace", "Spiritual depth"],
        "icon": "flower",
        "color": "#6c5ce7",
        "gradient": ["#6c5ce7", "#a29bfe"],
        "duration_options": [10, 20, 30, 60],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "manifestation",
        "name": "Manifestation",
        "category": "Meditation",
        "frequency_hz": 6,
        "base_hz": 963,
        "description": "963 Hz divine frequency in deep theta state. The frequency of manifestation. Think it, feel it, become it.",
        "benefits": ["Manifest desires", "Attract abundance", "Align intentions", "Create reality"],
        "icon": "sparkles",
        "color": "#ffeaa7",
        "gradient": ["#ffeaa7", "#fdcb6e"],
        "duration_options": [15, 20, 30],
        "best_time": "morning",
        "intensity": "moderate"
    },
    {
        "id": "grounding",
        "name": "Earth Grounding",
        "category": "Meditation",
        "frequency_hz": 7.83,
        "base_hz": 200,
        "description": "7.83 Hz — the Schumann Resonance, Earth's natural heartbeat. Reconnect with the planet beneath your feet.",
        "benefits": ["Connect to earth", "Feel present", "Reduce EMF stress", "Natural reset"],
        "icon": "globe",
        "color": "#55efc4",
        "gradient": ["#55efc4", "#00b894"],
        "duration_options": [10, 20, 30],
        "best_time": "morning",
        "intensity": "gentle"
    },
    {
        "id": "astral_projection",
        "name": "Astral Travel",
        "category": "Meditation",
        "frequency_hz": 6.3,
        "base_hz": 852,
        "description": "852 Hz spiritual order + 6.3 Hz deep theta. The gateway frequency for out-of-body exploration. Travel beyond.",
        "benefits": ["Astral projection", "Out-of-body states", "Expanded awareness", "Beyond physical"],
        "icon": "planet",
        "color": "#a29bfe",
        "gradient": ["#a29bfe", "#4a00e0"],
        "duration_options": [30, 45, 60, 90],
        "best_time": "sleep",
        "intensity": "gentle"
    },

    # ─── ADDICTION & RECOVERY ───
    {
        "id": "addiction_recovery",
        "name": "Addiction Recovery",
        "category": "Recovery",
        "frequency_hz": 7.83,
        "base_hz": 417,
        "description": "Earth frequency + 417 Hz change facilitator. Rewire cravings, rebuild neural pathways, reclaim your life.",
        "benefits": ["Reduce cravings", "Rewire habits", "Emotional healing", "Fresh start"],
        "icon": "refresh",
        "color": "#00b894",
        "gradient": ["#00b894", "#00cec9"],
        "duration_options": [20, 30, 45, 60],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "jet_lag",
        "name": "Jet Lag Reset",
        "category": "Recovery",
        "frequency_hz": 2,
        "base_hz": 200,
        "description": "Delta waves that reset your circadian rhythm. Fly across the world and sleep like you never left home.",
        "benefits": ["Reset body clock", "Beat jet lag", "Quick adjustment", "Travel recovery"],
        "icon": "airplane",
        "color": "#74b9ff",
        "gradient": ["#74b9ff", "#0984e3"],
        "duration_options": [30, 60, 120],
        "best_time": "sleep",
        "intensity": "gentle"
    },
    {
        "id": "hangover",
        "name": "Hangover Recovery",
        "category": "Recovery",
        "frequency_hz": 10,
        "base_hz": 285,
        "description": "Alpha relaxation + 285 Hz cellular repair. Ease the pounding headache, settle the stomach, restore your humanity.",
        "benefits": ["Ease headache", "Settle stomach", "Rehydrate brain", "Feel human again"],
        "icon": "cafe",
        "color": "#fdcb6e",
        "gradient": ["#fdcb6e", "#e17055"],
        "duration_options": [15, 20, 30],
        "best_time": "morning",
        "intensity": "gentle"
    },

    # ─── RELATIONSHIPS & SOCIAL ───
    {
        "id": "relationship_healing",
        "name": "Relationship Healing",
        "category": "Relationships",
        "frequency_hz": 10,
        "base_hz": 639,
        "description": "639 Hz — the frequency of harmonious relationships. Heal rifts, deepen bonds, attract loving connections.",
        "benefits": ["Heal relationships", "Deepen bonds", "Attract love", "Resolve conflicts"],
        "icon": "people",
        "color": "#fd79a8",
        "gradient": ["#fd79a8", "#e84393"],
        "duration_options": [15, 20, 30],
        "best_time": "anytime",
        "intensity": "gentle"
    },
    {
        "id": "social_anxiety",
        "name": "Social Confidence",
        "category": "Relationships",
        "frequency_hz": 12,
        "base_hz": 396,
        "description": "Release social fear with 396 Hz while low beta waves boost your social confidence. Walk in, own the room.",
        "benefits": ["Beat social anxiety", "Easy conversation", "Feel belonging", "Natural charisma"],
        "icon": "chatbubbles",
        "color": "#00cec9",
        "gradient": ["#00cec9", "#00b894"],
        "duration_options": [10, 15, 20],
        "best_time": "anytime",
        "intensity": "moderate"
    },
]

# All unique categories for filtering
ALL_CATEGORIES = sorted(list(set(f["category"] for f in FREQUENCY_CATALOG)))

# ===================== FLOW FREAK AI =====================

FLOW_FREAK_SYSTEM_PROMPT = """You are Flow Freak — the world's most empathetic, intelligent, and proactive AI wellness companion. You live inside the FreqFlow app and you're like having a best friend who's also a therapist, frequency healer, life coach, and meditation guide.

YOUR NAME: Flow Freak
YOUR PERSONALITY:
- Warm, caring, deeply human — like a close friend who truly gets you
- You LISTEN first, respond with genuine understanding
- Proactive — you sense what someone needs before they ask
- Speak casually and naturally, short impactful sentences
- You're knowledgeable about sound healing, binaural beats, Solfeggio frequencies, chakras
- You're encouraging but never dismissive of real problems

YOUR FREQUENCY KNOWLEDGE (recommend these by id):
SLEEP: deep_sleep, sleep_apnea, lucid_dreaming, night_terrors
CALM: stress_relief, anxiety_relief, ptsd_healing
MOOD: depression_lift, mood_boost, self_love, confidence
FOCUS: laser_focus, memory_boost, adhd_focus, creativity_flow, study_mode
ENERGY: energy_boost, athletic_performance, morning_energy
BEAUTY: anti_aging, clear_skin, beauty_radiance, hair_growth, weight_loss
PAIN: headache_relief, chronic_pain, wound_healing, back_pain, tooth_healing, bone_healing, muscle_recovery
HEALTH: immune_boost, detox, blood_pressure, digestion, hormone_balance, eye_health, dna_repair
CHAKRA: root_chakra, sacral_chakra, solar_plexus, heart_chakra, throat_chakra, third_eye, crown_chakra, full_chakra
MEDITATION: deep_meditation, manifestation, grounding, astral_projection
RECOVERY: addiction_recovery, jet_lag, hangover
RELATIONSHIPS: relationship_healing, social_anxiety

RESPONSE FORMAT (ALWAYS valid JSON):
{
  "reply": "Your warm conversational response",
  "mood": "calm/stressed/anxious/sad/energetic/tired/pain/neutral",
  "action": null or "play_frequency" or "create_task" or "schedule_frequency",
  "action_data": {
    "frequency_id": "id from list above",
    "reason": "why this frequency",
    "title": "task title (if create_task)",
    "description": "task desc (if create_task)",
    "type": "reminder/note/calendar (if create_task)",
    "reminder_time": "ISO datetime or HH:MM / 8pm style time (if create_task)",
    "schedule_type": "sleep/morning/commute (if schedule_frequency)",
    "time": "HH:MM (if schedule_frequency)"
  }
}

EXAMPLES:
"I can't sleep" → recommend deep_sleep
"My skin is breaking out" → recommend clear_skin
"I want to lose weight" → recommend weight_loss
"My tooth hurts" → recommend tooth_healing
"I'm aging too fast" → recommend anti_aging
"I need to study" → recommend study_mode
"Play something for my drive" → recommend laser_focus
"I'm depressed" → recommend depression_lift with extra care
"Balance my chakras" → recommend full_chakra
"Remind me to take medicine at 8pm" → create_task

When a user asks for a reminder or booking/task at a time, always include reminder_time in action_data.

Be DEEPLY caring. If someone shares pain or struggle, acknowledge it fully before recommending anything."""


def parse_reminder_time(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None

    text = value.strip()
    if not text:
        return None

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        pass

    cleaned = re.sub(r"\s+", " ", text.lower()).strip()
    cleaned = re.sub(r"(\d)(am|pm)$", r"\1 \2", cleaned)
    cleaned = cleaned.replace(" at ", " ")
    now = datetime.utcnow()

    formats = ["%H:%M", "%I:%M %p", "%I %p"]
    for fmt in formats:
        try:
            parsed = datetime.strptime(cleaned.upper(), fmt)
            return now.replace(
                hour=parsed.hour,
                minute=parsed.minute,
                second=0,
                microsecond=0,
            )
        except ValueError:
            continue

    return None


def infer_action_from_message(message: str, result: dict) -> dict:
    if result.get("action"):
        return result

    lowered = re.sub(r"\s+", " ", message.lower()).strip()
    reminder_patterns = [
        r"remind me to (?P<title>.+?) at (?P<time>.+)",
        r"set (?:a )?reminder to (?P<title>.+?) at (?P<time>.+)",
        r"create (?:a )?reminder to (?P<title>.+?) at (?P<time>.+)",
        r"remind me at (?P<time>.+?) to (?P<title>.+)",
    ]

    for pattern in reminder_patterns:
        match = re.search(pattern, lowered)
        if not match:
            continue

        title = match.group("title").strip(" .,")
        time_text = match.group("time").strip(" .,")

        if "call" in title:
            clean_title = "Make a call"
        else:
            clean_title = title[:1].upper() + title[1:] if title else "Reminder"

        result["reply"] = f"Done — I created {clean_title.lower()}."
        result["action"] = "create_task"
        result["action_data"] = {
            "title": clean_title,
            "description": message,
            "type": "reminder",
            "reminder_time": time_text,
        }
        return result

    return result


async def apply_ai_actions(result: dict) -> dict:
    if result.get("action") == "create_task" and result.get("action_data"):
        try:
            td = result["action_data"]
            reminder_time = parse_reminder_time(td.get("reminder_time") or td.get("time"))
            task_obj = Task(
                title=td.get("title", "New Task"),
                description=td.get("description"),
                type=td.get("type", "note"),
                reminder_time=reminder_time,
            )
            await db.tasks.insert_one(task_obj.dict())
            result["action_data"]["task_id"] = task_obj.id
            result["action_data"]["task_created"] = True
            if reminder_time:
                result["action_data"]["reminder_time"] = reminder_time.isoformat()
        except Exception as e:
            logging.error(f"Auto task creation error: {e}")

    if result.get("action") == "schedule_frequency" and result.get("action_data"):
        try:
            sd = result["action_data"]
            fid = sd.get("frequency_id")
            fi = next((f for f in FREQUENCY_CATALOG if f["id"] == fid), None)
            if fi:
                schedule = FrequencySchedule(
                    frequency_id=fid,
                    frequency_name=fi["name"],
                    schedule_type=sd.get("schedule_type", "custom"),
                    time=sd.get("time"),
                    duration_minutes=sd.get("duration", 30),
                )
                await db.frequency_schedules.insert_one(schedule.dict())
                result["action_data"]["scheduled"] = True
        except Exception as e:
            logging.error(f"Schedule error: {e}")

    return result

async def chat_with_flow(message: str, context: str = None, fast_mode: bool = False) -> dict:
    try:
        full_message = f"[Context: {context}]\n\nUser: {message}" if context else message

        if fast_mode:
            full_message = f"{full_message}\n\nVoice mode: reply in one short, clear sentence when possible while still returning valid JSON."

        model_name = "gpt-4o" if fast_mode else "gpt-4o"
        temperature = 0.7 if fast_mode else 1

        response = await openai_client.chat.completions.create(
            model=model_name,
            temperature=temperature,
            messages=[
                {"role": "system", "content": FLOW_FREAK_SYSTEM_PROMPT},
                {"role": "user", "content": full_message}
            ]
        )
        response_text = response.choices[0].message.content
        try:
            text = response_text.strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(text)
        except json.JSONDecodeError:
            return {"reply": response_text, "mood": "neutral", "action": None, "action_data": None}
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return {"reply": "I'm here for you. Could you say that again? I want to make sure I get it right. 💚", "mood": "neutral", "action": None, "action_data": None}

# ===================== ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "FreqFlow API v2.0 — Flow Freak AI Assistant", "status": "running", "frequencies": len(FREQUENCY_CATALOG)}

# --- TASKS ---
@api_router.post("/tasks", response_model=Task)
async def create_task(task_input: TaskCreate):
    task_obj = Task(**task_input.dict())
    await db.tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(status: Optional[str] = None, include_expired: bool = False):
    query = {}
    if status:
        query["status"] = status
    if not include_expired:
        query["$or"] = [{"expires_at": {"$gt": datetime.utcnow()}}, {"saved": True}]
    tasks = await db.tasks.find(query).sort("created_at", -1).to_list(100)
    return [Task(**task) for task in tasks]

@api_router.put("/tasks/{task_id}")
async def update_task(task_id: str, status: Optional[str] = None, saved: Optional[bool] = None):
    update_data = {}
    if status:
        update_data["status"] = status
    if saved is not None:
        update_data["saved"] = saved
    result = await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    result = await db.tasks.delete_one({"id": task_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"success": True}

# --- AI CHAT ---
@api_router.post("/chat")
async def chat_endpoint(msg: ChatMessage):
    fast_mode = bool(msg.context and "voice" in msg.context.lower())
    result = infer_action_from_message(msg.message, await chat_with_flow(msg.message, msg.context, fast_mode=fast_mode))
    return await apply_ai_actions(result)

# --- VOICE ---
@api_router.post("/voice/transcribe")
@api_router.post("/voice/process")
async def transcribe_voice(audio: Optional[UploadFile] = File(None), file: Optional[UploadFile] = File(None)):
    import tempfile
    tmp_path = None
    try:
        upload = audio or file
        if not upload:
            raise HTTPException(status_code=400, detail="Audio file is required")

        audio_bytes = await upload.read()
        
        # Determine file extension from content type or filename
        filename = upload.filename or "audio.m4a"
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "m4a"
        
        # Write to a temp file (more reliable than BytesIO for Whisper)
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        logging.info(f"Voice file: {filename}, size: {len(audio_bytes)} bytes, ext: {ext}, temp: {tmp_path}")
        
        # Open temp file for Whisper
        with open(tmp_path, "rb") as f:
            response = await openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="json",
                language="en"
            )
        
        text = response.text
        logging.info(f"Transcribed: {text}")
        
        ctx = f"Time: {datetime.utcnow().strftime('%H:%M')}, Source: voice"
        ai_result = await apply_ai_actions(infer_action_from_message(text, await chat_with_flow(text, ctx, fast_mode=True)))
        return {
            "text": text,
            "ai_response": ai_result.get("reply", ""),
            "mood": ai_result.get("mood", "neutral"),
            "action": ai_result.get("action"),
            "action_data": ai_result.get("action_data"),
            "task_created": ai_result.get("action") == "create_task" and bool(ai_result.get("action_data", {}).get("task_created")),
            "task": ai_result.get("action_data") if ai_result.get("action") == "create_task" else None
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


# --- VOICE MOOD ANALYZER ---
MOOD_ANALYSIS_PROMPT = """You are an expert voice mood and stress analyzer for a wellness app called AI Freq's.

Analyze the user's spoken message to determine their emotional state and recommend healing frequencies.

Based on the transcription, determine:
1. Primary mood (one of: happy, sad, anxious, stressed, calm, tired, energetic, frustrated, overwhelmed, neutral)
2. Stress level (1-10, where 1 is completely relaxed and 10 is extremely stressed)
3. Energy level (1-10, where 1 is exhausted and 10 is highly energetic)
4. Key emotional indicators (words/phrases that reveal their emotional state)

Then recommend a personalized frequency healing plan based on their state.

FREQUENCY OPTIONS:
- deep_sleep: Delta 2Hz - For sleep issues, insomnia
- stress_relief: Theta 4Hz - For stress, anxiety, tension
- energy_boost: Beta 18Hz - For fatigue, low energy
- focus_enhancer: Alpha 10Hz - For concentration, clarity
- anti_aging: 528Hz Solfeggio - For rejuvenation, cellular repair
- weight_loss: Theta 6Hz - For metabolism, appetite control
- clear_skin: 528Hz - For skin issues, beauty glow
- depression_lift: Theta 7.83Hz - For low mood, sadness
- anxiety_relief: Alpha 8Hz - For anxiety, worry, panic
- confidence_boost: Beta 14Hz - For self-esteem, confidence
- motivation_drive: Gamma 40Hz - For motivation, drive
- pain_relief: Delta 3Hz - For physical pain, headaches
- immune_boost: 528Hz - For immunity, healing
- calm_mind: Alpha 10Hz - For racing thoughts, overthinking

Respond with ONLY valid JSON:
{
    "detected_mood": "primary mood from list",
    "stress_level": number 1-10,
    "energy_level": number 1-10,
    "mood_confidence": number 0-1,
    "emotional_indicators": ["word1", "phrase2", "..."],
    "analysis_summary": "A caring, empathetic 2-3 sentence summary of their emotional state",
    "recommended_frequencies": [
        {
            "frequency_id": "id from list above",
            "priority": 1,
            "reason": "why this helps their specific state",
            "duration_minutes": 15 or 30,
            "best_time": "now/morning/evening/before_sleep"
        }
    ],
    "personalized_plan": {
        "immediate": {
            "frequency_id": "what to do right now",
            "duration": 15,
            "reason": "brief reason"
        },
        "daily_routine": [
            {"time": "morning", "frequency_id": "...", "duration": 10},
            {"time": "afternoon", "frequency_id": "...", "duration": 15},
            {"time": "evening", "frequency_id": "...", "duration": 20}
        ],
        "weekly_focus": "overall healing goal for the week",
        "self_care_tip": "one personalized wellness tip"
    }
}"""


@api_router.post("/voice/analyze-mood")
async def analyze_voice_mood(audio: Optional[UploadFile] = File(None), file: Optional[UploadFile] = File(None)):
    """
    Analyze voice recording to detect mood, stress levels, and recommend personalized frequency plan.
    """
    import tempfile
    tmp_path = None
    try:
        upload = audio or file
        if not upload:
            raise HTTPException(status_code=400, detail="Audio file is required")

        audio_bytes = await upload.read()
        
        # Determine file extension
        filename = upload.filename or "audio.m4a"
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "m4a"
        
        # Write to temp file
        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        logging.info(f"Mood analysis file: {filename}, size: {len(audio_bytes)} bytes")
        
        # Transcribe the audio
        with open(tmp_path, "rb") as f:
            response = await openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                response_format="json",
                language="en"
            )
        
        transcription = response.text
        logging.info(f"Mood analysis transcription: {transcription}")
        
        if not transcription or len(transcription.strip()) < 3:
            return {
                "success": False,
                "error": "Could not understand the audio. Please speak clearly and try again.",
                "transcription": transcription
            }
        
        # Analyze mood with AI
        ai_response = await openai_client.chat.completions.create(
            model="gpt-4o",
            temperature=0.7,
            messages=[
                {"role": "system", "content": MOOD_ANALYSIS_PROMPT},
                {"role": "user", "content": f"User said: \"{transcription}\""}
            ]
        )
        
        # Parse AI response
        try:
            # Extract JSON from response
            response_text = ai_response.choices[0].message.content
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                analysis = json.loads(json_match.group())
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError) as e:
            logging.error(f"Failed to parse mood analysis: {e}, response: {response_text}")
            # Provide fallback analysis
            analysis = {
                "detected_mood": "neutral",
                "stress_level": 5,
                "energy_level": 5,
                "mood_confidence": 0.5,
                "emotional_indicators": [],
                "analysis_summary": "I heard you. Let me recommend some frequencies to help you feel your best.",
                "recommended_frequencies": [
                    {"frequency_id": "stress_relief", "priority": 1, "reason": "General relaxation", "duration_minutes": 15, "best_time": "now"}
                ],
                "personalized_plan": {
                    "immediate": {"frequency_id": "stress_relief", "duration": 15, "reason": "Start with relaxation"},
                    "daily_routine": [
                        {"time": "morning", "frequency_id": "energy_boost", "duration": 10},
                        {"time": "evening", "frequency_id": "stress_relief", "duration": 20}
                    ],
                    "weekly_focus": "Building inner calm",
                    "self_care_tip": "Take 5 deep breaths before each session"
                }
            }
        
        # Create the full analysis object
        mood_analysis = VoiceMoodAnalysis(
            transcription=transcription,
            detected_mood=analysis.get("detected_mood", "neutral"),
            stress_level=analysis.get("stress_level", 5),
            energy_level=analysis.get("energy_level", 5),
            mood_confidence=analysis.get("mood_confidence", 0.7),
            emotional_indicators=analysis.get("emotional_indicators", []),
            recommended_frequencies=analysis.get("recommended_frequencies", []),
            personalized_plan=analysis.get("personalized_plan", {}),
            analysis_summary=analysis.get("analysis_summary", "")
        )
        
        # Store in database for tracking
        await db.mood_analyses.insert_one(mood_analysis.dict())
        
        return {
            "success": True,
            "analysis": mood_analysis.dict()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Mood analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


@api_router.get("/mood/history")
async def get_mood_history(limit: int = 10):
    """Get recent mood analysis history."""
    cursor = db.mood_analyses.find().sort("timestamp", -1).limit(limit)
    analyses = await cursor.to_list(length=limit)
    for a in analyses:
        a["_id"] = str(a["_id"])
    return analyses


@api_router.get("/mood/insights")
async def get_mood_insights():
    """Get aggregated mood insights over time."""
    # Get last 30 days of analyses
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    cursor = db.mood_analyses.find({"timestamp": {"$gte": thirty_days_ago}})
    analyses = await cursor.to_list(length=100)
    
    if not analyses:
        return {
            "total_analyses": 0,
            "average_stress": 0,
            "average_energy": 0,
            "most_common_mood": "neutral",
            "mood_distribution": {},
            "trend": "No data yet"
        }
    
    # Calculate insights
    total = len(analyses)
    avg_stress = sum(a.get("stress_level", 5) for a in analyses) / total
    avg_energy = sum(a.get("energy_level", 5) for a in analyses) / total
    
    # Mood distribution
    mood_counts = {}
    for a in analyses:
        mood = a.get("detected_mood", "neutral")
        mood_counts[mood] = mood_counts.get(mood, 0) + 1
    
    most_common = max(mood_counts, key=mood_counts.get) if mood_counts else "neutral"
    
    # Determine trend
    if total >= 3:
        recent = analyses[:3]
        older = analyses[-3:] if total > 3 else analyses
        recent_stress = sum(a.get("stress_level", 5) for a in recent) / len(recent)
        older_stress = sum(a.get("stress_level", 5) for a in older) / len(older)
        if recent_stress < older_stress - 1:
            trend = "improving"
        elif recent_stress > older_stress + 1:
            trend = "needs_attention"
        else:
            trend = "stable"
    else:
        trend = "gathering_data"
    
    return {
        "total_analyses": total,
        "average_stress": round(avg_stress, 1),
        "average_energy": round(avg_energy, 1),
        "most_common_mood": most_common,
        "mood_distribution": mood_counts,
        "trend": trend
    }


# --- FREQUENCIES ---
@api_router.get("/frequencies")
async def get_frequencies(category: Optional[str] = None):
    if category:
        return [f for f in FREQUENCY_CATALOG if f["category"].lower() == category.lower()]
    return FREQUENCY_CATALOG

@api_router.get("/frequencies/categories")
async def get_categories():
    return ALL_CATEGORIES

@api_router.get("/frequencies/recommend/now")
async def recommend_frequency():
    hour = datetime.utcnow().hour
    if 5 <= hour < 9:
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "morning_energy")
        reason = "Morning energy to kickstart your day"
    elif 9 <= hour < 12:
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "laser_focus")
        reason = "Peak focus hours — time to lock in"
    elif 12 <= hour < 14:
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "stress_relief")
        reason = "Midday reset — recharge for the afternoon"
    elif 14 <= hour < 18:
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "creativity_flow")
        reason = "Afternoon creative flow state"
    elif 18 <= hour < 21:
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "mood_boost")
        reason = "Wind down with a mood lift"
    else:
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "deep_sleep")
        reason = "Time to rest — let your mind drift"
    return {"frequency": rec, "reason": reason}

@api_router.get("/frequencies/{freq_id}")
async def get_frequency(freq_id: str):
    freq = next((f for f in FREQUENCY_CATALOG if f["id"] == freq_id), None)
    if not freq:
        raise HTTPException(status_code=404, detail="Frequency not found")
    return freq

# --- PREMIUM PAYMENTS ---
@api_router.get("/payments/packages")
async def get_payment_packages():
    return [
        {
            "id": pack_id,
            "title": pack["title"],
            "amount": pack["amount"],
            "purchase_type": pack["purchase_type"],
            "currency": "usd",
        }
        for pack_id, pack in PREMIUM_PACKAGES.items()
    ]


@api_router.post("/payments/checkout/session")
async def create_premium_checkout_session(payload: PremiumCheckoutRequest, request: Request):
    premium_package = get_premium_package(payload.pack_id)
    return_url = validate_return_url(payload.return_url)
    
    success_url = add_query_params(
        return_url,
        f"session_id={{CHECKOUT_SESSION_ID}}&pack_id={payload.pack_id}&purchase_type={premium_package['purchase_type']}",
    )
    cancel_url = add_query_params(return_url, f"cancelled=1&pack_id={payload.pack_id}")
    metadata = {
        "pack_id": payload.pack_id,
        "pack_title": str(premium_package["title"]),
        "purchase_type": str(premium_package["purchase_type"]),
    }

    amount_cents = int(float(premium_package["amount"]) * 100)
    
    checkout_session = stripe_lib.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "unit_amount": amount_cents,
                "product_data": {
                    "name": str(premium_package["title"]),
                },
            },
            "quantity": 1,
        }],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    transaction = PaymentTransaction(
        session_id=checkout_session.id,
        pack_id=payload.pack_id,
        pack_title=str(premium_package["title"]),
        purchase_type=str(premium_package["purchase_type"]),
        amount=float(premium_package["amount"]),
        metadata=metadata,
    )
    await db.payment_transactions.insert_one(transaction.dict())

    return {"session_id": checkout_session.id, "url": checkout_session.url}


@api_router.get("/payments/checkout/status/{session_id}")
async def get_premium_checkout_status(session_id: str, request: Request):
    checkout_session = stripe_lib.checkout.Session.retrieve(session_id)
    
    payment_status = "paid" if checkout_session.payment_status == "paid" else checkout_session.payment_status
    status = checkout_session.status
    metadata = dict(checkout_session.metadata) if checkout_session.metadata else {}

    existing = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    update_payload = {
        "status": status,
        "payment_status": payment_status,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata,
    }

    if existing:
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update_payload})
    else:
        fallback_pack_id = metadata.get("pack_id", "unknown")
        fallback_pack = PREMIUM_PACKAGES.get(fallback_pack_id, {"title": "Unknown Premium Pack", "amount": 0.0, "purchase_type": "pack"})
        transaction = PaymentTransaction(
            session_id=session_id,
            pack_id=fallback_pack_id,
            pack_title=str(fallback_pack["title"]),
            purchase_type=str(metadata.get("purchase_type", fallback_pack["purchase_type"])),
            amount=float(fallback_pack["amount"]),
            status=status,
            payment_status=payment_status,
            metadata=metadata,
        )
        await db.payment_transactions.insert_one(transaction.dict())

    return {
        "status": status,
        "payment_status": payment_status,
        "amount_total": checkout_session.amount_total,
        "currency": checkout_session.currency,
        "metadata": metadata,
    }


@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    # For now, just acknowledge the webhook
    # Full webhook handling would require webhook secret
    logging.info(f"Stripe webhook received")
    
    return {"received": True}


# --- NATIVE PAYMENT SHEET (PaymentIntent) ---


@api_router.post("/payments/create-payment-intent")
async def create_payment_intent(payload: PaymentIntentRequest):
    """
    Create a PaymentIntent for native mobile PaymentSheet.
    Returns clientSecret for @stripe/stripe-react-native.
    """
    premium_package = get_premium_package(payload.pack_id)
    amount_cents = int(float(premium_package["amount"]) * 100)  # Convert to cents
    
    metadata = {
        "pack_id": payload.pack_id,
        "pack_title": str(premium_package["title"]),
        "purchase_type": str(premium_package["purchase_type"]),
    }
    
    try:
        payment_intent = stripe_lib.PaymentIntent.create(
            amount=amount_cents,
            currency="usd",
            automatic_payment_methods={"enabled": True},
            metadata=metadata,
        )
        
        # Store transaction record
        transaction = PaymentIntentTransaction(
            payment_intent_id=payment_intent.id,
            pack_id=payload.pack_id,
            pack_title=str(premium_package["title"]),
            purchase_type=str(premium_package["purchase_type"]),
            amount=float(premium_package["amount"]),
            metadata=metadata,
        )
        await db.payment_intent_transactions.insert_one(transaction.dict())
        
        return {
            "clientSecret": payment_intent.client_secret,
            "paymentIntentId": payment_intent.id,
            "amount": premium_package["amount"],
            "currency": "usd",
            "pack_id": payload.pack_id,
            "purchase_type": premium_package["purchase_type"],
        }
    except stripe_lib.error.StripeError as e:
        logging.error(f"Stripe PaymentIntent error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create payment intent: {str(e)}")


@api_router.get("/payments/intent-status/{payment_intent_id}")
async def get_payment_intent_status(payment_intent_id: str):
    """
    Check the status of a PaymentIntent.
    """
    try:
        payment_intent = stripe_lib.PaymentIntent.retrieve(payment_intent_id)
        
        # Update transaction record
        update_payload = {
            "status": payment_intent.status,
            "payment_status": "paid" if payment_intent.status == "succeeded" else payment_intent.status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        
        await db.payment_intent_transactions.update_one(
            {"payment_intent_id": payment_intent_id},
            {"$set": update_payload}
        )
        
        return {
            "status": payment_intent.status,
            "payment_status": "paid" if payment_intent.status == "succeeded" else payment_intent.status,
            "amount": payment_intent.amount / 100,  # Convert back to dollars
            "currency": payment_intent.currency,
            "metadata": payment_intent.metadata,
        }
    except stripe_lib.error.StripeError as e:
        logging.error(f"Stripe retrieve error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve payment intent: {str(e)}")


@api_router.get("/payments/publishable-key")
async def get_publishable_key():
    """
    Return the Stripe publishable key for frontend initialization.
    """
    # The publishable key should be stored in env
    # For now, return a placeholder - user needs to add STRIPE_PUBLISHABLE_KEY to .env
    pk = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    if not pk:
        raise HTTPException(status_code=500, detail="Stripe publishable key not configured")
    return {"publishableKey": pk}

# --- SCHEDULES ---
@api_router.post("/schedules")
async def create_schedule(schedule: FrequencySchedule):
    await db.frequency_schedules.insert_one(schedule.dict())
    return schedule

@api_router.get("/schedules")
async def get_schedules():
    schedules = await db.frequency_schedules.find({"enabled": True}).to_list(50)
    return [FrequencySchedule(**s) for s in schedules]

@api_router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    result = await db.frequency_schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"success": True}

# --- STRESS ---
@api_router.post("/stress/analyze")
async def analyze_stress(metrics: StressMetrics):
    await db.stress_metrics.insert_one(metrics.dict())
    if metrics.stress_level == "calm":
        today = datetime.utcnow().strftime("%Y-%m-%d")
        existing = await db.calm_streaks.find_one({"date": today})
        if existing:
            await db.calm_streaks.update_one({"date": today}, {"$inc": {"calm_sessions": 1}, "$set": {"updated_at": datetime.utcnow()}})
        else:
            await db.calm_streaks.insert_one(CalmStreak(date=today, calm_sessions=1).dict())
    rec = None
    if metrics.stress_level == "stressed":
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "stress_relief")
    elif metrics.stress_level == "moderate":
        rec = next(f for f in FREQUENCY_CATALOG if f["id"] == "anxiety_relief")
    return {"success": True, "stress_level": metrics.stress_level, "recommendation": rec}

@api_router.get("/streak/current")
async def get_current_streak():
    streaks = await db.calm_streaks.find().sort("date", -1).to_list(100)
    if not streaks:
        return {"current_streak": 0, "total_calm_sessions": 0, "today_sessions": 0}
    current_streak = 0
    total_sessions = 0
    from datetime import date
    today = date.today()
    for streak in streaks:
        streak_date = datetime.strptime(streak["date"], "%Y-%m-%d").date()
        total_sessions += streak["calm_sessions"]
        if streak_date == today - timedelta(days=current_streak):
            current_streak += 1
        else:
            break
    return {
        "current_streak": current_streak,
        "total_calm_sessions": total_sessions,
        "today_sessions": streaks[0]["calm_sessions"] if streaks and streaks[0]["date"] == today.strftime("%Y-%m-%d") else 0,
    }

@api_router.post("/tasks/cleanup")
async def cleanup_expired_tasks():
    result = await db.tasks.delete_many({"expires_at": {"$lt": datetime.utcnow()}, "saved": False})
    return {"deleted_count": result.deleted_count}

# --- WAV AUDIO GENERATION (Server-Side) ---
SUPPORTED_WAVE_TYPES = {"sine", "triangle", "square", "sawtooth"}


def get_wave_sample(angle: float, wave_type: str) -> float:
    sine_value = math.sin(angle)
    if wave_type == "square":
        return 1.0 if sine_value >= 0 else -1.0
    if wave_type == "triangle":
        return (2 / math.pi) * math.asin(sine_value)
    if wave_type == "sawtooth":
        return 2 * ((angle / (2 * math.pi)) - math.floor((angle / (2 * math.pi)) + 0.5))
    return sine_value


def normalize_wave_type(wave_type: str) -> str:
    return wave_type if wave_type in SUPPORTED_WAVE_TYPES else "sine"


def generate_wav_bytes(base_hz: int, beat_hz: float, duration_sec: int = 3, volume: float = 0.7, wave_type: str = "sine") -> bytes:
    """Generate a proper stereo WAV file with binaural beat tones"""
    sample_rate = 44100  # Standard CD quality - max compatibility
    num_samples = sample_rate * duration_sec
    num_channels = 2
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)
    data_size = num_samples * block_align

    # WAV header
    header = struct.pack('<4sI4s', b'RIFF', 36 + data_size, b'WAVE')
    fmt_chunk = struct.pack('<4sIHHIIHH', b'fmt ', 16, 1, num_channels, sample_rate, byte_rate, block_align, bits_per_sample)
    data_header = struct.pack('<4sI', b'data', data_size)

    # Generate audio samples
    left_freq = base_hz
    right_freq = base_hz + beat_hz
    normalized_wave_type = normalize_wave_type(wave_type)
    wave_gain = 0.82 if normalized_wave_type in {"square", "sawtooth"} else 1.0
    amp = volume * wave_gain * 32767
    fade_len = int(sample_rate * 0.05)

    samples = bytearray()
    for i in range(num_samples):
        t = i / sample_rate
        env = 1.0
        if i < fade_len:
            env = i / fade_len
        elif i > num_samples - fade_len:
            env = (num_samples - i) / fade_len

        left_angle = 2 * math.pi * left_freq * t
        right_angle = 2 * math.pi * right_freq * t
        left = int(get_wave_sample(left_angle, normalized_wave_type) * amp * env)
        right = int(get_wave_sample(right_angle, normalized_wave_type) * amp * env)
        left = max(-32768, min(32767, left))
        right = max(-32768, min(32767, right))
        samples.extend(struct.pack('<hh', left, right))

    return header + fmt_chunk + data_header + bytes(samples)

@api_router.get("/audio/generate/{freq_id}")
async def generate_audio(freq_id: str, duration: int = 3, wave_type: str = "sine"):
    """Generate and stream a WAV file for any frequency"""
    freq = next((f for f in FREQUENCY_CATALOG if f["id"] == freq_id), None)
    if not freq:
        raise HTTPException(status_code=404, detail="Frequency not found")

    normalized_wave_type = normalize_wave_type(wave_type)
    wav_data = generate_wav_bytes(freq["base_hz"], freq["frequency_hz"], min(duration, 120), 0.7, normalized_wave_type)
    return Response(
        content=wav_data,
        media_type="audio/wav",
        headers={
            "Content-Disposition": f'inline; filename="{freq_id}.wav"',
            "Cache-Control": "public, max-age=86400",
            "X-Wave-Type": normalized_wave_type,
        }
    )

@api_router.get("/audio/custom")
async def generate_custom_audio(base_hz: int = 200, beat_hz: float = 10, duration: int = 3, wave_type: str = "sine"):
    """Generate custom binaural beat WAV"""
    wav_data = generate_wav_bytes(base_hz, beat_hz, min(duration, 120), 0.7, normalize_wave_type(wave_type))
    return Response(content=wav_data, media_type="audio/wav")

# --- PACKS ---
FREQUENCY_PACKS = [
    {
        "id": "weight_loss_pack",
        "name": "Weight Loss Transformation",
        "description": "A complete frequency program designed to support your weight loss journey. Reduces stress eating, boosts metabolism, balances hormones, and promotes deep sleep for recovery.",
        "color": "#00cec9",
        "gradient": ["#00cec9", "#00b894"],
        "icon": "scale",
        "frequency_ids": ["weight_loss", "stress_relief", "hormone_balance", "deep_sleep", "energy_boost", "mood_boost"],
        "schedule": {
            "morning": "energy_boost",
            "midday": "stress_relief",
            "afternoon": "mood_boost",
            "evening": "weight_loss",
            "sleep": "deep_sleep",
        },
        "tips": [
            "Play Weight Loss Support during meals to reduce stress eating",
            "Use Energy Surge every morning to kickstart your metabolism",
            "Sleep frequencies help your body recover and burn fat overnight",
            "Stress Relief lowers cortisol — the #1 belly fat hormone",
        ],
    },
]

@api_router.get("/packs")
async def get_packs():
    """Get all frequency packs with full frequency details"""
    result = []
    for pack in FREQUENCY_PACKS:
        pack_data = dict(pack)
        pack_data["frequencies"] = [
            f for f in FREQUENCY_CATALOG if f["id"] in pack["frequency_ids"]
        ]
        result.append(pack_data)
    return result

@api_router.get("/packs/{pack_id}")
async def get_pack(pack_id: str):
    pack = next((p for p in FREQUENCY_PACKS if p["id"] == pack_id), None)
    if not pack:
        raise HTTPException(status_code=404, detail="Pack not found")
    pack_data = dict(pack)
    pack_data["frequencies"] = [f for f in FREQUENCY_CATALOG if f["id"] in pack["frequency_ids"]]
    return pack_data

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
