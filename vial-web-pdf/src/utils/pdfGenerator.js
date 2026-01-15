
import { jsPDF } from 'jspdf';
import { getKeyLabel } from './kle';
import { manualParseKLE } from './manual_kle';
import { calculateBoundingBox, rotatePoint } from './geometry';
import keycodesMap from '../data/keycodes.json';

const KEY_UNIT_SIZE = 19.05; // mm standard key spacing

const isKeyVisible = (key, keymap, rows, cols) => {
    if (key.decal || key.ghost) return false;

    // Check if keycode at Layer 0 is KC_NO (0)
    if (!keymap || key.row === undefined || key.col === undefined) return true;

    const layer = 0;
    const layer_size = rows * cols * 2;
    const offset = (layer * layer_size) + (key.row * cols * 2) + (key.col * 2);

    if (offset + 1 >= keymap.length) return false;

    const code = (keymap[offset] << 8) | keymap[offset + 1];
    return code !== 0;
};


export const generatePDF = async (definition, keymap_buf, layers, rows, cols, filename = "layout.pdf") => {
    const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
    });

    const allKeys = manualParseKLE(definition.layouts.keymap);
    // Filter out decal/ghost AND KC_NO keys
    const parsedKeys = allKeys.filter(k => isKeyVisible(k, keymap_buf, rows, cols));

    // User-specified hard filter for ghost keys (indices to ignore)
    // Matches the visualizer filter
    const IGNORED_INDICES = [13, 14, 15, 16, 18, 19, 33, 34, 36, 37];

    // We must filter by index relative to the *parsedKeys* list or original? 
    // Wait, the indices provided by the user (e.g. 47) were from the visualizer's list, which was ALREADY filtered by isKeyVisible.
    // However, in Visualizer logic, I applied IGNORED_INDICES *inside* the map loop over parsedKeys.
    // So IGNORED_INDICES refer to the index in the 'parsedKeys' array.

    const finalKeys = parsedKeys.filter((_, idx) => !IGNORED_INDICES.includes(idx));

    const bounds = calculateBoundingBox(finalKeys, KEY_UNIT_SIZE);

    const page_width = 297;
    const page_height = 210;
    const margin = 15;

    // Calculate scale to fit page within margins
    const available_w = page_width - margin * 2;
    const available_h = page_height - margin * 2;

    const scale_x = available_w / bounds.width;
    const scale_y = available_h / bounds.height;
    const scale = Math.min(scale_x, scale_y) * 0.95;

    const start_x = (page_width - bounds.width * scale) / 2 - (bounds.min_x * scale);
    const start_y = (page_height - bounds.height * scale) / 2 - (bounds.min_y * scale);

    for (let l = 0; l < layers; l++) {
        if (l > 0) doc.addPage();

        doc.setFontSize(14);
        doc.text(`Layer ${l}`, page_width / 2, 10, { align: 'center' });

        doc.setLineWidth(0.15);
        const keyFontSize = 8 * scale;
        doc.setFontSize(Math.max(6, keyFontSize));

        finalKeys.forEach(key => {
            let label = getKeyLabel(key, keymap_buf, layers, rows, cols, l, keycodesMap);

            // Logic parity with Visualizer:
            const isMatrixLabel = /^[\d,\s\n]+$/.test(key.label);
            const rawLabel = isMatrixLabel ? "" : key.label;

            let displayLabel = label || rawLabel;

            // Treat crude hex codes as empty
            if (displayLabel && /^0x[0-9A-Fa-f]+$/.test(displayLabel)) {
                displayLabel = "";
            }

            const kx = key.x * KEY_UNIT_SIZE;
            const ky = key.y * KEY_UNIT_SIZE;
            const kw = key.w * KEY_UNIT_SIZE;
            const kh = key.h * KEY_UNIT_SIZE;

            let corners;
            if (key.rotation_angle) {
                const ox = key.rotation_x * KEY_UNIT_SIZE;
                const oy = key.rotation_y * KEY_UNIT_SIZE;
                corners = [
                    { x: kx, y: ky },
                    { x: kx + kw, y: ky },
                    { x: kx + kw, y: ky + kh },
                    { x: kx, y: ky + kh }
                ].map(p => rotatePoint(p.x, p.y, ox, oy, key.rotation_angle));
            } else {
                corners = [
                    { x: kx, y: ky },
                    { x: kx + kw, y: ky },
                    { x: kx + kw, y: ky + kh },
                    { x: kx, y: ky + kh }
                ];
            }

            const pts = corners.map(p => ({
                x: start_x + p.x * scale,
                y: start_y + p.y * scale
            }));

            doc.lines([
                [pts[1].x - pts[0].x, pts[1].y - pts[0].y],
                [pts[2].x - pts[1].x, pts[2].y - pts[1].y],
                [pts[3].x - pts[2].x, pts[3].y - pts[2].y],
                [pts[0].x - pts[3].x, pts[0].y - pts[3].y]
            ], pts[0].x, pts[0].y);

            const centerX = (pts[0].x + pts[2].x) / 2;
            const centerY = (pts[0].y + pts[2].y) / 2;

            const lines = displayLabel.split('\n');
            const lineHeight = doc.getFontSize() * 0.3527 * 1.2;
            const totalTextH = lines.length * lineHeight;
            const startTextY = centerY - (totalTextH / 2) + (lineHeight * 0.7);

            lines.forEach((line, idx) => {
                const rotation = key.rotation_angle ? -key.rotation_angle : 0;
                doc.text(line, centerX, startTextY + (idx * lineHeight) - (lineHeight / 2), {
                    align: 'center',
                    angle: rotation
                });
            });
        });
    }

    doc.save(filename);
};
