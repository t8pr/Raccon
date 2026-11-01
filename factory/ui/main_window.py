import os
from PyQt6.QtWidgets import (QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
                             QLabel, QLineEdit, QPushButton, QStackedWidget, 
                             QMessageBox, QListWidget, QListWidgetItem, QProgressBar, QFrame, QSizePolicy, QAbstractItemView)
from PyQt6.QtCore import Qt, QTimer, QSize
from PyQt6.QtGui import QPixmap, QIcon

try:
    import qtawesome as qta
    HAS_QTA = True
except ImportError:
    HAS_QTA = False

from ui.styles import STYLESHEET
from ui.components import CircularProgress
from core.workers import ApiWorker, NfcWriterWorker, HardwareCheckWorker
from core.config import get_asset_path

class RacconFactoryApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Raccon Control System")
        self.setMinimumSize(1250, 850)
        self.setStyleSheet(STYLESHEET)

        icon_path = get_asset_path("mark.png")
        if os.path.exists(icon_path):
            self.setWindowIcon(QIcon(icon_path))

        self.access_token = None
        self.tags_to_program = []
        self.current_tag_index = 0
        self.total_tags_in_pack = 0
        self.pack_mode = ""
        self.base_url = ""
        self.is_auto_running = False

        self.central_widget = QWidget()
        self.setCentralWidget(self.central_widget)
        self.main_layout = QVBoxLayout(self.central_widget)
        self.main_layout.setContentsMargins(0, 0, 0, 0)

        self.stacked_widget = QStackedWidget()
        self.main_layout.addWidget(self.stacked_widget)

        self.build_login_page()
        self.build_dashboard_page()
        self.build_writer_page()

        self.stacked_widget.addWidget(self.login_page)
        self.stacked_widget.addWidget(self.dashboard_page)
        self.stacked_widget.addWidget(self.writer_page)
        self.stacked_widget.setCurrentWidget(self.login_page)
        
        
        self.hw_timer = QTimer(self)
        self.hw_timer.timeout.connect(self.check_hardware)
        self.hw_timer.start(3000) 

    def switch_page(self, index):
        self.stacked_widget.setCurrentIndex(index)

    def check_hardware(self):
        
        if self.is_auto_running: return
        self.hw_worker = HardwareCheckWorker()
        self.hw_worker.status_signal.connect(self.update_hardware_status)
        self.hw_worker.start()

    def update_hardware_status(self, connected, message):
        if connected:
            self.stat_rate.setText(message)
            self.stat_rate.setStyleSheet("color: #34D399; font-size: 26px; font-weight: 600;")
            self.action_btn.setEnabled(True)
        else:
            self.stat_rate.setText(message)
            self.stat_rate.setStyleSheet("color: #F87171; font-size: 22px; font-weight: 600;")
            self.action_btn.setEnabled(False)
            self.action_btn.setText("Reader Disconnected")

    
    def build_login_page(self):
        self.login_page = QWidget()
        layout = QVBoxLayout(self.login_page)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        card = QFrame()
        card.setObjectName("darkCard")
        card.setFixedSize(420, 500)
        card_layout = QVBoxLayout(card)
        card_layout.setContentsMargins(40, 50, 40, 50)
        card_layout.setSpacing(15)

        logo_label = QLabel()
        icon_path = get_asset_path("mark.png")
        if os.path.exists(icon_path):
            logo_label.setPixmap(QPixmap(icon_path).scaled(70, 70, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        logo_label.setAlignment(Qt.AlignmentFlag.AlignCenter)

        title = QLabel("System Access")
        title.setObjectName("mainTitle")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("Admin Username")
        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("Password")
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)

        self.login_btn = QPushButton("Sign in")
        self.login_btn.setMinimumHeight(45)
        self.login_btn.clicked.connect(self.handle_login)

        self.login_status = QLabel("")
        self.login_status.setStyleSheet("color: #F87171; font-weight: 500;") 
        self.login_status.setAlignment(Qt.AlignmentFlag.AlignCenter)

        card_layout.addWidget(logo_label)
        card_layout.addWidget(title)
        card_layout.addSpacing(25)
        card_layout.addWidget(self.username_input)
        card_layout.addWidget(self.password_input)
        card_layout.addSpacing(15)
        card_layout.addWidget(self.login_btn)
        card_layout.addWidget(self.login_status)
        layout.addWidget(card)

    def handle_login(self):
        usr, pwd = self.username_input.text().strip(), self.password_input.text().strip()
        if not usr or not pwd: return
        self.login_btn.setEnabled(False)
        self.login_status.setStyleSheet("color: #ab7ee9;")
        self.login_status.setText("Authenticating...")

        self.auth_worker = ApiWorker("/auth/login", method="POST", data={"username": usr, "password": pwd})
        self.auth_worker.finished.connect(self.on_login_success)
        self.auth_worker.error.connect(self.on_login_error)
        self.auth_worker.start()

    def on_login_success(self, res):
        self.access_token = res.get("access_token")
        self.login_btn.setEnabled(True)
        self.switch_page(1)
        self.fetch_dashboard_data()

    def on_login_error(self, err):
        self.login_status.setStyleSheet("color: #F87171;")
        self.login_status.setText(f"Denied: {err}")
        self.login_btn.setEnabled(True)

    
    def build_dashboard_page(self):
        self.dashboard_page = QWidget()
        layout = QVBoxLayout(self.dashboard_page)
        layout.setContentsMargins(50, 40, 50, 40)
        
        top_bar = QHBoxLayout()
        top_bar.setAlignment(Qt.AlignmentFlag.AlignVCenter)
        
        logo = QLabel()
        icon_path = get_asset_path("mark.png")
        if os.path.exists(icon_path):
            logo.setPixmap(QPixmap(icon_path).scaled(40, 40, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        
        title_box = QVBoxLayout()
        title_box.setSpacing(0)
        t = QLabel("Factory Command Center", objectName="mainTitle")
        st = QLabel("Overview & Package Allocation", objectName="subTitle")
        title_box.addWidget(t)
        title_box.addWidget(st)
        
        top_bar.addWidget(logo)
        top_bar.addSpacing(15)
        top_bar.addLayout(title_box)
        top_bar.addStretch()
        
        status_box = QHBoxLayout()
        if HAS_QTA:
            icon_lbl = QLabel()
            icon_lbl.setPixmap(qta.icon('fa5s.check-circle', color='#34D399').pixmap(16,16))
            status_box.addWidget(icon_lbl)
        
        lbl = QLabel("Secure Connection")
        lbl.setStyleSheet("color: #34D399; font-weight: 500; font-size: 14px;")
        status_box.addWidget(lbl)
        
        status_container = QFrame()
        status_container.setStyleSheet("background-color: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: 8px; padding: 5px 15px;")
        status_container.setLayout(status_box)
        top_bar.addWidget(status_container)

        stats_layout = QHBoxLayout()
        def make_stat(title_text, val_text, color, icon_name=None):
            card = QFrame()
            card.setObjectName("darkCard")
            card.setFixedHeight(110)
            l = QVBoxLayout(card)
            l.setContentsMargins(25, 20, 25, 20)
            
            top_lyt = QHBoxLayout()
            t_lbl = QLabel(title_text.upper())
            t_lbl.setStyleSheet("color: #888888; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;")
            top_lyt.addWidget(t_lbl)
            top_lyt.addStretch()
            if icon_name and HAS_QTA:
                ico = QLabel()
                ico.setPixmap(qta.icon(icon_name, color='#555555').pixmap(16,16))
                top_lyt.addWidget(ico)
                
            v_lbl = QLabel(val_text)
            v_lbl.setStyleSheet(f"color: {color}; font-size: 32px; font-weight: 600; padding-top: 5px;")
            
            l.addLayout(top_lyt)
            l.addStretch()
            l.addWidget(v_lbl)
            return card, v_lbl

        c1, self.stat_packs = make_stat("Total Packs Registered", "--", "#FFFFFF", "fa5s.boxes")
        c2, self.stat_tags = make_stat("Total Tags Global", "--", "#FFFFFF", "fa5s.tags")
        c3, self.stat_rate = make_stat("Reader Module", "Checking...", "#A0A0A0", "fa5s.microchip")
        stats_layout.addWidget(c1)
        stats_layout.addWidget(c2)
        stats_layout.addWidget(c3)

        workspace = QHBoxLayout()
        workspace.setSpacing(25)
        
        dir_frame = QFrame()
        dir_frame.setObjectName("lightCard")
        dir_layout = QVBoxLayout(dir_frame)
        dir_layout.setContentsMargins(0,0,0,0)
        
        d_h_area = QWidget()
        d_h_area.setStyleSheet("background-color: #1A1A1A; border-top-left-radius: 12px; border-top-right-radius: 12px; border-bottom: 1px solid #262626;")
        d_h_layout = QHBoxLayout(d_h_area)
        d_h_layout.setContentsMargins(25, 20, 25, 20)
        
        db_title = QVBoxLayout()
        db_t1 = QLabel("Directory Database", styleSheet="font-size: 16px; font-weight: 600; color: white;")
        db_t2 = QLabel("Double-click a pack to initialize sequence.", styleSheet="font-size: 12px; color: #888888;")
        db_title.addWidget(db_t1)
        db_title.addWidget(db_t2)
        
        ref_btn = QPushButton()
        if HAS_QTA:
            ref_btn.setIcon(qta.icon('fa5s.sync-alt', color='#FFFFFF'))
        else:
            ref_btn.setText("Sync")
        ref_btn.setObjectName("secondaryBtn")
        ref_btn.setFixedSize(40, 40)
        ref_btn.clicked.connect(self.fetch_dashboard_data)
        
        d_h_layout.addLayout(db_title)
        d_h_layout.addStretch()
        d_h_layout.addWidget(ref_btn)
        
        self.packs_list = QListWidget()
        self.packs_list.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection) 
        self.packs_list.setStyleSheet("padding: 10px;")
        self.packs_list.itemDoubleClicked.connect(lambda i: self.connect_pack(i.data(Qt.ItemDataRole.UserRole)))
        
        dir_layout.addWidget(d_h_area)
        dir_layout.addWidget(self.packs_list)

        search_area = QFrame()
        search_area.setObjectName("lightCard")
        search_area.setFixedWidth(400)
        s_layout = QVBoxLayout(search_area)
        s_layout.setContentsMargins(30, 30, 30, 30)
        s_layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        
        s_icon = QLabel()
        if HAS_QTA: s_icon.setPixmap(qta.icon('fa5s.terminal', color='#ab7ee9').pixmap(32,32))
        
        s_layout.addWidget(s_icon)
        s_layout.addSpacing(10)
        s_layout.addWidget(QLabel("Manual Override", styleSheet="font-size: 16px; font-weight: 600; color: white;"))
        s_layout.addWidget(QLabel("Input specific Pack ID UUID to bypass directory selection.", styleSheet="color: #888888; font-size: 13px; margin-bottom: 16px;"), alignment=Qt.AlignmentFlag.AlignTop)
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Paste UUID...")
        self.search_input.setMinimumHeight(45)
        
        s_btn = QPushButton("Initialize Pack")
        s_btn.setMinimumHeight(45)
        if HAS_QTA: s_btn.setIcon(qta.icon('fa5s.bolt', color='white'))
        s_btn.clicked.connect(lambda: self.connect_pack(self.search_input.text().strip()))
        
        s_layout.addWidget(self.search_input)
        s_layout.addSpacing(10)
        s_layout.addWidget(s_btn)

        workspace.addWidget(dir_frame, stretch=2)
        workspace.addWidget(search_area, stretch=1)

        layout.addLayout(top_bar)
        layout.addSpacing(30)
        layout.addLayout(stats_layout)
        layout.addSpacing(25)
        layout.addLayout(workspace)

    def fetch_dashboard_data(self):
        self.packs_list.clear()
        self.dash_worker = ApiWorker("/admin/packs", token=self.access_token)
        self.dash_worker.finished.connect(self.on_dash_data)
        self.dash_worker.start()

    def on_dash_data(self, data):
        items = data.get("items", [])
        self.stat_packs.setText(str(len(items)))
        self.stat_tags.setText(str(sum([p.get("tags_count", 0) for p in items])))
        
        for p in items:
            item = QListWidgetItem()
            w = QWidget()
            w.setStyleSheet("background: transparent;")
            
            
            l = QHBoxLayout(w)
            l.setContentsMargins(15, 12, 15, 12)
            
            icon_lbl = QLabel()
            if HAS_QTA:
                icon_lbl.setPixmap(qta.icon('fa5s.box', color='#555555').pixmap(24, 24))
            else:
                icon_lbl.setText("📦")
                
            info_box = QVBoxLayout()
            info_box.setSpacing(4)
            
            pack_id_str = str(p.get('id', 'Unknown'))
            
            
            id_lbl = QLabel(pack_id_str)
            id_lbl.setStyleSheet("font-weight: 500; color: #FFFFFF; font-size: 14px;")
            id_lbl.setMinimumWidth(300) 
            
            mode_str = str(p.get('mode', 'UNKNOWN')).upper()
            tags_count = p.get('tags_count', 0)
            mode_color = "#ab7ee9" if mode_str == "SEQ" else "#10B981"
            
            sub_lbl = QLabel(f"<span style='color:{mode_color}; font-weight:600;'>{mode_str}</span> &nbsp;&nbsp;•&nbsp;&nbsp; {tags_count} Tags")
            sub_lbl.setStyleSheet("color: #A0A0A0; font-size: 12px; font-weight: 400;")
            
            info_box.addWidget(id_lbl)
            info_box.addWidget(sub_lbl)
            
            l.addWidget(icon_lbl)
            l.addSpacing(15)
            l.addLayout(info_box, stretch=1) 
            
            action_lbl = QLabel("Ready")
            action_lbl.setStyleSheet("color: #ab7ee9; font-weight: 600; font-size: 13px;")
            l.addWidget(action_lbl, alignment=Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            
            w.setMinimumHeight(65)
            item.setSizeHint(w.sizeHint())
            item.setData(Qt.ItemDataRole.UserRole, pack_id_str)
            self.packs_list.addItem(item)
            self.packs_list.setItemWidget(item, w)

    def connect_pack(self, pid):
        if not pid: return
        self.pack_worker = ApiWorker(f"/admin/factory/pack/{pid}", token=self.access_token)
        self.pack_worker.finished.connect(self.on_pack_found)
        self.pack_worker.start()

    def on_pack_found(self, data):
        self.pack_mode = data.get("mode", "Unknown").upper()
        self.tags_to_program = data.get("tags_to_program", [])
        self.total_tags_in_pack = len(self.tags_to_program)
        if self.tags_to_program:
            url = self.tags_to_program[0].get("print_url", "")
            self.base_url = url.split('/t/')[0] + '/t/' if '/t/' in url else "Unknown"

        self.current_tag_index = next((i for i, t in enumerate(self.tags_to_program) if not t.get("is_printed")), -1)
        if self.current_tag_index == -1:
            QMessageBox.information(self, "Done", "Pack fully manufactured.")
            return

        self.setup_writer_ui()
        self.switch_page(2)

    
    def build_writer_page(self):
        self.writer_page = QWidget()
        layout = QVBoxLayout(self.writer_page)
        layout.setContentsMargins(40, 30, 40, 40)

        header = QHBoxLayout()
        header.setAlignment(Qt.AlignmentFlag.AlignVCenter)
        
        logo = QLabel()
        icon_path = get_asset_path("mark.png")
        if os.path.exists(icon_path):
            logo.setPixmap(QPixmap(icon_path).scaled(35, 35, Qt.AspectRatioMode.KeepAspectRatio, Qt.TransformationMode.SmoothTransformation))
        
        header.addWidget(logo)
        header.addSpacing(10)
        header.addWidget(QLabel("Terminal Interface", objectName="mainTitle"))
        header.addStretch()
        bb = QPushButton("End Session")
        bb.setObjectName("secondaryBtn")
        bb.setFixedSize(120, 36)
        bb.clicked.connect(lambda: self.switch_page(1))
        header.addWidget(bb)

        workspace = QHBoxLayout()
        workspace.setSpacing(25)
        
        
        left_panel = QFrame()
        left_panel.setObjectName("lightCard")
        left_panel.setFixedWidth(340)
        l_layout = QVBoxLayout(left_panel)
        l_layout.setContentsMargins(0,0,0,0)
        
        info_area = QWidget()
        info_area.setStyleSheet("background-color: #1A1A1A; border-top-left-radius: 12px; border-top-right-radius: 12px; border-bottom: 1px solid #262626;")
        i_layout = QVBoxLayout(info_area)
        i_layout.setContentsMargins(25, 20, 25, 20)
        
        self.lbl_mode_info = QLabel("Mode: --")
        self.lbl_mode_info.setStyleSheet("color: #A0A0A0; font-size: 13px;")
        self.lbl_url_info = QLabel("Target: --")
        self.lbl_url_info.setStyleSheet("color: #A0A0A0; font-size: 13px;")
        
        i_layout.addWidget(QLabel("Pack Details", styleSheet="color: #FFFFFF; font-weight: 600; font-size: 15px; margin-bottom: 8px;"))
        i_layout.addWidget(self.lbl_mode_info)
        i_layout.addWidget(self.lbl_url_info)
        
        prog_area = QWidget()
        p_layout = QHBoxLayout(prog_area)
        p_layout.setContentsMargins(25, 20, 25, 20)
        p_layout.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        
        self.circular_progress = CircularProgress()
        
        pt = QVBoxLayout()
        pt.setAlignment(Qt.AlignmentFlag.AlignVCenter)
        self.lbl_yield = QLabel("-- / -- Units")
        self.lbl_yield.setStyleSheet("color: #FFFFFF; font-weight: 600; font-size: 15px;")
        pt.addWidget(self.lbl_yield)
        pt.addWidget(QLabel("Completion Rate", styleSheet="color: #888888; font-size: 12px;"))
        
        p_layout.addWidget(self.circular_progress)
        p_layout.addSpacing(20)
        p_layout.addLayout(pt)
        p_layout.addStretch()

        self.tags_list_widget = QListWidget()
        self.tags_list_widget.setSelectionMode(QAbstractItemView.SelectionMode.NoSelection)
        self.tags_list_widget.setStyleSheet("padding: 10px; border-top: 1px solid #222222;")
        
        l_layout.addWidget(info_area)
        l_layout.addWidget(prog_area)
        l_layout.addWidget(self.tags_list_widget)

        
        self.dark_card = QFrame()
        self.dark_card.setObjectName("darkCard")
        d_layout = QVBoxLayout(self.dark_card)
        d_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        
        self.status_title = QLabel("System Standby", styleSheet="color: white; font-size: 26px; font-weight: 600;")
        self.status_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.status_subtitle = QLabel("Mount unformatted NTAG to interface pad", styleSheet="color: #888888; font-size: 14px;")
        self.status_subtitle.setAlignment(Qt.AlignmentFlag.AlignCenter)

        cc = QHBoxLayout()
        self.circle_frame = QFrame()
        self.circle_frame.setObjectName("seqCircle")
        ci = QVBoxLayout(self.circle_frame)
        ci.setContentsMargins(0,0,0,0)
        self.seq_label = QLabel("--", objectName="seqNumber")
        self.seq_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        ci.addWidget(self.seq_label, alignment=Qt.AlignmentFlag.AlignCenter)
        cc.addStretch()
        cc.addWidget(self.circle_frame)
        cc.addStretch()

        self.progress_bar = QProgressBar()
        self.progress_bar.setFixedSize(300, 6)

        self.action_btn = QPushButton("Check Reader Module")
        self.action_btn.setFixedSize(300, 48)

        self.console_msg = QLabel("Ensure ACR122U is plugged in via USB...", styleSheet="color: #666666; font-family: monospace; font-size: 12px;")
        self.console_msg.setAlignment(Qt.AlignmentFlag.AlignCenter)

        d_layout.addStretch()
        d_layout.addWidget(self.status_title)
        d_layout.addWidget(self.status_subtitle)
        d_layout.addSpacing(25)
        d_layout.addLayout(cc)
        d_layout.addSpacing(30)
        d_layout.addWidget(self.progress_bar, alignment=Qt.AlignmentFlag.AlignCenter)
        d_layout.addSpacing(10)
        d_layout.addWidget(self.action_btn, alignment=Qt.AlignmentFlag.AlignCenter)
        d_layout.addSpacing(15)
        d_layout.addWidget(self.console_msg, alignment=Qt.AlignmentFlag.AlignCenter)
        d_layout.addStretch()

        workspace.addWidget(left_panel)
        workspace.addWidget(self.dark_card, stretch=1)

        layout.addLayout(header)
        layout.addSpacing(25)
        layout.addLayout(workspace)

    def setup_writer_ui(self):
        self.lbl_mode_info.setText(f"Mode: {self.pack_mode}")
        self.lbl_url_info.setText(f"Target: {self.base_url}")
        self.tags_list_widget.clear()
        
        printed = 0
        for i, tag in enumerate(self.tags_to_program):
            num = tag['sequence_num']
            item = QListWidgetItem()
            w = QWidget()
            w.setStyleSheet("background: transparent;")
            wl = QHBoxLayout(w)
            wl.setContentsMargins(15, 12, 15, 12)
            
            lbl = QLabel(f"Node {num:02d}", styleSheet="font-weight: 500; color: #FFFFFF; font-size: 13px; background: transparent;")
            stat = QLabel(alignment=Qt.AlignmentFlag.AlignCenter)
            stat.setFixedWidth(60)

            if tag.get("is_printed"):
                stat.setText("Done")
                stat.setStyleSheet("background-color: rgba(52, 211, 153, 0.1); color: #34D399; border-radius: 6px; padding: 3px 0; font-weight: 500; font-size: 11px;")
                printed += 1
            elif i == self.current_tag_index:
                stat.setText("Active")
                stat.setStyleSheet("background-color: rgba(171, 126, 233, 0.15); color: #ab7ee9; border-radius: 6px; padding: 3px 0; font-weight: 500; font-size: 11px;")
                w.setStyleSheet("background-color: #1F1F1F; border-radius: 8px;") 
            else:
                stat.setText("Queue")
                stat.setStyleSheet("color: #666666; font-size: 11px; font-weight: 400; background: transparent;")

            wl.addWidget(lbl)
            wl.addStretch()
            wl.addWidget(stat)
            
            w.setMinimumHeight(55)
            item.setSizeHint(w.sizeHint())
            self.tags_list_widget.addItem(item)
            self.tags_list_widget.setItemWidget(item, w)

        self.lbl_yield.setText(f"{printed} / {self.total_tags_in_pack} Units")
        pct = int((printed / self.total_tags_in_pack) * 100) if self.total_tags_in_pack > 0 else 0
        self.circular_progress.set_value(pct)

        if self.current_tag_index < len(self.tags_to_program) and self.current_tag_index != -1:
            num = self.tags_to_program[self.current_tag_index]['sequence_num']
            self.status_title.setText(f"Targeting Node {num}")
            self.seq_label.setText(f"{num:02d}")
            self.progress_bar.setValue(0)
            
            self.action_btn.disconnect()
            self.action_btn.clicked.connect(self.toggle_auto)
            
            if self.is_auto_running:
                self.action_btn.setText("Halt Process")
                self.action_btn.setStyleSheet("background-color: #EF4444; color: white;")
                self.circle_frame.setStyleSheet("border-color: #EF4444;")
                
                item_to_scroll = self.tags_list_widget.item(self.current_tag_index)
                self.tags_list_widget.scrollToItem(item_to_scroll, QAbstractItemView.ScrollHint.PositionAtCenter)
                self.process_tag()
            else:
                self.action_btn.setText("Initialize Sequence")
                self.action_btn.setStyleSheet("background-color: #ab7ee9; color: white;")
                self.circle_frame.setStyleSheet("border-color: #ab7ee9;")
                self.console_msg.setText("Ready to program NFC tag.")
                
                item_to_scroll = self.tags_list_widget.item(self.current_tag_index)
                self.tags_list_widget.scrollToItem(item_to_scroll, QAbstractItemView.ScrollHint.PositionAtCenter)
        else:
            self.is_auto_running = False
            self.status_title.setText("Complete")
            self.status_subtitle.setText("Package fully programmed.")
            self.seq_label.setText("✔")
            self.action_btn.setEnabled(False)
            self.circle_frame.setStyleSheet("border-color: #34D399;")
            self.console_msg.setText("")

    def toggle_auto(self):
        self.is_auto_running = not self.is_auto_running
        if self.is_auto_running:
            self.action_btn.setText("Halt Process")
            self.action_btn.setStyleSheet("background-color: #EF4444; color: white;")
            self.circle_frame.setStyleSheet("border-color: #EF4444;")
            self.process_tag()
        else:
            self.action_btn.setText("Halting...")
            self.action_btn.setEnabled(False)

    def process_tag(self):
        if not self.is_auto_running: return
        tag = self.tags_to_program[self.current_tag_index]
        self.progress_bar.setValue(0)
        self.nfc_worker = NfcWriterWorker(tag['print_url'])
        self.nfc_worker.log_signal.connect(self.console_msg.setText)
        self.nfc_worker.progress_signal.connect(self.progress_bar.setValue)
        self.nfc_worker.finished_signal.connect(self.on_nfc_done)
        self.nfc_worker.start()

    def on_nfc_done(self, success, msg):
        if not self.is_auto_running: return self.setup_writer_ui()
        if success:
            self.console_msg.setText("Validating checksum...")
            tag = self.tags_to_program[self.current_tag_index]
            self.sync_worker = ApiWorker(f"/admin/factory/tags/{tag['tag_id']}/mark-printed", "PATCH", token=self.access_token)
            self.sync_worker.finished.connect(self.on_sync_success)
            self.sync_worker.error.connect(self.on_sync_error)
            self.sync_worker.start()
        else:
            self.is_auto_running = False
            self.console_msg.setText(f"Error: {msg}")
            self.setup_writer_ui()

    def on_sync_success(self, data):
         self.progress_bar.setValue(100)
         self.tags_to_program[self.current_tag_index]["is_printed"] = True
         self.current_tag_index = next((i for i, t in enumerate(self.tags_to_program) if not t.get("is_printed")), -1)
         if not self.is_auto_running: return self.setup_writer_ui()
         QTimer.singleShot(900, self.setup_writer_ui)

    def on_sync_error(self, error):
         self.is_auto_running = False
         self.console_msg.setText(f"Sync Failure: {error}")
         self.setup_writer_ui()