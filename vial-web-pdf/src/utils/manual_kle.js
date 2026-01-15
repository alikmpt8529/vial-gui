
export const manualParseKLE = (rows) => {
    const keys = [];
    let current = {
        x: 0, y: 0,
        w: 1, h: 1,
        w2: 1, h2: 1,
        x2: 0, y2: 0,
        rotation_angle: 0,
        rotation_x: 0,
        rotation_y: 0,
        labels: [],
        textColor: [],
        textSize: [],
        default: { textColor: "#000000", textSize: 3 },
        decal: false,
        ghost: false,
        stepped: false,
        nub: false,
        profile: "",
        sm: "", sb: "", st: ""
    };

    // Cluster state to track rotation origin
    let cluster = { x: 0, y: 0 };

    // Helper to copy current state
    const copyCurrent = () => JSON.parse(JSON.stringify(current));

    // Flatten rows
    if (!Array.isArray(rows)) return [];

    rows.forEach((row, r) => {
        if (!Array.isArray(row)) return;

        row.forEach((item, k) => {
            if (typeof item === 'string') {
                const newKey = copyCurrent();
                newKey.labels = [item];

                // Parse matrix position from label "row,col"
                if (item.includes(',')) {
                    const parts = item.split(',');
                    const r_idx = parseInt(parts[0], 10);
                    const c_idx = parseInt(parts[1], 10);
                    if (!isNaN(r_idx) && !isNaN(c_idx)) {
                        newKey.row = r_idx;
                        newKey.col = c_idx;
                    }
                }
                newKey.label = item; // Set fallback label

                // Add key
                keys.push(newKey);

                // Advance
                current.x += current.w;
                current.w = 1; current.h = 1;
                current.x2 = 0; current.y2 = 0;
                current.w2 = 1; current.h2 = 1;
                current.nub = false; current.stepped = false; current.decal = false; current.ghost = false;

            } else {
                // Metadata object
                if (item.rx !== undefined) {
                    current.rotation_x = cluster.x = item.rx;
                    current.x = cluster.x;
                    current.y = cluster.y;
                }
                if (item.ry !== undefined) {
                    current.rotation_y = cluster.y = item.ry;
                    current.x = cluster.x;
                    current.y = cluster.y;
                }
                if (item.r !== undefined) current.rotation_angle = item.r;

                if (item.x !== undefined) current.x += item.x;
                if (item.y !== undefined) current.y += item.y;
                if (item.w !== undefined) current.w = current.w2 = item.w;
                if (item.h !== undefined) current.h = current.h2 = item.h;

                if (item.d !== undefined) current.decal = item.d;
                if (item.g !== undefined) current.ghost = item.g;
            }
        });

        // End of row
        current.y += 1;
        current.x = current.rotation_x; // Reset x to rotation_x for new row
    });

    return keys;
};
