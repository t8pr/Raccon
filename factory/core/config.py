import os
import sys
from dotenv import load_dotenv


def _get_base_dirs():
    dirs = []
    if getattr(sys, "frozen", False):
        exe_dir = os.path.dirname(sys.executable)
        dirs.append(exe_dir)
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass:
            dirs.append(meipass)
    src_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dirs.append(src_dir)
    return dirs


for _d in _get_base_dirs():
    _env_file = os.path.join(_d, ".env")
    if os.path.exists(_env_file):
        load_dotenv(_env_file)
        break
else:
    load_dotenv()

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")


def get_asset_path(filename):
    for base_dir in _get_base_dirs():
        asset_path = os.path.join(base_dir, "assets", filename)
        if os.path.exists(asset_path):
            return asset_path

        direct_path = os.path.join(base_dir, filename)
        if os.path.exists(direct_path):
            return direct_path

    return os.path.join(_get_base_dirs()[-1], filename)
