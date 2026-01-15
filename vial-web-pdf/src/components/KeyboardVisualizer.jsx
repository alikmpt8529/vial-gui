
import React, { useMemo, useEffect, useState } from 'react';
import keycodesMap from '../data/keycodes.json';
import { getKeyLabel } from '../utils/kle';
import { manualParseKLE } from '../utils/manual_kle';
import { calculateBoundingBox } from '../utils/geometry';

const KEY_SIZE = 40; // px

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

export const KeyboardVisualizer = ({ definition, keymap, layer = 0 }) => {
    const [parsedKeys, setParsedKeys] = useState([]);

    useEffect(() => {
        if (!definition) return;
        const keys = manualParseKLE(definition.layouts.keymap);

        // Filter keys based on properties and keymap data
        const rows = definition.matrix.rows;
        const cols = definition.matrix.cols;

        const visibleKeys = keymap
            ? keys.filter(k => isKeyVisible(k, keymap, rows, cols))
            : keys.filter(k => !k.decal && !k.ghost);

        setParsedKeys(visibleKeys);
    }, [definition, keymap ? keymap.length : 0]);

    const { width, height, min_x, min_y } = useMemo(() => {
        const bounds = calculateBoundingBox(parsedKeys, KEY_SIZE);
        return {
            width: bounds.width + 40,
            height: bounds.height + 40,
            min_x: bounds.min_x - 20,
            min_y: bounds.min_y - 20
        };
    }, [parsedKeys]);

    return (
        <div className="keyboard-visualizer" style={{
            position: 'relative',
            width: Math.ceil(width) + 'px',
            height: Math.ceil(height) + 'px',
            margin: '20px auto',
            border: '1px solid #ccc',
            backgroundColor: '#f6f5f4',
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            {parsedKeys.map((key, idx) => {
                const label = getKeyLabel(key, keymap, definition.layers || 4, definition.matrix.rows, definition.matrix.cols, layer, keycodesMap);

                // User-specified hard filter for ghost keys
                const IGNORED_INDICES = [13, 14, 15, 16, 18, 19, 33, 34, 36, 37];
                if (IGNORED_INDICES.includes(idx)) return null;

                // Determine raw label (fallback). 
                const isMatrixLabel = /^[\d,\s\n]+$/.test(key.label);
                const rawLabel = isMatrixLabel ? "" : key.label;

                let displayLabel = label || rawLabel;

                // Treat crude hex codes as empty
                if (displayLabel && /^0x[0-9A-Fa-f]+$/.test(displayLabel)) {
                    displayLabel = "";
                }

                return (
                    <div key={idx} style={{
                        position: 'absolute',
                        left: (key.x * KEY_SIZE - min_x) + 'px',
                        top: (key.y * KEY_SIZE - min_y) + 'px',
                        width: (key.w * KEY_SIZE - 2) + 'px',
                        height: (key.h * KEY_SIZE - 2) + 'px',
                        backgroundColor: '#fff',
                        border: '1px solid #dcdcdc',
                        borderRadius: '4px',
                        transform: `rotate(${key.rotation_angle || 0}deg)`,
                        transformOrigin: `${(key.rotation_x - key.x) * KEY_SIZE}px ${(key.rotation_y - key.y) * KEY_SIZE}px`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontFamily: 'sans-serif',
                        boxShadow: '0px 1px 2px rgba(0,0,0,0.1)',
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        color: '#333'
                    }}>
                        {displayLabel}
                    </div>
                );
            })}
        </div>
    );
};
