STYLESHEET = '''
QMainWindow { 
    background-color: #121212; 
}
QWidget { 
    color: #E0E0E0; 
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif; 
    font-weight: 400; 
}
QLabel { 
    background: transparent; 
}
QLabel#mainTitle { 
    font-size: 22px; 
    font-weight: 600; 
    color: #FFFFFF; 
    margin-bottom: 2px;
}
QLabel#subTitle { 
    font-size: 13px; 
    font-weight: 400; 
    color: #888888; 
}
QLabel#statusReady { 
    color: #34D399; 
    font-weight: 500; 
    font-size: 12px; 
    padding: 6px 12px; 
    background-color: rgba(52, 211, 153, 0.1); 
    border-radius: 12px; 
    border: 1px solid rgba(52, 211, 153, 0.2); 
}
QLabel#seqNumber { 
    font-size: 56px; 
    font-weight: 500; 
    color: white; 
}
QFrame#seqCircle { 
    background-color: #1A1A1A; 
    border-radius: 70px; 
    border: 2px solid #ab7ee9; 
    min-width: 140px; 
    min-height: 140px; 
    max-width: 140px; 
    max-height: 140px; 
}
QLineEdit { 
    padding: 12px 16px; 
    border: 1px solid #333333; 
    border-radius: 8px; 
    background-color: #1A1A1A; 
    font-size: 14px; 
    color: #FFFFFF; 
    font-weight: 400; 
}
QLineEdit:focus { 
    border: 1px solid #ab7ee9; 
    background-color: #222222; 
}
QPushButton { 
    background-color: #ab7ee9; 
    color: white; 
    padding: 12px 24px; 
    border: none; 
    border-radius: 8px; 
    font-size: 14px; 
    font-weight: 500; 
}
QPushButton:hover { 
    background-color: #9a6ddb; 
}
QPushButton:disabled { 
    background-color: #2A2A2A; 
    color: #666666; 
}
QPushButton#secondaryBtn { 
    background-color: transparent; 
    color: #A0A0A0; 
    border: 1px solid #333333; 
}
QPushButton#secondaryBtn:hover { 
    background-color: #1F1F1F; 
    color: #FFFFFF; 
}
QFrame#darkCard { 
    background-color: #1A1A1A; 
    border-radius: 12px; 
    border: 1px solid #2A2A2A; 
}
QFrame#lightCard { 
    background-color: #161616; 
    border-radius: 12px; 
    border: 1px solid #262626; 
}
QListWidget { 
    background-color: transparent; 
    border: none; 
    outline: none; 
}
QListWidget::item { 
    border-bottom: 1px solid #222222; 
    margin-bottom: 4px; 
    border-radius: 8px; 
}
QListWidget::item:hover { 
    background-color: #1F1F1F; 
}
QListWidget::item:selected { 
    background-color: #262626; 
    border: 1px solid #333333; 
}
QProgressBar { 
    border: none; 
    border-radius: 3px; 
    background-color: #2A2A2A; 
    text-align: center; 
    color: transparent; 
    height: 6px; 
}
QProgressBar::chunk { 
    background-color: #ab7ee9; 
    border-radius: 3px; 
}
QScrollBar:vertical { 
    border: none; 
    background: transparent; 
    width: 6px; 
    margin: 0px 0px 0px 0px; 
}
QScrollBar::handle:vertical { 
    background: #444444; 
    min-height: 20px; 
    border-radius: 3px; 
}
QScrollBar::handle:vertical:hover {
    background: #666666;
}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { 
    height: 0px; 
}
'''