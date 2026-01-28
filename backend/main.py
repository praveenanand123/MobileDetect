from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
import base64, uuid, os

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Violation(BaseModel):
    session_id: str
    type: str
    image: str | None = None

@app.post("/log_violation")
def log_violation(v: Violation):
    print("VIOLATION RECEIVED")

    screenshot_url = None

    if v.image:
        img_bytes = base64.b64decode(v.image.split(",")[1])
        filename = f"{uuid.uuid4()}.png"

        upload = supabase.storage.from_("Violations").upload(
            filename,
            img_bytes,
            {"content-type": "image/png"}
        )

        if upload.get("error"):
            print("UPLOAD ERROR:", upload["error"])
            return {"error": upload["error"]}

        screenshot_url = supabase.storage.from_("Violations").get_public_url(filename)

    insert = supabase.table("violations").insert({
        "session_id": v.session_id,
        "type": v.type,
        "screenshot_url": screenshot_url
    }).execute()

    if insert.error:
        print("INSERT ERROR:", insert.error)
        return {"error": str(insert.error)}

    print("INSERT SUCCESS")
    return {"status": "ok"}
