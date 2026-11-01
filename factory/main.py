import sys
import os
import ctypes
import tkinter as tk
from ui.main_window import RacconFactoryApp
from core.logger import setup_logger


def enable_dpi_awareness():
    if sys.platform == "win32":
        try:
            ctypes.windll.shcore.SetProcessDpiAwareness(1)
        except Exception:
            try:
                ctypes.windll.user32.SetProcessDPIAware()
            except Exception:
                pass


def main():
    enable_dpi_awareness()
    setup_logger()

    root = tk.Tk()
    try:
        root.tk.call("tk", "scaling", 1.25)
    except Exception:
        pass
    app = RacconFactoryApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
