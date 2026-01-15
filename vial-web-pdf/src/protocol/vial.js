
import {
    CMD_VIA_GET_PROTOCOL_VERSION,
    CMD_VIA_GET_LAYER_COUNT,
    CMD_VIA_KEYMAP_GET_BUFFER,
    CMD_VIA_VIAL_PREFIX,
    CMD_VIAL_GET_KEYBOARD_ID,
    CMD_VIAL_GET_SIZE,
    CMD_VIAL_GET_DEFINITION,
    MSG_LEN,
    BUFFER_FETCH_CHUNK,
    VIA_LAYOUT_OPTIONS,
    CMD_VIA_GET_KEYBOARD_VALUE
} from './constants';
import { XzReadableStream } from 'xz-decompress';

export class VialKeyboard {
    constructor(device) {
        this.device = device;
        this.via_protocol = 0;
        this.vial_protocol = 0;
        this.keyboard_id = 0;
        this.definition = null;
        this.layout = {};  // layers -> rows -> cols -> keycode
        this.layers = 0;
        this.rows = 0;
        this.cols = 0;
    }

    async connect() {
        if (!this.device.opened) {
            await this.device.open();
        }
        console.log("Device opened:", this.device.productName);

        // Listen for input reports? 
        // We will use a request-response helper.
    }

    async send(data) {
        // Pad data to MSG_LEN (32 bytes)
        const padded = new Uint8Array(MSG_LEN);
        padded.set(data);
        // HID report ID 0
        await this.device.sendReport(0, padded);
    }

    async request(data, retries = 5) {
        return new Promise(async (resolve, reject) => {
            const handleInput = (e) => {
                // Check if this response matches?
                // For simplicity, assume strict sync request/response
                this.device.removeEventListener('inputreport', handleInput);
                resolve(new Uint8Array(e.data.buffer));
            };

            this.device.addEventListener('inputreport', handleInput);

            try {
                await this.send(data);
            } catch (err) {
                this.device.removeEventListener('inputreport', handleInput);
                reject(err);
            }

            // Timeout?
            setTimeout(() => {
                this.device.removeEventListener('inputreport', handleInput);
                reject(new Error("Timeout waiting for response"));
            }, 1000);
        });
    }

    async reload_via_protocol() {
        const data = await this.request(new Uint8Array([CMD_VIA_GET_PROTOCOL_VERSION]));
        const view = new DataView(data.buffer);
        this.via_protocol = view.getUint16(1, false); // Big Endian
        console.log("VIA Protocol:", this.via_protocol);
    }

    async load_definition() {
        await this.reload_via_protocol();

        // Get ID and Vial Protocol
        const data = await this.request(new Uint8Array([CMD_VIA_VIAL_PREFIX, CMD_VIAL_GET_KEYBOARD_ID]));
        const view = new DataView(data.buffer);
        this.vial_protocol = view.getUint32(0, true);
        this.keyboard_id = view.getBigUint64(4, true);
        console.log("Vial Protocol:", this.vial_protocol, "ID:", this.keyboard_id);

        // Get Size
        const sdata = await this.request(new Uint8Array([CMD_VIA_VIAL_PREFIX, CMD_VIAL_GET_SIZE]));
        const size = new DataView(sdata.buffer).getUint32(0, true);
        console.log("Definition Size:", size);

        // Fetch Definition
        let payload = new Uint8Array(size);
        let received = 0;
        let block = 0;

        while (received < size) {
            const cmd = new Uint8Array(6);
            cmd[0] = CMD_VIA_VIAL_PREFIX;
            cmd[1] = CMD_VIAL_GET_DEFINITION;
            new DataView(cmd.buffer).setUint32(2, block, true);

            const rdata = await this.request(cmd);

            const chunk_size = Math.min(MSG_LEN, size - received);
            payload.set(rdata.slice(0, chunk_size), received);

            received += chunk_size;
            block++;
        }

        // Check header (XZ magic bytes: FD 37 7A 58 5A 00)
        console.log("Payload Header:", payload.slice(0, 10));

        // Decompress using xz-decompress
        try {
            // Create a ReadableStream from the Uint8Array
            const inputStream = new Response(payload).body;
            const decompressed = new XzReadableStream(inputStream);
            const reader = decompressed.getReader();
            let result = new Uint8Array(0);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const newResult = new Uint8Array(result.length + value.length);
                newResult.set(result);
                newResult.set(value, result.length);
                result = newResult;
            }

            const json_str = new TextDecoder().decode(result);
            this.definition = JSON.parse(json_str);
            this.rows = this.definition.matrix.rows;
            this.cols = this.definition.matrix.cols;
            return this.definition;

        } catch (e) {
            console.error("XZ Decompression Error:", e);
            throw e;
        }
    }

    async load_keymap() {
        // Get Layers
        const ldata = await this.request(new Uint8Array([CMD_VIA_GET_LAYER_COUNT]));
        this.layers = ldata[1];
        console.log("Layers:", this.layers);

        // keymap size = layers * rows * cols * 2 (2 bytes per keycode)
        const size = this.layers * this.rows * this.cols * 2;
        const keymap_buf = new Uint8Array(size);

        for (let x = 0; x < size; x += BUFFER_FETCH_CHUNK) {
            const sz = Math.min(size - x, BUFFER_FETCH_CHUNK);
            const cmd = new Uint8Array(4);
            cmd[0] = CMD_VIA_KEYMAP_GET_BUFFER;
            const view = new DataView(cmd.buffer);
            view.setUint16(1, x, false); // Big Endian offset
            cmd[3] = sz;

            const rdata = await this.request(cmd);
            keymap_buf.set(rdata.slice(4, 4 + sz), x);
        }

        return keymap_buf;
    }

    getKeycode(keymap_buf, layer, row, col) {
        if (row >= this.rows || col >= this.cols) return 0;
        const offset = layer * this.rows * this.cols * 2 + row * this.cols * 2 + col * 2;
        const view = new DataView(keymap_buf.buffer);
        return view.getUint16(offset, false);
    }
}
