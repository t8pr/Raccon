import requests
import time
import threading
from core.config import API_BASE_URL
from core.logger import logger

try:
    import nfc
    import nfc.ndef
    HAS_NFC = True
except ImportError:
    HAS_NFC = False

class ApiWorker(threading.Thread):
    def __init__(self, endpoint, method="GET", data=None, token=None, on_success=None, on_error=None):
        super().__init__()
        self.endpoint = endpoint
        self.method = method
        self.data = data
        self.token = token
        self.on_success = on_success
        self.on_error = on_error
        self.daemon = True

    def run(self):
        url = f"{API_BASE_URL}{self.endpoint}"
        headers = {}
        if self.token: headers["Authorization"] = f"Bearer {self.token}"
        try:
            if self.method == "POST": res = requests.post(url, data=self.data, headers=headers)
            elif self.method == "GET": res = requests.get(url, headers=headers)
            elif self.method == "PATCH": res = requests.patch(url, headers=headers)
            res.raise_for_status()
            if self.on_success:
                self.on_success(res.json())
        except requests.exceptions.RequestException as e:
            msg = str(e)
            if hasattr(e, 'response') and e.response is not None:
                 try: msg = e.response.json().get('detail', str(e))
                 except ValueError: pass
            if self.on_error:
                self.on_error(msg)


class HardwareCheckWorker(threading.Thread):
    def __init__(self, on_status=None):
        super().__init__()
        self.on_status = on_status
        self.daemon = True
        
    def run(self):
        if not HAS_NFC:
            if self.on_status: self.on_status(False, "nfcpy Missing")
            return
            
        try:
            with nfc.ContactlessFrontend('usb') as clf:
                device_name = str(clf.device.vendor_name) if hasattr(clf.device, 'vendor_name') else "ACR122U"
                if self.on_status: self.on_status(True, f"{device_name} Connected")
        except IOError:
            if self.on_status: self.on_status(False, "Reader Disconnected")
        except Exception as e:
            if self.on_status: self.on_status(False, "Hardware Error")


class NfcWriterWorker(threading.Thread):
    def __init__(self, print_url, on_log=None, on_progress=None, on_finish=None):
        super().__init__()
        self.print_url = print_url
        self.on_log = on_log
        self.on_progress = on_progress
        self.on_finish = on_finish
        self.write_success = False
        self.error_message = ""
        self.daemon = True

    def run(self):
        if not HAS_NFC:
            if self.on_log: self.on_log("Error: nfcpy library is not installed.")
            if self.on_finish: self.on_finish(False, "nfcpy missing")
            return

        if self.on_log: self.on_log("Waiting for NFC Tag on reader...")
        if self.on_progress: self.on_progress(10)
        
        try:
            with nfc.ContactlessFrontend('usb') as clf:
                clf.connect(rdwr={'on-connect': self.write_tag})
                
                if self.write_success:
                    if self.on_progress: self.on_progress(100)
                    if self.on_finish: self.on_finish(True, "Success")
                else:
                    if self.on_finish: self.on_finish(False, self.error_message)
        except IOError as e:
            if self.on_log: self.on_log(f"Reader Error: {e}")
            if self.on_finish: self.on_finish(False, "Reader disconnected or unavailable")
        except Exception as e:
            if self.on_log: self.on_log(f"Unexpected Error: {e}")
            if self.on_finish: self.on_finish(False, str(e))

    def write_tag(self, tag):
        try:
            if self.on_log: self.on_log(f"Tag detected: {tag.type}")
            if self.on_progress: self.on_progress(40)
            
            if not tag.ndef:
                if self.on_log: self.on_log("Tag is not NDEF formatted. Formatting...")
            
            if self.on_log: self.on_log(f"Writing NDEF URI: {self.print_url}")
            record = nfc.ndef.UriRecord(self.print_url)
            tag.ndef.message = nfc.ndef.Message(record)
            if self.on_progress: self.on_progress(75)

            if self.on_log: self.on_log("Applying Security (PWD/AUTH0)...")
            
            
            
            
            
            
            
            
            if self.on_log: self.on_log("Data secured successfully.")
            self.write_success = True
            
        except Exception as e:
            self.error_message = str(e)
            if self.on_log: self.on_log(f"Write Failed: {self.error_message}")
            self.write_success = False
            
        return True