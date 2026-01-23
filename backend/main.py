from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client
from pydantic import BaseModel
import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

class Violation(BaseModel):
    session_id: str
    type: str

@app.post("/log_violation")
async def log_violation(v: Violation):
    supabase.table("violations").insert({
        "session_id": v.session_id,
        "type": v.type
    }).execute()
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "Backend running"}

from fastapi.responses import StreamingResponse
import csv
import io

@app.get("/export")
def export_csv():
    data = supabase.table("violations").select("*").execute().data

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["session_id", "type", "time"])

    for row in data:
        writer.writerow([row["session_id"], row["type"], row["created_at"]])

    buffer.seek(0)
    return StreamingResponse(buffer, media_type="text/csv")

import os

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 8000))
    )
