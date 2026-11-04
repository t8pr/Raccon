import tkinter as tk
import math
from ui.styles import *


def _rounded_rect_coords(x1, y1, x2, y2, r):
    r = max(0, min(r, (x2 - x1) / 2, (y2 - y1) / 2))
    return [
        x1 + r, y1,
        x1 + r, y1,
        x2 - r, y1,
        x2 - r, y1,
        x2, y1,
        x2, y1 + r,
        x2, y1 + r,
        x2, y2 - r,
        x2, y2 - r,
        x2, y2,
        x2 - r, y2,
        x2 - r, y2,
        x1 + r, y2,
        x1 + r, y2,
        x1, y2,
        x1, y2 - r,
        x1, y2 - r,
        x1, y1 + r,
        x1, y1 + r,
        x1, y1,
    ]


class RoundedFrame(tk.Canvas):
    def __init__(self, parent, bg_color=BG_CARD, border_color=BORDER_COLOR, radius=15, border_width=1, **kwargs):
        try:
            parent_bg = parent.cget("bg")
        except Exception:
            parent_bg = BG_MAIN
        super().__init__(parent, bg=parent_bg, highlightthickness=0, bd=0, **kwargs)
        self.radius = radius
        self.bg_color = bg_color
        self.border_color = border_color
        self.border_width = border_width
        self.bind("<Configure>", self.draw)

    def draw(self, event=None):
        self.delete("rounded_bg")
        w = self.winfo_width()
        h = self.winfo_height()
        r = self.radius
        bw = self.border_width

        if w > 2 and h > 2:
            if bw > 0:
                self.create_polygon(
                    _rounded_rect_coords(0, 0, w, h, r),
                    fill=self.border_color,
                    outline="",
                    smooth=True,
                    tags="rounded_bg",
                )
            inner_r = max(0, r - bw)
            self.create_polygon(
                _rounded_rect_coords(bw, bw, w - bw, h - bw, inner_r),
                fill=self.bg_color,
                outline="",
                smooth=True,
                tags="rounded_bg",
            )
            self.tag_lower("rounded_bg")

    def set_colors(self, bg_color=None, border_color=None, border_width=None):
        if bg_color is not None:
            self.bg_color = bg_color
        if border_color is not None:
            self.border_color = border_color
        if border_width is not None:
            self.border_width = border_width
        self.draw()

    def configure(self, cnf=None, **kwargs):
        redraw = False
        if "bg_color" in kwargs:
            self.bg_color = kwargs.pop("bg_color")
            redraw = True
        if "border_color" in kwargs:
            self.border_color = kwargs.pop("border_color")
            redraw = True
        if "highlightbackground" in kwargs:
            self.border_color = kwargs.pop("highlightbackground")
            redraw = True
        if "border_width" in kwargs:
            self.border_width = kwargs.pop("border_width")
            redraw = True
        result = super().configure(cnf, **kwargs) if (cnf or kwargs) else None
        if redraw:
            self.draw()
        return result

    config = configure


class CircularProgress(tk.Canvas):
    def __init__(self, parent, size=65, thickness=4, **kwargs):
        try:
            parent_bg = parent.cget("bg")
        except Exception:
            parent_bg = BG_CARD
        super().__init__(parent, width=size, height=size, bg=parent_bg, highlightthickness=0, bd=0, **kwargs)
        self.size = size
        self.thickness = thickness
        self.percentage = 0
        self.draw()

    def set_value(self, val):
        self.percentage = val
        self.draw()

    def draw(self):
        self.delete("all")
        padding = 6
        x0, y0 = padding, padding
        x1, y1 = self.size - padding, self.size - padding

        self.create_arc(x0, y0, x1, y1, start=0, extent=359.9, style=tk.ARC, outline=BORDER_SUBTLE, width=self.thickness)

        if self.percentage > 0:
            extent = -min(359.9, (self.percentage / 100) * 360)
            self.create_arc(x0, y0, x1, y1, start=90, extent=extent, style=tk.ARC, outline=ACCENT_PRIMARY, width=self.thickness)

        self.create_text(
            self.size / 2,
            self.size / 2,
            text=f"{self.percentage}%",
            fill=TEXT_MAIN,
            font=(FONT_FAMILY, 10, "bold"),
        )


class ModernButton(tk.Canvas):
    def __init__(self, parent, text, command=None, primary=True, height=45, radius=15, **kwargs):
        try:
            parent_bg = parent.cget("bg")
        except Exception:
            parent_bg = BG_CARD
        super().__init__(parent, height=height, bg=parent_bg, highlightthickness=0, bd=0, **kwargs)
        self.parent_bg = parent_bg
        self.text = text
        self.command = command
        self.primary = primary
        self.radius = radius
        self.bg_color = ACCENT_PRIMARY if primary else BG_CARD_LIGHT
        self.fg_color = TEXT_MAIN if primary else TEXT_SUB
        self.active_bg = ACCENT_HOVER if primary else BG_HOVER
        self.border_color = ACCENT_PRIMARY

        self.bind("<Configure>", self.draw)
        self.bind("<Button-1>", self.on_press)
        self.bind("<ButtonRelease-1>", self.on_release)
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)
        self.config(cursor="hand2")

    def draw(self, event=None, state="normal"):
        self.delete("all")
        w = self.winfo_width()
        h = self.winfo_height()
        r = self.radius

        current_bg = self.active_bg if state in ["hover", "pressed"] else self.bg_color

        if w > 2 and h > 2:
            
            self.create_polygon(
                _rounded_rect_coords(0, 0, w, h, r),
                fill=self.border_color,
                outline="",
                smooth=True,
            )
            
            bw = 0 if self.primary else 1
            inner_r = max(0, r - bw)
            self.create_polygon(
                _rounded_rect_coords(bw, bw, w - bw, h - bw, inner_r),
                fill=current_bg,
                outline="",
                smooth=True,
            )

            self.create_text(
                w / 2,
                h / 2,
                text=self.text,
                fill=self.fg_color,
                font=(FONT_FAMILY, 11, "bold"),
            )

    def set_state(self, new_text=None, state="normal", bg_override=None):
        if new_text:
            self.text = new_text
        if state == "disabled":
            self.bg_color = "#2A2A2A"
            self.fg_color = "#71717A"
            self.border_color = "#2A2A2A"
            self.unbind("<Button-1>")
            self.unbind("<Enter>")
            self.unbind("<Leave>")
            self.config(cursor="arrow")
        else:
            if bg_override:
                self.bg_color = bg_override
                self.border_color = bg_override
                self.active_bg = bg_override
            else:
                self.bg_color = ACCENT_PRIMARY if self.primary else BG_CARD_LIGHT
                self.border_color = ACCENT_PRIMARY
                self.active_bg = ACCENT_HOVER if self.primary else BG_HOVER

            self.fg_color = TEXT_MAIN
            self.bind("<Button-1>", self.on_press)
            self.bind("<Enter>", self.on_enter)
            self.bind("<Leave>", self.on_leave)
            self.config(cursor="hand2")
        self.draw()

    def on_press(self, event):
        self.draw(state="pressed")

    def on_release(self, event):
        if self.cget("cursor") != "arrow":
            self.draw(state="hover")
            if self.command:
                if 0 <= event.x <= self.winfo_width() and 0 <= event.y <= self.winfo_height():
                    self.command()

    def on_enter(self, event):
        self.draw(state="hover")

    def on_leave(self, event):
        self.draw(state="normal")
