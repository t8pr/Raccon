from PyQt6.QtWidgets import QWidget
from PyQt6.QtGui import QPainter, QPen, QColor, QFont
from PyQt6.QtCore import Qt

class CircularProgress(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.percentage = 0
        self.setFixedSize(60, 60)

    def set_value(self, val):
        self.percentage = val
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        rect = self.rect()
        rect.adjust(5, 5, -5, -5)
        
        pen_bg = QPen(QColor("#2A2A2A"), 3)
        painter.setPen(pen_bg)
        painter.drawArc(rect, 0, 360 * 16)
        
        if self.percentage > 0:
            pen_fg = QPen(QColor("#ab7ee9"), 3)
            pen_fg.setCapStyle(Qt.PenCapStyle.RoundCap)
            painter.setPen(pen_fg)
            span_angle = int(-self.percentage * 3.6 * 16)
            painter.drawArc(rect, 90 * 16, span_angle)
            
        painter.setPen(QColor("#FFFFFF"))
        font = QFont("-apple-system", 11, QFont.Weight.Medium)
        painter.setFont(font)
        painter.drawText(self.rect(), Qt.AlignmentFlag.AlignCenter, f"{self.percentage}%")