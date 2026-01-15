
export const rotatePoint = (x, y, cx, cy, angle) => {
    const rad = angle * (Math.PI / 180);
    const dx = x - cx;
    const dy = y - cy;
    return {
        x: cx + (dx * Math.cos(rad) - dy * Math.sin(rad)),
        y: cy + (dx * Math.sin(rad) + dy * Math.cos(rad))
    };
};

export const calculateBoundingBox = (keys, keySize = 1) => {
    if (!keys || keys.length === 0) return { width: 0, height: 0, min_x: 0, min_y: 0 };

    let min_x = Infinity, min_y = Infinity;
    let max_x = -Infinity, max_y = -Infinity;

    keys.forEach(key => {
        const kx = key.x * keySize;
        const ky = key.y * keySize;
        const kw = (key.w || 1) * keySize;
        const kh = (key.h || 1) * keySize;

        if (!key.rotation_angle) {
            min_x = Math.min(min_x, kx);
            min_y = Math.min(min_y, ky);
            max_x = Math.max(max_x, kx + kw);
            max_y = Math.max(max_y, ky + kh);
            return;
        }

        const ox = (key.rotation_x || 0) * keySize;
        const oy = (key.rotation_y || 0) * keySize;

        const corners = [
            { x: kx, y: ky },
            { x: kx + kw, y: ky },
            { x: kx + kw, y: ky + kh },
            { x: kx, y: ky + kh }
        ];

        corners.forEach(p => {
            const rp = rotatePoint(p.x, p.y, ox, oy, key.rotation_angle);
            min_x = Math.min(min_x, rp.x);
            min_y = Math.min(min_y, rp.y);
            max_x = Math.max(max_x, rp.x);
            max_y = Math.max(max_y, rp.y);
        });
    });

    return {
        width: max_x - min_x,
        height: max_y - min_y,
        min_x: min_x,
        min_y: min_y,
        max_x: max_x,
        max_y: max_y
    };
};
