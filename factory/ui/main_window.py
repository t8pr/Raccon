import os
import tkinter as tk
from tkinter import ttk, messagebox
from PIL import Image, ImageTk, ImageOps

from ui.styles import *
from ui.components import CircularProgress, ModernButton, RoundedFrame
from core.workers import ApiWorker, NfcWriterWorker, HardwareCheckWorker
from core.config import get_asset_path


def load_logo_image(path, size, bg_color=BG_CARD):
    """Load transparent logo preserving aspect ratio and compositing cleanly onto bg_color."""
    try:
        img = Image.open(path).convert("RGBA")
        fitted = ImageOps.contain(img, size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", size, bg_color)
        offset = ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2)
        canvas.alpha_composite(fitted, dest=offset)
        return ImageTk.PhotoImage(canvas.convert("RGB"))
    except Exception:
        return None


def load_window_icon(path, size=(64, 64)):
    """Load window icon into a centered square RGBA canvas without squishing."""
    try:
        img = Image.open(path).convert("RGBA")
        fitted = ImageOps.contain(img, size, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        offset = ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2)
        canvas.alpha_composite(fitted, dest=offset)
        return ImageTk.PhotoImage(canvas)
    except Exception:
        return None



def get_rounded_image(path, size, radius=0, bg_color=BG_CARD):
    return load_logo_image(path, size, bg_color=bg_color)


class RacconFactoryApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Raccon Control System")
        self.root.geometry("1200x800")
        self.root.minsize(1024, 720)
        self.root.configure(bg=BG_MAIN)

        icon_path = get_asset_path("mark.png")
        if os.path.exists(icon_path):
            self.window_icon = load_window_icon(icon_path, (64, 64))
            if self.window_icon:
                try:
                    self.root.iconphoto(False, self.window_icon)
                except Exception:
                    pass

        self.access_token = None
        self.tags_to_program = []
        self.current_tag_index = 0
        self.total_tags_in_pack = 0
        self.pack_mode = ""
        self.pack_owner = "UnClaimed"
        self.base_url = ""
        self.is_auto_running = False

        self.container = tk.Frame(self.root, bg=BG_MAIN)
        self.container.pack(fill="both", expand=True)

        self.pages = {}
        for PageClass in (LoginPage, DashboardPage, WriterPage):
            page_name = PageClass.__name__
            frame = PageClass(parent=self.container, controller=self)
            self.pages[page_name] = frame
            frame.grid(row=0, column=0, sticky="nsew")

        self.container.grid_rowconfigure(0, weight=1)
        self.container.grid_columnconfigure(0, weight=1)

        self.show_page("LoginPage")
        self.check_hardware()

    def show_page(self, page_name):
        frame = self.pages[page_name]
        frame.tkraise()
        if hasattr(frame, "on_show"):
            frame.on_show()

    def check_hardware(self):
        if not self.is_auto_running:
            worker = HardwareCheckWorker(on_status=self.handle_hw_status)
            worker.start()
        self.root.after(3000, self.check_hardware)

    def handle_hw_status(self, connected, message):
        def _update():
            dash = self.pages["DashboardPage"]
            writer = self.pages["WriterPage"]

            if connected:
                dash.lbl_hw_status.config(text=message, fg=ACCENT_SUCCESS)
                if not self.is_auto_running:
                    writer.btn_action.set_state(state="normal")
            else:
                dash.lbl_hw_status.config(text=message, fg=ACCENT_ERROR)
                if not self.is_auto_running:
                    writer.btn_action.set_state(new_text="Reader Disconnected", state="disabled")

        self.root.after(0, _update)


class LoginPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_MAIN)
        self.controller = controller

        
        center_wrapper = tk.Frame(self, bg=BG_MAIN)
        center_wrapper.place(relx=0.5, rely=0.5, anchor="center")

        
        self.card = RoundedFrame(
            center_wrapper,
            width=430,
            height=530,
            radius=15,
            bg_color=BG_CARD,
            border_color=ACCENT_PRIMARY,
            border_width=1,
        )
        self.card.pack_propagate(False)
        self.card.pack()

        content = tk.Frame(self.card, bg=BG_CARD)
        content.place(relx=0.5, rely=0.5, anchor="center", width=340)

        
        icon_path = get_asset_path("mark.png")
        self.logo_img = load_logo_image(icon_path, (84, 64), bg_color=BG_CARD)
        if self.logo_img:
            tk.Label(content, image=self.logo_img, bg=BG_CARD, bd=0).pack(pady=(0, 18))

        tk.Label(content, text="System Access", font=FONT_TITLE, bg=BG_CARD, fg=TEXT_MAIN).pack()
        tk.Label(
            content,
            text="Authenticate to access Factory Controls",
            font=FONT_MAIN,
            bg=BG_CARD,
            fg=TEXT_SUB,
        ).pack(pady=(6, 32))

        self.entry_usr = tk.Entry(
            content,
            font=FONT_MAIN,
            bg=BG_CARD_LIGHT,
            fg=TEXT_MAIN,
            insertbackground=TEXT_MAIN,
            relief="flat",
            highlightthickness=1,
            highlightbackground=ACCENT_PRIMARY,
            highlightcolor=ACCENT_PRIMARY,
        )
        self.entry_usr.pack(fill="x", ipady=10, pady=(0, 15))
        self.entry_usr.insert(0, "Admin Username")
        self.entry_usr.bind(
            "<FocusIn>",
            lambda e: self.entry_usr.delete(0, "end")
            if self.entry_usr.get() == "Admin Username"
            else None,
        )

        self.entry_pwd = tk.Entry(
            content,
            font=FONT_MAIN,
            bg=BG_CARD_LIGHT,
            fg=TEXT_MAIN,
            insertbackground=TEXT_MAIN,
            relief="flat",
            show="*",
            highlightthickness=1,
            highlightbackground=ACCENT_PRIMARY,
            highlightcolor=ACCENT_PRIMARY,
        )
        self.entry_pwd.pack(fill="x", ipady=10, pady=(0, 25))
        self.entry_pwd.bind("<Return>", lambda e: self.do_login())

        self.btn_login = ModernButton(content, text="Authenticate", radius=15, command=self.do_login)
        self.btn_login.pack(fill="x")

        self.lbl_status = tk.Label(content, text="", font=FONT_SMALL_BOLD, bg=BG_CARD, fg=ACCENT_ERROR)
        self.lbl_status.pack(pady=(15, 0))

    def do_login(self):
        usr = self.entry_usr.get()
        pwd = self.entry_pwd.get()
        if not usr or not pwd or usr == "Admin Username":
            self.lbl_status.config(text="Missing credentials.")
            return

        self.btn_login.set_state(new_text="Authenticating...", state="disabled")
        self.lbl_status.config(text="", fg=ACCENT_PRIMARY)

        worker = ApiWorker(
            "/auth/login",
            method="POST",
            data={"username": usr, "password": pwd},
            on_success=self.login_success,
            on_error=self.login_error,
        )
        worker.start()

    def login_success(self, res):
        def _success():
            self.controller.access_token = res.get("access_token")
            self.lbl_status.config(text="")
            self.btn_login.set_state(new_text="Authenticate", state="normal")
            self.controller.show_page("DashboardPage")

        self.controller.root.after(0, _success)

    def login_error(self, err):
        self.controller.root.after(
            0, lambda: self.lbl_status.config(text=f"Denied: {err}", fg=ACCENT_ERROR)
        )
        self.controller.root.after(
            0, lambda: self.btn_login.set_state(new_text="Authenticate", state="normal")
        )


class DashboardPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_MAIN)
        self.controller = controller

        
        header = tk.Frame(self, bg=BG_MAIN)
        header.pack(fill="x", padx=40, pady=(35, 20))

        icon_path = get_asset_path("mark.png")
        self.logo_img = load_logo_image(icon_path, (54, 42), bg_color=BG_MAIN)
        if self.logo_img:
            logo = tk.Label(header, image=self.logo_img, bg=BG_MAIN, bd=0)
            logo.pack(side="left", padx=(0, 15))

        t_frame = tk.Frame(header, bg=BG_MAIN)
        t_frame.pack(side="left")
        tk.Label(t_frame, text="Factory Command Center", font=FONT_TITLE, bg=BG_MAIN, fg=TEXT_MAIN).pack(anchor="w")
        tk.Label(t_frame, text="Overview & Package Allocation", font=FONT_SMALL, bg=BG_MAIN, fg=TEXT_SUB).pack(anchor="w")

        status_frame = tk.Frame(header, bg=BG_MAIN)
        status_frame.pack(side="right", fill="y")

        
        pill = RoundedFrame(status_frame, width=165, height=36, radius=15, bg_color="#062f1c", border_width=0)
        pill.pack_propagate(False)
        pill.pack(side="right", anchor="center")
        tk.Label(
            pill,
            text="● Secure Connection",
            font=FONT_SMALL_BOLD,
            bg="#062f1c",
            fg=ACCENT_SUCCESS,
        ).place(relx=0.5, rely=0.5, anchor="center")

        
        stats = tk.Frame(self, bg=BG_MAIN)
        stats.pack(fill="x", padx=40, pady=(0, 25))
        stats.grid_columnconfigure(0, weight=1, uniform="stat")
        stats.grid_columnconfigure(1, weight=1, uniform="stat")
        stats.grid_columnconfigure(2, weight=2, uniform="stat")

        def make_stat(parent, col, title, val, fg_color, pad_right=20):
            wrapper = tk.Frame(parent, bg=BG_MAIN)
            wrapper.grid(row=0, column=col, sticky="nsew", padx=(0, pad_right))

            card = RoundedFrame(
                wrapper,
                width=240,
                height=125,
                radius=15,
                bg_color=BG_CARD,
                border_color=ACCENT_PRIMARY,
                border_width=1,
            )
            card.pack_propagate(False)
            card.pack(fill="both", expand=True)

            inner = tk.Frame(card, bg=BG_CARD)
            inner.place(relx=0.0, rely=0.5, x=24, anchor="w")

            tk.Label(inner, text=title, font=FONT_SMALL_BOLD, bg=BG_CARD, fg=TEXT_MUTED).pack(anchor="w")
            lbl = tk.Label(inner, text=val, font=FONT_NUMBER, bg=BG_CARD, fg=fg_color)
            lbl.pack(anchor="w", pady=(4, 0))
            return wrapper, lbl

        _, self.lbl_tot_packs = make_stat(stats, 0, "TOTAL PACKS", "0", TEXT_MAIN, pad_right=20)
        _, self.lbl_tot_tags = make_stat(stats, 1, "TOTAL TAGS", "0", TEXT_MAIN, pad_right=20)
        _, self.lbl_hw_status = make_stat(stats, 2, "READER MODULE", "Checking...", ACCENT_SUCCESS, pad_right=0)

        
        workspace = tk.Frame(self, bg=BG_MAIN)
        workspace.pack(fill="both", expand=True, padx=40, pady=(0, 35))

        
        left_wrap = tk.Frame(workspace, bg=BG_MAIN)
        left_wrap.pack(side="left", fill="both", expand=True, padx=(0, 20))

        dir_card = RoundedFrame(
            left_wrap,
            width=700,
            height=500,
            radius=15,
            bg_color=BG_CARD,
            border_color=ACCENT_PRIMARY,
            border_width=1,
        )
        dir_card.pack_propagate(False)
        dir_card.pack(fill="both", expand=True)

        dh = tk.Frame(dir_card, bg=BG_CARD)
        dh.pack(fill="x", padx=25, pady=(20, 15))

        dh_text = tk.Frame(dh, bg=BG_CARD)
        dh_text.pack(side="left")
        tk.Label(dh_text, text="Directory Database", font=FONT_SECTION, bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w")
        tk.Label(dh_text, text="Click a pack to initialize sequence.", font=FONT_SMALL, bg=BG_CARD, fg=TEXT_SUB).pack(anchor="w", pady=(2, 0))

        btn_sync = ModernButton(dh, text="Sync", primary=False, width=85, height=34, radius=15, command=self.load_data)
        btn_sync.pack(side="right")

        tk.Frame(dir_card, bg=BORDER_SUBTLE, height=1).pack(fill="x", padx=15, pady=(0, 10))

        
        list_outer = tk.Frame(dir_card, bg=BG_CARD)
        list_outer.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        self.dir_canvas = tk.Canvas(list_outer, bg=BG_CARD, highlightthickness=0, bd=0)
        self.dir_scrollbar = ttk.Scrollbar(list_outer, orient="vertical", command=self.dir_canvas.yview)
        self.list_container = tk.Frame(self.dir_canvas, bg=BG_CARD)

        self.dir_window = self.dir_canvas.create_window((0, 0), window=self.list_container, anchor="nw")
        self.dir_canvas.configure(yscrollcommand=self.dir_scrollbar.set)

        self.dir_canvas.pack(side="left", fill="both", expand=True)
        self.dir_scrollbar.pack(side="right", fill="y")

        self.list_container.bind(
            "<Configure>",
            lambda e: self.dir_canvas.configure(scrollregion=self.dir_canvas.bbox("all")),
        )
        self.dir_canvas.bind(
            "<Configure>",
            lambda e: self.dir_canvas.itemconfig(self.dir_window, width=e.width),
        )
        self._bind_mousewheel(self.dir_canvas)

        
        right_wrap = tk.Frame(workspace, bg=BG_MAIN)
        right_wrap.pack(side="right", fill="y")

        mo_card = RoundedFrame(
            right_wrap,
            width=320,
            height=500,
            radius=15,
            bg_color=BG_CARD,
            border_color=ACCENT_PRIMARY,
            border_width=1,
        )
        mo_card.pack_propagate(False)
        mo_card.pack(fill="y", expand=True)

        mo_inner = tk.Frame(mo_card, bg=BG_CARD)
        mo_inner.place(x=25, y=25, width=270, height=430)

        tk.Label(mo_inner, text="Manual Override", font=FONT_SECTION, bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w")
        tk.Label(mo_inner, text="Input specific Pack ID UUID.", font=FONT_SMALL, bg=BG_CARD, fg=TEXT_SUB).pack(anchor="w", pady=(4, 25))

        self.entry_uuid = tk.Entry(
            mo_inner,
            font=FONT_MAIN,
            bg=BG_CARD_LIGHT,
            fg=TEXT_MAIN,
            insertbackground=TEXT_MAIN,
            relief="flat",
            highlightthickness=1,
            highlightbackground=ACCENT_PRIMARY,
            highlightcolor=ACCENT_PRIMARY,
        )
        self.entry_uuid.pack(fill="x", ipady=10, pady=(0, 15))
        self.entry_uuid.bind("<Return>", lambda e: self.connect_pack(self.entry_uuid.get()))

        self.btn_load = ModernButton(
            mo_inner,
            text="Connect Pack",
            radius=15,
            command=lambda: self.connect_pack(self.entry_uuid.get()),
        )
        self.btn_load.pack(fill="x")

    def _bind_mousewheel(self, canvas):
        def _on_mousewheel(event):
            if event.delta:
                canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            elif event.num == 4:
                canvas.yview_scroll(-1, "units")
            elif event.num == 5:
                canvas.yview_scroll(1, "units")

        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", _on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

    def on_show(self):
        self.load_data()

    def load_data(self):
        for widget in self.list_container.winfo_children():
            widget.destroy()

        worker = ApiWorker(
            "/admin/packs",
            token=self.controller.access_token,
            on_success=self.populate_data,
            on_error=self.data_error,
        )
        worker.start()

    def populate_data(self, data):
        def _populate():
            for widget in self.list_container.winfo_children():
                widget.destroy()

            items = data.get("items", [])
            self.lbl_tot_packs.config(text=str(len(items)))
            self.lbl_tot_tags.config(text=str(sum([p.get("tags_count", 0) for p in items])))

            for p in items:
                pid = p.get("id", "")
                mode = p.get("mode", "UNKNOWN").upper()
                tags = p.get("tags_count", 0)

                
                item = RoundedFrame(
                    self.list_container,
                    height=78,
                    radius=15,
                    bg_color=BG_CARD_LIGHT,
                    border_color=ACCENT_PRIMARY,
                    border_width=1,
                )
                item.pack_propagate(False)
                item.pack(fill="x", pady=5, padx=6)

                inner = tk.Frame(item, bg=BG_CARD_LIGHT)
                inner.pack(fill="both", expand=True, padx=18, pady=12)

                text_col = tk.Frame(inner, bg=BG_CARD_LIGHT)
                text_col.pack(side="left", fill="y")

                lbl_pack = tk.Label(
                    text_col,
                    text=f"Pack: {pid}",
                    font=FONT_BOLD,
                    bg=BG_CARD_LIGHT,
                    fg=TEXT_MAIN,
                )
                lbl_pack.pack(anchor="w")

                mode_color = ACCENT_PRIMARY if mode == "SEQ" else ACCENT_SUCCESS
                sub = tk.Frame(text_col, bg=BG_CARD_LIGHT)
                sub.pack(anchor="w", pady=(3, 0))
                lbl_mode = tk.Label(sub, text=mode, font=FONT_SMALL_BOLD, bg=BG_CARD_LIGHT, fg=mode_color)
                lbl_mode.pack(side="left")
                lbl_tags = tk.Label(sub, text=f"  •  {tags} Tags", font=FONT_SMALL, bg=BG_CARD_LIGHT, fg=TEXT_SUB)
                lbl_tags.pack(side="left")

                status_lbl = tk.Label(
                    inner,
                    text="Ready",
                    font=FONT_SMALL_BOLD,
                    bg=BG_CARD_LIGHT,
                    fg=ACCENT_PRIMARY,
                )
                status_lbl.pack(side="right", padx=8)

                for w in (item, inner, text_col, lbl_pack, sub, lbl_mode, lbl_tags, status_lbl):
                    w.config(cursor="hand2")
                    w.bind("<Button-1>", lambda e, id=pid: self.connect_pack(id))

            self.list_container.update_idletasks()
            self.dir_canvas.configure(scrollregion=self.dir_canvas.bbox("all"))

        self.controller.root.after(0, _populate)

    def data_error(self, err):
        self.controller.root.after(
            0, lambda: messagebox.showerror("API Error", f"Failed to fetch directory: {err}")
        )

    def connect_pack(self, pid):
        pid = pid.strip()
        if not pid:
            return
        self.btn_load.set_state(new_text="Loading...", state="disabled")
        worker = ApiWorker(
            f"/admin/factory/pack/{pid}",
            token=self.controller.access_token,
            on_success=self.pack_found,
            on_error=self.pack_error,
        )
        worker.start()

    def pack_found(self, data):
        def _process():
            self.btn_load.set_state(new_text="Connect Pack", state="normal")
            self.controller.pack_mode = data.get("mode", "Unknown").upper()

            owner = data.get("owner_name") or data.get("owner")
            if isinstance(owner, dict):
                owner = owner.get("name") or owner.get("username")
            self.controller.pack_owner = str(owner).strip() if owner else "UnClaimed"

            self.controller.tags_to_program = data.get("tags_to_program", [])
            self.controller.total_tags_in_pack = len(self.controller.tags_to_program)

            if self.controller.tags_to_program:
                url = self.controller.tags_to_program[0].get("print_url", "")
                self.controller.base_url = url.split("/t/")[0] + "/t/" if "/t/" in url else "Unknown"

            idx = next(
                (i for i, t in enumerate(self.controller.tags_to_program) if not t.get("is_printed")),
                -1,
            )
            self.controller.current_tag_index = idx

            if idx == -1:
                messagebox.showinfo("Done", "Pack fully manufactured.")
                return

            self.controller.show_page("WriterPage")

        self.controller.root.after(0, _process)

    def pack_error(self, err):
        self.controller.root.after(
            0, lambda: self.btn_load.set_state(new_text="Connect Pack", state="normal")
        )
        self.controller.root.after(
            0, lambda: messagebox.showerror("Error", f"Failed to load pack: {err}")
        )


class WriterPage(tk.Frame):
    def __init__(self, parent, controller):
        super().__init__(parent, bg=BG_MAIN)
        self.controller = controller

        
        header = tk.Frame(self, bg=BG_MAIN)
        header.pack(fill="x", padx=40, pady=(35, 20))

        icon_path = get_asset_path("mark.png")
        self.logo_img = load_logo_image(icon_path, (54, 42), bg_color=BG_MAIN)
        if self.logo_img:
            logo = tk.Label(header, image=self.logo_img, bg=BG_MAIN, bd=0)
            logo.pack(side="left", padx=(0, 15))

        tk.Label(header, text="Terminal Interface", font=FONT_TITLE, bg=BG_MAIN, fg=TEXT_MAIN).pack(side="left")
        ModernButton(
            header,
            text="End Session",
            primary=False,
            width=130,
            height=38,
            radius=15,
            command=self.end_session,
        ).pack(side="right")

        workspace = tk.Frame(self, bg=BG_MAIN)
        workspace.pack(fill="both", expand=True, padx=40, pady=(0, 35))

        
        left_col = tk.Frame(workspace, bg=BG_MAIN)
        left_col.pack(side="left", fill="y", padx=(0, 25))

        left_card = RoundedFrame(
            left_col,
            width=340,
            height=650,
            radius=15,
            bg_color=BG_CARD,
            border_color=ACCENT_PRIMARY,
            border_width=1,
        )
        left_card.pack_propagate(False)
        left_card.pack(fill="both", expand=True)

        
        info_frame = tk.Frame(left_card, bg=BG_CARD)
        info_frame.pack(fill="x", padx=22, pady=(20, 12))

        tk.Label(info_frame, text="Pack Details", font=FONT_SECTION, bg=BG_CARD, fg=TEXT_MAIN).pack(anchor="w", pady=(0, 6))

        owner_row = tk.Frame(info_frame, bg=BG_CARD)
        owner_row.pack(fill="x", pady=2)
        tk.Label(owner_row, text="Owner: ", font=FONT_SMALL_BOLD, bg=BG_CARD, fg=TEXT_SUB).pack(side="left")
        self.lbl_owner = tk.Label(owner_row, text="UnClaimed", font=FONT_SMALL_BOLD, bg=BG_CARD, fg=ACCENT_PRIMARY)
        self.lbl_owner.pack(side="left")

        self.lbl_mode = tk.Label(info_frame, text="Mode: --", font=FONT_SMALL, bg=BG_CARD, fg=TEXT_SUB)
        self.lbl_mode.pack(anchor="w", pady=2)
        self.lbl_url = tk.Label(info_frame, text="Target: --", font=FONT_SMALL, bg=BG_CARD, fg=TEXT_SUB)
        self.lbl_url.pack(anchor="w", pady=2)

        
        tk.Frame(left_card, bg=BORDER_SUBTLE, height=1).pack(fill="x", padx=18, pady=(4, 12))

        
        prog_frame = tk.Frame(left_card, bg=BG_CARD)
        prog_frame.pack(fill="x", padx=22, pady=(0, 12))

        self.circ_prog = CircularProgress(prog_frame, size=58, thickness=4)
        self.circ_prog.pack(side="left", padx=(0, 14))

        prog_text = tk.Frame(prog_frame, bg=BG_CARD)
        prog_text.pack(side="left", fill="y", pady=6)
        self.lbl_yield = tk.Label(prog_text, text="-- / -- Units", font=(FONT_FAMILY, 13, "bold"), bg=BG_CARD, fg=TEXT_MAIN)
        self.lbl_yield.pack(anchor="w")
        tk.Label(prog_text, text="Completion Rate", font=FONT_SMALL, bg=BG_CARD, fg=TEXT_SUB).pack(anchor="w", pady=(2, 0))

        
        tk.Frame(left_card, bg=BORDER_SUBTLE, height=1).pack(fill="x", padx=18, pady=(0, 10))

        
        queue_outer = tk.Frame(left_card, bg=BG_CARD)
        queue_outer.pack(fill="both", expand=True, padx=12, pady=(0, 15))

        self.queue_canvas = tk.Canvas(queue_outer, bg=BG_CARD, highlightthickness=0, bd=0)
        self.queue_scrollbar = ttk.Scrollbar(queue_outer, orient="vertical", command=self.queue_canvas.yview)
        self.list_container = tk.Frame(self.queue_canvas, bg=BG_CARD)

        self.queue_window = self.queue_canvas.create_window((0, 0), window=self.list_container, anchor="nw")
        self.queue_canvas.configure(yscrollcommand=self.queue_scrollbar.set)

        self.queue_canvas.pack(side="left", fill="both", expand=True)
        self.queue_scrollbar.pack(side="right", fill="y")

        self.list_container.bind(
            "<Configure>",
            lambda e: self.queue_canvas.configure(scrollregion=self.queue_canvas.bbox("all")),
        )
        self.queue_canvas.bind(
            "<Configure>",
            lambda e: self.queue_canvas.itemconfig(self.queue_window, width=e.width),
        )
        self._bind_mousewheel(self.queue_canvas)

        
        center_col = tk.Frame(workspace, bg=BG_MAIN)
        center_col.pack(side="left", fill="both", expand=True)

        center_card = RoundedFrame(
            center_col,
            width=700,
            height=650,
            radius=15,
            bg_color=BG_CARD,
            border_color=ACCENT_PRIMARY,
            border_width=1,
        )
        center_card.pack_propagate(False)
        center_card.pack(fill="both", expand=True)

        inner_center = tk.Frame(center_card, bg=BG_CARD)
        inner_center.place(relx=0.5, rely=0.5, anchor="center", width=460)

        self.lbl_status = tk.Label(
            inner_center,
            text="System Standby",
            font=FONT_LARGE,
            bg=BG_CARD,
            fg=TEXT_MAIN,
            justify="center",
        )
        self.lbl_status.pack(fill="x")

        self.lbl_sub = tk.Label(
            inner_center,
            text="Mount unformatted NTAG to interface pad",
            font=FONT_MAIN,
            bg=BG_CARD,
            fg=TEXT_SUB,
            justify="center",
        )
        self.lbl_sub.pack(fill="x", pady=(8, 35))

        
        self.id_box = RoundedFrame(
            inner_center,
            width=150,
            height=150,
            radius=15,
            bg_color=BG_CARD,
            border_color=ACCENT_PRIMARY,
            border_width=2,
        )
        self.id_box.pack(pady=10)
        self.id_box.pack_propagate(False)

        self.lbl_id = tk.Label(
            self.id_box,
            text="--",
            font=(FONT_FAMILY, 46, "bold"),
            bg=BG_CARD,
            fg=TEXT_MAIN,
            justify="center",
            anchor="center",
        )
        self.lbl_id.place(relx=0.5, rely=0.5, anchor="center")

        self.btn_action = ModernButton(
            inner_center,
            text="Initialize Sequence",
            height=48,
            radius=15,
            command=self.toggle_auto,
        )
        self.btn_action.pack(fill="x", pady=(40, 15))

        self.lbl_console = tk.Label(
            inner_center,
            text="System awaiting engagement...",
            font=("Consolas", 11),
            bg=BG_CARD,
            fg=TEXT_SUB,
            justify="center",
        )
        self.lbl_console.pack(fill="x")

    def _bind_mousewheel(self, canvas):
        def _on_mousewheel(event):
            if event.delta:
                canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            elif event.num == 4:
                canvas.yview_scroll(-1, "units")
            elif event.num == 5:
                canvas.yview_scroll(1, "units")

        canvas.bind("<Enter>", lambda e: canvas.bind_all("<MouseWheel>", _on_mousewheel))
        canvas.bind("<Leave>", lambda e: canvas.unbind_all("<MouseWheel>"))

    def on_show(self):
        self.update_ui()

    def end_session(self):
        self.controller.is_auto_running = False
        self.controller.show_page("DashboardPage")

    def update_ui(self):
        c = self.controller
        owner_val = getattr(c, "pack_owner", None) or "UnClaimed"
        is_claimed = owner_val.lower() not in ("unclaimed", "uncliamd", "none", "")
        self.lbl_owner.config(
            text=owner_val,
            fg=ACCENT_SUCCESS if is_claimed else ACCENT_PRIMARY,
        )
        self.lbl_mode.config(text=f"Mode: {c.pack_mode}")
        self.lbl_url.config(text=f"Target: {c.base_url}")

        for widget in self.list_container.winfo_children():
            widget.destroy()

        printed = 0
        total_items = len(c.tags_to_program)
        for i, tag in enumerate(c.tags_to_program):
            num = tag["sequence_num"]
            is_active = i == c.current_tag_index

            row_bg = BG_CARD_LIGHT if is_active else BG_CARD
            row_border = ACCENT_PRIMARY if is_active else BORDER_SUBTLE
            row_bw = 1 if is_active else 0

            item = RoundedFrame(
                self.list_container,
                height=50,
                radius=15,
                bg_color=row_bg,
                border_color=row_border,
                border_width=row_bw,
            )
            item.pack_propagate(False)
            item.pack(fill="x", pady=3, padx=6)

            inner = tk.Frame(item, bg=row_bg)
            inner.pack(fill="both", expand=True, padx=16, pady=10)

            tk.Label(
                inner,
                text=f"Node {num:02d}",
                font=FONT_BOLD,
                bg=row_bg,
                fg=TEXT_MAIN if is_active else TEXT_SUB,
            ).pack(side="left", anchor="center")

            stat = tk.Label(inner, font=FONT_SMALL_BOLD, bg=row_bg)
            stat.pack(side="right", anchor="center")

            if tag.get("is_printed"):
                stat.config(text="Done", fg=ACCENT_SUCCESS)
                printed += 1
            elif is_active:
                stat.config(text="Active", fg=ACCENT_PRIMARY)
            else:
                stat.config(text="Queue", fg=TEXT_MUTED)

        self.list_container.update_idletasks()
        self.queue_canvas.configure(scrollregion=self.queue_canvas.bbox("all"))
        if total_items > 0 and 0 <= c.current_tag_index < total_items:
            target_fraction = max(0.0, (c.current_tag_index - 2) / max(1, total_items))
            self.queue_canvas.yview_moveto(target_fraction)

        self.lbl_yield.config(text=f"{printed} / {c.total_tags_in_pack} Units")
        pct = int((printed / c.total_tags_in_pack) * 100) if c.total_tags_in_pack > 0 else 0
        self.circ_prog.set_value(pct)

        if c.current_tag_index < len(c.tags_to_program) and c.current_tag_index != -1:
            num = c.tags_to_program[c.current_tag_index]["sequence_num"]
            self.lbl_status.config(text=f"Targeting Node {num}")
            self.lbl_sub.config(text="Mount unformatted NTAG to interface pad")
            self.lbl_id.config(text=f"{num:02d}")

            if c.is_auto_running:
                self.btn_action.set_state(new_text="Halt Process", bg_override=ACCENT_ERROR)
                self.id_box.config(highlightbackground=ACCENT_ERROR)
                self.process_tag()
            else:
                self.btn_action.set_state(new_text="Initialize Sequence", bg_override=ACCENT_PRIMARY)
                self.id_box.config(highlightbackground=ACCENT_PRIMARY)
                self.lbl_console.config(text="Ready to program NFC tag.", fg=TEXT_SUB)
        else:
            c.is_auto_running = False
            self.lbl_status.config(text="Complete")
            self.lbl_sub.config(text="Package fully programmed.")
            self.lbl_id.config(text="✔")
            self.btn_action.set_state(new_text="Locked", state="disabled")
            self.id_box.config(highlightbackground=ACCENT_SUCCESS)
            self.lbl_console.config(text="")

    def toggle_auto(self):
        c = self.controller
        c.is_auto_running = not c.is_auto_running
        if c.is_auto_running:
            self.btn_action.set_state(new_text="Halt Process", bg_override=ACCENT_ERROR)
            self.id_box.config(highlightbackground=ACCENT_ERROR)
            self.process_tag()
        else:
            self.btn_action.set_state(new_text="Halting...", state="disabled")

    def process_tag(self):
        c = self.controller
        if not c.is_auto_running:
            return
        tag = c.tags_to_program[c.current_tag_index]

        self.lbl_console.config(fg=TEXT_SUB)

        worker = NfcWriterWorker(
            tag["print_url"],
            on_log=lambda m: self.controller.root.after(0, lambda: self.lbl_console.config(text=m)),
            on_finish=self.on_nfc_done,
        )
        worker.start()

    def on_nfc_done(self, success, msg):
        c = self.controller
        if not c.is_auto_running:
            return self.controller.root.after(0, self.update_ui)

        if success:
            self.controller.root.after(0, lambda: self.lbl_console.config(text="Validating checksum..."))
            tag = c.tags_to_program[c.current_tag_index]
            sync = ApiWorker(
                f"/admin/factory/tags/{tag['tag_id']}/mark-printed",
                "PATCH",
                token=c.access_token,
                on_success=self.on_sync_success,
                on_error=self.on_sync_error,
            )
            sync.start()
        else:
            c.is_auto_running = False
            self.controller.root.after(
                0, lambda: self.lbl_console.config(text=f"Error: {msg}", fg=ACCENT_ERROR)
            )
            self.controller.root.after(0, self.update_ui)

    def on_sync_success(self, data):
        c = self.controller
        c.tags_to_program[c.current_tag_index]["is_printed"] = True
        c.current_tag_index = next(
            (i for i, t in enumerate(c.tags_to_program) if not t.get("is_printed")), -1
        )
        if not c.is_auto_running:
            return self.controller.root.after(0, self.update_ui)
        self.controller.root.after(800, self.update_ui)

    def on_sync_error(self, err):
        self.controller.is_auto_running = False
        self.controller.root.after(
            0, lambda: self.lbl_console.config(text=f"Sync Failure: {err}", fg=ACCENT_ERROR)
        )
        self.controller.root.after(0, self.update_ui)
