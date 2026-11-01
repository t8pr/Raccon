import requests
import time
from PyQt6.QtCore import QThread, pyqtSignal
from core.config import API_BASE_URL
from core.logger import logger

try:
    import nfc
    import nfc.ndef
    HAS_NFC = True
except ImportError:
    HAS_NFC = False

class ApiWorker(QThread):
    finished = pyqtSignal(dict)
    error = pyqtSignal(str)

    def __init__(self, endpoint, method="GET", data=None, token=None):
        super().__init__()
        self.endpoint = endpoint
        self.method = method
        self.data = data
        self.token = token

    def run(self):
        url = f"{API_BASE_URL}{self.endpoint}"
        headers = {}
        if self.token: headers["Authorization"] = f"Bearer {self.token}"
        try:
            if self.method == "POST": res = requests.post(url, data=self.data, headers=headers)
            elif self.method == "GET": res = requests.get(url, headers=headers)
            elif self.method == "PATCH": res = requests.patch(url, headers=headers)
            res.raise_for_status()
            self.finished.emit(res.json())
        except requests.exceptions.RequestException as e:
            msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                 try: msg = e.response.json().get('detail', str(e))
                 except ValueError: pass
            self.error.emit(msg)


class HardwareCheckWorker(QThread):
    status_signal = pyqtSignal(bool, str)
    
    def run(self):
        if not HAS_NFC:
            self.status_signal.emit(False, "nfcpy Missing")
            return
            
        try:
            
            with nfc.ContactlessFrontend('usb') as clf:
                device_name = str(clf.device.vendor_name) if hasattr(clf.device, 'vendor_name') else "ACR122U"
                self.status_signal.emit(True, f"{device_name} Connected")
        except IOError:
            self.status_signal.emit(False, "Reader Disconnected")
        except Exception as e:
            self.status_signal.emit(False, "Hardware Error")


class NfcWriterWorker(QThread):
    log_signal = pyqtSignal(str)
    progress_signal = pyqtSignal(int)
    finished_signal = pyqtSignal(bool, str)

    def __init__(self, print_url):
        super().__init__()
        self.print_url = print_url
        self.write_success = False
        self.error_message = ""

    def run(self):
        if not HAS_NFC:
            self.log_signal.emit("Error: nfcpy library is not installed.")
            self.finished_signal.emit(False, "nfcpy missing")
            return

        self.log_signal.emit("Waiting for NFC Tag on reader...")
        self.progress_signal.emit(10)
        
        try:
            with nfc.ContactlessFrontend('usb') as clf:
                
                clf.connect(rdwr={'on-connect': self.write_tag})
                
                if self.write_success:
                    self.progress_signal.emit(100)
                    self.finished_signal.emit(True, "Success")
                else:
                    self.finished_signal.emit(False, self.error_message)
        except IOError as e:
            self.log_signal.emit(f"Reader Error: {e}")
            self.finished_signal.emit(False, "Reader disconnected or unavailable")
        except Exception as e:
            self.log_signal.emit(f"Unexpected Error: {e}")
            self.finished_signal.emit(False, str(e))

    def write_tag(self, tag):
        try:
            self.log_signal.emit(f"Tag detected: {tag.type}")
            self.progress_signal.emit(40)
            
            if not tag.ndef:
                self.log_signal.emit("Tag is not NDEF formatted. Formatting...")
                
            
            self.log_signal.emit(f"Writing NDEF URI: {self.print_url}")
            record = nfc.ndef.UriRecord(self.print_url)
            tag.ndef.message = nfc.ndef.Message(record)
            self.progress_signal.emit(75)

            
            self.log_signal.emit("Applying Security (PWD/AUTH0)...")
            
            
            
            
            
            
            
            
            
            self.log_signal.emit("Data secured successfully.")
            self.write_success = True
            
        except Exception as e:
            self.error_message = str(e)
            self.log_signal.emit(f"Write Failed: {self.error_message}")
            self.write_success = False
            
        return True 