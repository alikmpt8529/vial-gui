
import sys
import os
import json
from PyQt5.QtWidgets import QApplication

# Mock fbs_runtime
from unittest.mock import MagicMock
sys.modules["fbs_runtime"] = MagicMock()
sys.modules["fbs_runtime.application_context"] = MagicMock()
sys.modules["fbs_runtime.application_context.PyQt5"] = MagicMock()

class MockApplicationContext:
    def __init__(self):
        self.app = QApplication(sys.argv)
        self.build_settings = {
            "app_name": "Vial",
            "author": "xyz",
            "main_module": "src/main/python/main.py",
            "version": "0.7.5"
        }
        
    def get_resource(self, name):
        # Handle resource lookup
        base_path = os.path.dirname(os.path.abspath(__file__))
        
        # Check specific locations
        candidates = [
            os.path.join(base_path, "src", "main", "resources", name),
            os.path.join(base_path, "src", "main", "resources", "base", name),
            os.path.join(base_path, "src", "build", "settings", name),
             os.path.join(base_path, "src", "main", "python", name) # Sometimes resources are alongside code?
        ]
        
        for path in candidates:
            if os.path.exists(path):
                return path
        
        return name

# Inject the mock class
sys.modules["fbs_runtime.application_context.PyQt5"].ApplicationContext = MockApplicationContext

# Add src/main/python to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src/main/python")))

from main_window import MainWindow
from util import init_logger

if __name__ == "__main__":
    appctxt = MockApplicationContext()
    init_logger()
    window = MainWindow(appctxt)
    window.show()
    sys.exit(appctxt.app.exec_())
