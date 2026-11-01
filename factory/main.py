import sys
import os
from PyQt6.QtWidgets import QApplication
from PyQt6.QtGui import QFont
from ui.main_window import RacconFactoryApp
from core.logger import setup_logger

def main():
    setup_logger()
    app = QApplication(sys.argv)
    
    font = QFont("Segoe UI", 10)
    app.setFont(font)
    
    window = RacconFactoryApp()
    window.show()
    sys.exit(app.exec())

if __name__ == "__main__":
    main()