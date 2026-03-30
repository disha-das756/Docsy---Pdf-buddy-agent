from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from ingest import ingest_pdf
from graph import graph
import os
import uvicorn
from storage import upload_to_supabase
from memory import add_message, get_chat, load_chats, save_pdf_url
import shutil

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://docsy-pdf-buddy-agent.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload PDF
@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    chat_id: str = Form(...)
):
    temp_path = f"temp_{file.filename}"

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        ingest_pdf(temp_path)
        supabase_url = upload_to_supabase(temp_path, file.filename)
        save_pdf_url(chat_id, supabase_url)

        if os.path.exists(temp_path):
            os.remove(temp_path)

        return {"message": "PDF uploaded", "url": supabase_url}

    except Exception as e:
        print(f"Error: {e}")
        return {"message": "Upload failed", "error": str(e)}

# Chat
@app.post("/chat")
async def chat(data: dict):
    query = data.get("query", "")
    chat_id = data.get("chat_id", "default")

    if not query:
        return {"answer": "Empty query"}

    add_message(chat_id, "user", query)

    history = get_chat(chat_id)
    history_text = "\n".join([f"{m['role']}: {m['content']}" for m in history])

    result = graph.invoke({
        "query": query,
        "history": history_text
    })

    answer = result.get("answer", "No response")
    add_message(chat_id, "assistant", answer)

    return {"answer": answer}

# Get all chats
@app.get("/chats")
async def get_all_chats():
    return load_chats()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port)