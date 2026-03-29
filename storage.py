import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
supabase = create_client(url, key)

def upload_to_supabase(file_path, file_name):
    try:
        with open(file_path, "rb") as f:
            supabase.storage.from_("pdfs").upload(
                path=file_name,
                file=f,
                file_options={
                    "upsert": "true",
                    "content-type": "application/pdf"
                }
            )

        res = supabase.storage.from_("pdfs").get_public_url(file_name)

        if hasattr(res, 'public_url'):
            return res.public_url
        return str(res)

    except Exception as e:
        print(f"DEBUG: Supabase error: {e}")
        raise e