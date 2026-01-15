
export const CMD_VIA_GET_PROTOCOL_VERSION = 0x01;
export const CMD_VIA_GET_KEYBOARD_VALUE = 0x02;
export const CMD_VIA_SET_KEYBOARD_VALUE = 0x03;
export const CMD_VIA_GET_KEYCODE = 0x04;
export const CMD_VIA_SET_KEYCODE = 0x05;
export const CMD_VIA_LIGHTING_SET_VALUE = 0x07;
export const CMD_VIA_LIGHTING_GET_VALUE = 0x08;
export const CMD_VIA_LIGHTING_SAVE = 0x09;
export const CMD_VIA_MACRO_GET_COUNT = 0x0C;
export const CMD_VIA_MACRO_GET_BUFFER_SIZE = 0x0D;
export const CMD_VIA_MACRO_GET_BUFFER = 0x0E;
export const CMD_VIA_MACRO_SET_BUFFER = 0x0F;
export const CMD_VIA_GET_LAYER_COUNT = 0x11;
export const CMD_VIA_KEYMAP_GET_BUFFER = 0x12;
export const CMD_VIA_VIAL_PREFIX = 0xFE;
export const VIA_LAYOUT_OPTIONS = 0x02;

export const CMD_VIAL_GET_KEYBOARD_ID = 0x00;
export const CMD_VIAL_GET_SIZE = 0x01;
export const CMD_VIAL_GET_DEFINITION = 0x02;
export const CMD_VIAL_GET_ENCODER = 0x03;
export const CMD_VIAL_SET_ENCODER = 0x04;
export const CMD_VIAL_GET_UNLOCK_STATUS = 0x05;
export const CMD_VIAL_UNLOCK_START = 0x06;
export const CMD_VIAL_UNLOCK_POLL = 0x07;
export const CMD_VIAL_LOCK = 0x08;
export const CMD_VIAL_QMK_SETTINGS_QUERY = 0x09;
export const CMD_VIAL_QMK_SETTINGS_GET = 0x0A;
export const CMD_VIAL_QMK_SETTINGS_SET = 0x0B;
export const CMD_VIAL_QMK_SETTINGS_RESET = 0x0C;
export const CMD_VIAL_DYNAMIC_ENTRY_OP = 0x0D;

export const MSG_LEN = 32;
export const BUFFER_FETCH_CHUNK = 28;
