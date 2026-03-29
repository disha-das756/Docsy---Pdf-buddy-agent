import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["rag_chatbot"]
chats_col = db["history"]

def load_chats():
    all_data = chats_col.find({}, {"_id": 0})
    formatted = {}
    for entry in all_data:
        formatted[entry["chat_id"]] = {
            "messages": entry.get("messages", []),
            "pdf_url": entry.get("pdf_url", None)   # <-- include pdf_url per chat
        }
    return formatted

def add_message(chat_id, role, content):
    chats_col.update_one(
        {"chat_id": chat_id},
        {"$push": {"messages": {"role": role, "content": content}}},
        upsert=True
    )

def get_chat(chat_id):
    chat = chats_col.find_one({"chat_id": chat_id}, {"_id": 0})
    return chat["messages"] if chat else []

def save_pdf_url(chat_id, pdf_url):             # <-- new
    chats_col.update_one(
        {"chat_id": chat_id},
        {"$set": {"pdf_url": pdf_url}},
        upsert=True
    )

def get_pdf_url(chat_id):                       # <-- new
    chat = chats_col.find_one({"chat_id": chat_id}, {"_id": 0})
    return chat.get("pdf_url") if chat else None