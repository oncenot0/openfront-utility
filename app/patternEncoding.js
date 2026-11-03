export class PatternDecoder {
    constructor(base64) {
        this.bytes = PatternDecoder.base64ToBytes(base64);
        if (this.bytes.length < 3) {
            throw new Error("Pattern data is too short to contain required metadata.");
        }
        const version = this.bytes[0];
        if (version !== 0) {
            throw new Error(`Unrecognized pattern version ${version}.`);
        }
        const byte1 = this.bytes[1];
        const byte2 = this.bytes[2];
        this.scale = byte1 & 0x07;
        this.tileWidth = (((byte2 & 0x03) << 5) | ((byte1 >> 3) & 0x1f)) + 2;
        this.tileHeight = ((byte2 >> 2) & 0x3f) + 2;
        const expectedBits = this.tileWidth * this.tileHeight;
        const expectedBytes = (expectedBits + 7) >> 3;
        if (this.bytes.length - 3 < expectedBytes) {
            throw new Error("Pattern data is too short for the specified dimensions.");
        }
    }
    static base64ToBytes(base64) {
        base64 = base64.replace(/-/g, "+").replace(/_/g, "/");
        let bin;
        try {
            bin = atob(base64);
        }
        catch (_a) {
            throw new Error("That doesn't look like a pattern code. Paste the Base64 code or a preview link.");
        }
        return Uint8Array.from(bin, c => c.charCodeAt(0));
    }
    getTileWidth() {
        return this.tileWidth;
    }
    getTileHeight() {
        return this.tileHeight;
    }
    getScale() {
        return this.scale;
    }
    isSet(x, y) {
        const px = (x >> this.scale) % this.tileWidth;
        const py = (y >> this.scale) % this.tileHeight;
        const idx = py * this.tileWidth + px;
        const byteIndex = idx >> 3;
        const bitIndex = idx & 7;
        const byte = this.bytes[3 + byteIndex];
        if (byte === undefined)
            throw new Error("Invalid pattern");
        return (byte & (1 << bitIndex)) !== 0;
    }
}
export function generatePatternBase64(pattern, width, height, scale) {
    const w_bin = width - 2;
    const h_bin = height - 2;
    if (scale !== (scale & 0x07))
        throw new Error(`Invalid scale: ${scale}`);
    if (w_bin !== (w_bin & 0x7f))
        throw new Error(`Invalid width: ${width}`);
    if (h_bin !== (h_bin & 0x3f))
        throw new Error(`Invalid height: ${height}`);
    const version = 0;
    const header = new Uint8Array(3);
    header[0] = version;
    header[1] = (scale & 0x7) | ((w_bin & 0x1f) << 3);
    header[2] = ((w_bin & 0x60) >> 5) | ((h_bin & 0x3f) << 2);
    const totalBits = width * height;
    const totalBytes = Math.ceil(totalBits / 8);
    const data = new Uint8Array(totalBytes);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;
            const byteIndex = Math.floor(idx / 8);
            const bitOffset = idx % 8;
            if (pattern[y][x]) {
                data[byteIndex] |= 1 << bitOffset;
            }
        }
    }
    const full = new Uint8Array(header.length + data.length);
    full.set(header, 0);
    full.set(data, header.length);
    return btoa(String.fromCharCode(...full))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/\=/g, "");
}
/**
 * Accepts either a bare pattern code or one of this app's own preview links
 * (`https://host/path#<code>?primary=ffffff&secondary=000000`) and returns just
 * the code, so pasting a copied link into Import works.
 */
export function normalizePatternInput(input) {
    let code = input.trim();
    const hashIndex = code.indexOf("#");
    if (hashIndex !== -1)
        code = code.slice(hashIndex + 1);
    const queryIndex = code.indexOf("?");
    if (queryIndex !== -1)
        code = code.slice(0, queryIndex);
    return code.trim();
}
export function decodePatternBase64(base64) {
    const decoder = new PatternDecoder(base64);
    const tileWidth = decoder.getTileWidth();
    const tileHeight = decoder.getTileHeight();
    const scale = decoder.getScale();
    const pattern = new Array(tileHeight);
    for (let y = 0; y < tileHeight; y++) {
        const row = new Array(tileWidth);
        for (let x = 0; x < tileWidth; x++) {
            row[x] = decoder.isSet(x << scale, y << scale) ? 1 : 0;
        }
        pattern[y] = row;
    }
    return { pattern, tileWidth, tileHeight, scale };
}
