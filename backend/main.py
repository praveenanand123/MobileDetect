from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client
from dotenv import load_dotenv
import base64, uuid, os

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_methods=["*"],
    allow_headers=["*"],
)

class Violation(BaseModel):
    session_id: str
    type: str
    image: str | None = None

@app.post("/log_violation")
def log_violation(v: Violation):
    print("RECEIVED:", v.type)

    screenshot_url = None

    if v.image:
        image_bytes = base64.b64decode(v.image.split(",")[1])
        filename = f"{uuid.uuid4()}.png"

        supabase.storage.from_("Violations").upload(
            filename,
            image_bytes,
            {"content-type": "image/png"}
        )

        screenshot_url = supabase.storage.from_("Violations").get_public_url(filename)

    supabase.table("violations").insert({
        "session_id": v.session_id,
        "type": v.type,
        "screenshot_url": screenshot_url
    }).execute()

    print("INSERTED")
    return {"status": "ok"}
