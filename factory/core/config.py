import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")

def get_asset_path(filename):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    direct_path = os.path.join(base_dir, filename)
    if os.path.exists(direct_path): return direct_path
    return os.path.join(base_dir, "assets", filename)