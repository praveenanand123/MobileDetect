from fastapi import FastAPI
from pydantic import BaseModel
from supabase import create_client
import base64, uuid, os

SUPABASE_URL = os.getenv("https://bvhznghgorxwrtedwirb.supabase.co")
SUPABASE_KEY = os.getenv("sb_secret_akYb5jtWRr7zCMhw8E_Lqw_UD-Uun17")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

class Violation(BaseModel):
    session_id: str
    type: str
    image: str | None = None


@app.post("/log_violation")
def log_violation(v: Violation):
    screenshot_url = None

    if v.image:
        image_bytes = base64.b64decode(v.image.split(",")[1])
        filename = f"{uuid.uuid4()}.png"

        supabase.storage.from_("violations").upload(
            filename, image_bytes, {"content-type": "image/png"}
        )

        screenshot_url = supabase.storage.from_("violations").get_public_url(filename)

    supabase.table("violations").insert({
        "session_id": v.session_id,
        "type": v.type,
        "screenshot_url": screenshot_url
    }).execute()

    return {"status": "logged"}
