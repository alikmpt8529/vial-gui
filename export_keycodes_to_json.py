
import sys
import os
import json

# Add src/main/python to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "src/main/python")))

from keycodes.keycodes import KEYCODES, RAWCODES_MAP, recreate_keycodes

def export_keycodes():
    recreate_keycodes() # Ensure maps are populated
    
    mapping = {}
    
    # Export integer to label mapping
    for code, kc in RAWCODES_MAP.items():
        # code is int
        obj = {
            "label": kc.label,
            "printable": kc.printable,
            "tooltip": kc.tooltip
        }
        mapping[code] = obj
        
    output_path = os.path.join(os.path.dirname(__file__), "vial-web-pdf/src/data/keycodes.json")
    print(f"Exporting {len(mapping)} keycodes to {output_path}")
    
    with open(output_path, "w") as f:
        json.dump(mapping, f, indent=2)

if __name__ == "__main__":
    export_keycodes()
