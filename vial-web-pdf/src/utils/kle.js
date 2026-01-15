
import { Serial } from '@ijprest/kle-serial';

export const parseLayout = (keymap_json) => {
    if (!keymap_json) return [];
    try {
        const kb = Serial.deserialize(keymap_json);
        const keys = [];

        kb.keys.forEach(key => {
            let row = null;
            let col = null;

            // Parse labels for Matrix position
            // Label 0: "row,col"
            if (key.labels[0] && key.labels[0].includes(',')) {
                const parts = key.labels[0].split(',');
                row = parseInt(parts[0], 10);
                col = parseInt(parts[1], 10);
            }

            keys.push({
                x: key.x,
                y: key.y,
                w: key.width,
                h: key.height,
                w2: key.width2,
                h2: key.height2,
                x2: key.x2,
                y2: key.y2,
                rotation_angle: key.rotation_angle,
                rotation_x: key.rotation_x,
                rotation_y: key.rotation_y,
                row,
                col,
                label: key.labels[0], // matrix pos
                text: key.labels[key.labels.length - 1] // usually legend? or label 0
            });
        });

        return keys;
    } catch (e) {
        console.error("KLE Parse Error", e);
        return [];
    }
};

export const getKeyLabel = (key, keymap, layers, rows, cols, activeLayer, keycodesMap) => {
    if (key.row === null || key.col === null) return "";
    if (!keymap) return "";

    // keymap is Uint8Array (Big Endian uint16s).
    // layer offset
    const layer_size = rows * cols * 2;
    // activeLayer should be bounded
    const l = Math.max(0, Math.min(layers - 1, activeLayer));
    const offset = (l * layer_size) + (key.row * cols * 2) + (key.col * 2);

    if (offset + 1 >= keymap.length) return "";

    // Big Endian
    const code = (keymap[offset] << 8) | keymap[offset + 1];

    // --- Shifted Character Map for Rich Labeling ---
    const SHIFTED_MAP = {
        '1': '!', '2': '@', '3': '#', '4': '$', '5': '%', '6': '^', '7': '&', '8': '*', '9': '(', '0': ')',
        '-': '_', '=': '+', '[': '{', ']': '}', '\\': '|', ';': ':', "'": '"', ',': '<', '.': '>', '/': '?',
        '`': '~'
    };

    // Helper to get base label
    const getLabel = (code) => {
        if (keycodesMap[code]) {
            let lbl = keycodesMap[code].label;
            // If simple alphanumeric/symbol, maybe add shifted?
            if (lbl.length === 1 && SHIFTED_MAP[lbl]) {
                return `${SHIFTED_MAP[lbl]}\n${lbl}`;
            }
            return lbl;
        }
        return null;
    };

    // Helper to decode modifiers (for MT)
    const getModName = (mod) => {
        // QMK Mod Bitmask: 
        if (mod & 2) return "LSft";
        if (mod & 32) return "RSft";
        if (mod & 1) return "LCtrl";
        if (mod & 16) return "RCtrl";
        if (mod & 4) return "LAlt";
        if (mod & 64) return "RAlt";
        if (mod & 8) return "LGui";
        if (mod & 128) return "RGui";
        return "Mod";
    };

    // --- User-Specified & Extended QMK Ranges ---

    // TO(layer) - User explicitly identified 0x5202-0x5205 as TO
    // 0x5200 is often DF (Default Layer) or MO, but user wants TO.
    // Range 0x5200 - 0x521F
    if (code >= 0x5200 && code <= 0x521F) {
        return `TO(${code & 0x1F})`;
    }

    // Custom RGB Mapping for 0x78xx (User Specific)
    // Detailed mappings based on user reports of "Bad Label" -> "Correct Label"
    // RGui 6 (0x7823) -> Hue +
    // RGui 7 (0x7824) -> Hue -
    // RGui 8 (0x7825) -> Sat +
    // RGui 9 (0x7826) -> Sat -
    // RGui 0 (0x7827) -> Bright +
    // RGui Enter (0x7828) -> Bright -
    // RGui # 3 (0x7820 ?? 3 is 0x20) -> RGB Toggle (Confirmed prev)
    // RGui Mode+ (0x7821 identified prev) -> Mode + 
    const CUSTOM_RGB_MAP = {
        0x7849: "RGB Toggle",
        0x7820: "RGB Toggle",
        0x7821: "RGB Mode +",
        0x784A: "RGB Mode +",

        // New mappings (derived from RGui 6,7,8,9,0,Enter)
        0x7823: "Hue +",
        0x7824: "Hue -",
        0x7825: "Sat +",
        0x7826: "Sat -",
        0x7827: "Bright +",
        0x7828: "Bright -",

        // Keep old guesses just in case, but they are likely unused
        0x782B: "Hue +",
        0x782C: "Hue -",
        0x782D: "Sat +",
        0x7802: "Sat -",
        0x7843: "Bright +",
        0x7844: "Bright -"
    };
    if (CUSTOM_RGB_MAP[code]) {
        return CUSTOM_RGB_MAP[code];
    }

    // Macros - User identified 0x7700+ as the missing keys
    // Mapping 0x7700 -> M0
    if (code >= 0x7700 && code <= 0x771F) {
        return `M${code - 0x7700}`;
    }

    // Extended Mod-Taps (0x6000 - 0x7FFF)
    // Based on keycodes_v5.py patterns
    // 0x61xx: LCTL_T
    // 0x62xx: LSFT_T
    // 0x64xx: LALT_T
    // 0x68xx: LGUI_T
    // 0x71xx: RCTL_T
    // 0x72xx: RSFT_T
    // 0x74xx: RALT_T
    // 0x78xx: RGUI_T

    let modName = null;
    if ((code & 0xFF00) === 0x6100) modName = "LCtrl";
    else if ((code & 0xFF00) === 0x6200) modName = "LSft";
    else if ((code & 0xFF00) === 0x6400) modName = "LAlt";
    else if ((code & 0xFF00) === 0x6600) modName = "LSA"; // LShift+LAlt?
    else if ((code & 0xFF00) === 0x6800) modName = "LGui";
    else if ((code & 0xFF00) === 0x7100) modName = "RCtrl";
    else if ((code & 0xFF00) === 0x7200) modName = "RSft";
    else if ((code & 0xFF00) === 0x7400) modName = "RAlt";
    else if ((code & 0xFF00) === 0x7800) modName = "RGui";

    if (modName) {
        const base = code & 0xFF;
        const baseLabel = getLabel(base); // Use helper for rich labels (e.g. ! 1)
        const displayBase = baseLabel || (keycodesMap[base] ? keycodesMap[base].label : "");

        // Split complex base labels (like "! 1") for stack
        if (displayBase && displayBase.includes('\n')) {
            return `${modName}\n${displayBase}`;
        }
        return `${modName}\n${displayBase}`;
    }

    // Direct match (needs to be checked AFTER override ranges if they overlap, but usually safe here)
    if (keycodesMap[code]) {
        let lbl = keycodesMap[code].label;
        // Special handling for number row to match "Leaf two images" style (! 1)
        if (lbl.length === 1 && SHIFTED_MAP[lbl]) {
            return `${SHIFTED_MAP[lbl]}\n${lbl}`;
        }
        return lbl;
    }

    // Standard QMK MT encoding: 0x2000 - 0x3FFF
    if (code >= 0x2000 && code <= 0x3FFF) {
        const base = code & 0xFF;
        const mod = (code >> 8) & 0x1F;
        const mName = getModName(mod);
        const baseLabel = getLabel(base);
        // Correct double labeling for MT
        if (baseLabel && baseLabel.includes('\n')) {
            return `${mName}\n${baseLabel}`;
        }
        return `${mName}\n${baseLabel || ""}`;
    }

    // Tap Dance: 0x5700
    if ((code & 0xFF00) === 0x5700) return `TD(${code & 0xFF})`;

    // Layer keys standard ranges (if not caught by above 0x5200 override)
    // 0x5220 - 0x523F is also TO usually, but handled above now
    if (code >= 0x5240 && code <= 0x525F) return `TG(${code & 0x1F})`;
    if (code >= 0x5260 && code <= 0x527F) return `TT(${code & 0x1F})`;
    if (code >= 0x5280 && code <= 0x529F) return `OSL(${code & 0x1F})`;

    // Layer Tap: 0x4000 - 0x4FFF
    if (code >= 0x4000 && code <= 0x4FFF) {
        const layer = (code >> 8) & 0xF;
        const base = code & 0xFF;
        const baseLabel = getLabel(base) || "";
        return `LT(${layer})\n${baseLabel.replace('\n', '')}`; // simplify?
    }

    // RGB with Custom Labels (Standard QMK/VIA codes)
    if (code >= 0x5D00 && code <= 0x5D29) {
        const rgbLabels = [
            "RGB Toggle", "RGB\nMode +", "RGB\nMode -", "Hue +", "Hue -",
            "Sat +", "Sat -", "Bright +", "Bright -", "RGB Spi+", "RGB Spi-",
            "RGB M_P", "RGB M_B", "RGB M_R", "RGB M_SW", "RGB M_SN",
            "RGB M_K", "RGB M_X", "RGB M_G", "RGB M_T"
        ];
        const idx = code - 0x5D00;
        if (idx < rgbLabels.length) return rgbLabels[idx];
        return "RGB";
    }

    // Old Macro Range (User previously tested, maybe still relevant?)
    if (code >= 0x5F12 && code <= 0x5F21) {
        return `M${code - 0x5F12}`;
    }
    if (code === 0x5F10) return "FN_MO13";
    if (code === 0x5F11) return "FN_MO23";

    // USER Keys: 0x5F80+
    if (code >= 0x5F80 && code <= 0x5FBF) {
        return `USER${code - 0x5F80}`;
    }

    // QK_BOOT / RESET: 0x5C00
    if (code === 0x5C00) return "Reset";

    // One Shot Mod
    if ((code & 0xFFF0) === 0x5500) return "OSM";

    // Fallback
    return "0x" + code.toString(16).toUpperCase();
};
