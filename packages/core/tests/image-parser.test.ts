import { describe, it, expect } from "vitest";
import { parseAndValidateImage, computeSha256Hex } from "../src/services/image-parser.js";
import { AssetValidationError } from "../src/domain/errors.js";

function createSyntheticPng(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(33);
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  const view = new DataView(buf.buffer);
  view.setUint32(8, 13, false);
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  buf.set([8, 2, 0, 0, 0], 24);
  return buf;
}

function createSyntheticJpeg(width: number, height: number, marker = 0xc0): Uint8Array {
  // SOI (0xFF 0xD8) + APP0 (0xFF 0xE0, len 4) + SOF (0xFF marker, len 8)
  const buf = new Uint8Array(20);
  buf[0] = 0xff; buf[1] = 0xd8; buf[2] = 0xff; // SOI + marker start
  buf[3] = 0xe0; // APP0 marker
  buf[4] = 0x00; buf[5] = 0x02; // Length 2 (skip)
  buf[6] = 0xff;
  buf[7] = marker; // SOF marker
  buf[8] = 0x00; buf[9] = 0x08; // Length
  buf[10] = 0x08; // Precision
  const view = new DataView(buf.buffer);
  view.setUint16(11, height, false);
  view.setUint16(13, width, false);
  buf[15] = 0x03; // Components
  buf[16] = 0xff; buf[17] = 0xd9; // EOI
  return buf;
}

function createSyntheticWebpVP8(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30);
  // RIFF header
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  // VP8 chunk
  buf.set([0x56, 0x50, 0x38, 0x20], 12);
  // Dimensions at 26..29
  buf[26] = width & 0xff;
  buf[27] = (width >> 8) & 0x3f;
  buf[28] = height & 0xff;
  buf[29] = (height >> 8) & 0x3f;
  return buf;
}

function createSyntheticWebpVP8L(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(32);
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  buf.set([0x56, 0x50, 0x38, 0x4c], 12);
  const w = width - 1;
  const h = height - 1;
  buf[21] = w & 0xff;
  buf[22] = ((w >> 8) & 0x3f) | ((h & 0x03) << 6);
  buf[23] = (h >> 2) & 0xff;
  buf[24] = (h >> 10) & 0x0f;
  return buf;
}

function createSyntheticWebpVP8X(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30);
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  buf.set([0x56, 0x50, 0x38, 0x58], 12);
  const w = width - 1;
  const h = height - 1;
  buf[24] = w & 0xff;
  buf[25] = (w >> 8) & 0xff;
  buf[26] = (w >> 16) & 0xff;
  buf[27] = h & 0xff;
  buf[28] = (h >> 8) & 0xff;
  buf[29] = (h >> 16) & 0xff;
  return buf;
}

describe("Image Parser & Security Dimensions Validator", () => {
  it("rejects empty image buffers", async () => {
    await expect(parseAndValidateImage(new Uint8Array(0))).rejects.toThrow(AssetValidationError);
  });

  it("rejects oversized images (>5MB)", async () => {
    const huge = new Uint8Array(5 * 1024 * 1024 + 1);
    await expect(parseAndValidateImage(huge)).rejects.toThrow(/exceeds maximum allowed size/);
  });

  it("strictly rejects SVG, XML, and HTML vector uploads for security", async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><circle/></svg>');
    await expect(parseAndValidateImage(svg)).rejects.toThrow(/strictly forbidden/);

    const html = new TextEncoder().encode("<!doctype html><html><body>attack</body></html>");
    await expect(parseAndValidateImage(html)).rejects.toThrow(/strictly forbidden/);
  });

  it("successfully parses valid PNG headers", async () => {
    const png = createSyntheticPng(800, 600);
    const result = await parseAndValidateImage(png);
    expect(result.mimeType).toBe("image/png");
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.hash).toHaveLength(64);
  });

  it("rejects truncated PNG headers", async () => {
    const truncated = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    await expect(parseAndValidateImage(truncated)).rejects.toThrow(AssetValidationError);
  });

  it("successfully parses JPEG headers with SOF markers", async () => {
    const jpeg = createSyntheticJpeg(1024, 768);
    const result = await parseAndValidateImage(jpeg);
    expect(result.mimeType).toBe("image/jpeg");
    expect(result.width).toBe(1024);
    expect(result.height).toBe(768);
  });

  it("rejects JPEG missing SOF marker", async () => {
    const noSof = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]); // Just SOI and EOI
    await expect(parseAndValidateImage(noSof)).rejects.toThrow(/Could not find SOF marker/);
  });

  it("successfully parses WebP VP8, VP8L, and VP8X chunks", async () => {
    const vp8 = createSyntheticWebpVP8(400, 300);
    const resVP8 = await parseAndValidateImage(vp8);
    expect(resVP8.mimeType).toBe("image/webp");
    expect(resVP8.width).toBe(400);
    expect(resVP8.height).toBe(300);

    const vp8l = createSyntheticWebpVP8L(500, 250);
    const resVP8L = await parseAndValidateImage(vp8l);
    expect(resVP8L.mimeType).toBe("image/webp");
    expect(resVP8L.width).toBe(500);
    expect(resVP8L.height).toBe(250);

    const vp8x = createSyntheticWebpVP8X(1200, 800);
    const resVP8X = await parseAndValidateImage(vp8x);
    expect(resVP8X.mimeType).toBe("image/webp");
    expect(resVP8X.width).toBe(1200);
    expect(resVP8X.height).toBe(800);
  });

  it("rejects WebP with unsupported chunk or truncated buffer", async () => {
    const truncated = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
    await expect(parseAndValidateImage(truncated)).rejects.toThrow(/truncated/);

    const badChunk = new Uint8Array(32);
    badChunk.set([0x52, 0x49, 0x46, 0x46], 0);
    badChunk.set([0x57, 0x45, 0x42, 0x50], 8);
    badChunk.set([0x58, 0x58, 0x58, 0x58], 12);
    await expect(parseAndValidateImage(badChunk)).rejects.toThrow(/Unsupported WebP format chunk/);
  });

  it("rejects images exceeding 4096px or 16MP dimensions", async () => {
    const tooWide = createSyntheticPng(5000, 100);
    await expect(parseAndValidateImage(tooWide)).rejects.toThrow(/exceed maximum allowed dimension/);

    const zeroDim = createSyntheticPng(0, 100);
    await expect(parseAndValidateImage(zeroDim)).rejects.toThrow(/Invalid image dimensions/);
  });

  it("computes SHA-256 hash correctly", async () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const hash = await computeSha256Hex(data);
    expect(hash).toHaveLength(64);
  });

  it("rejects unsupported image format buffers", async () => {
    const randomBytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    await expect(parseAndValidateImage(randomBytes)).rejects.toThrow(
      /Unsupported file format/
    );
  });

  it("rejects images exceeding total pixel count limit (12,582,912 pixels)", async () => {
    // 4000x4000 = 16,000,000 pixels (each dimension <= 4096, but total > MAX_TOTAL_PIXELS)
    const tooManyPixels = createSyntheticPng(4000, 4000);
    await expect(parseAndValidateImage(tooManyPixels)).rejects.toThrow(
      /Total pixel count .* exceeds limit/
    );
  }, 15_000);

  it("handles JPEG parsing edge cases (truncated SOF, SOS marker stop, padding)", async () => {
    // Truncated SOF marker (offset + 7 > len)
    const truncatedSof = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x03, 0x08]);
    await expect(parseAndValidateImage(truncatedSof)).rejects.toThrow(
      /JPEG file truncated in SOF marker/
    );

    // Stop at Start-of-Scan (0xDA) marker
    const sosBeforeSof = new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0x00, 0x02]);
    await expect(parseAndValidateImage(sosBeforeSof)).rejects.toThrow(
      /Could not find SOF marker/
    );

    // Consecutive 0xFF padding bytes before marker
    const paddedJpeg = new Uint8Array(22);
    paddedJpeg[0] = 0xff; paddedJpeg[1] = 0xd8; // SOI
    paddedJpeg[2] = 0xff; paddedJpeg[3] = 0xff; paddedJpeg[4] = 0xff; // extra 0xFF padding
    paddedJpeg[5] = 0xc0; // SOF0
    paddedJpeg[6] = 0x00; paddedJpeg[7] = 0x08; // Length
    paddedJpeg[8] = 0x08; // Precision
    const view = new DataView(paddedJpeg.buffer);
    view.setUint16(9, 200, false); // Height
    view.setUint16(11, 300, false); // Width
    paddedJpeg[13] = 0x03;
    paddedJpeg[14] = 0xff; paddedJpeg[15] = 0xd9; // EOI
    const parsed = await parseAndValidateImage(paddedJpeg);
    expect(parsed.width).toBe(300);
    expect(parsed.height).toBe(200);

    // Truncated marker length payload (offset + 2 > len)
    const truncatedPayload = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x01]);
    await expect(parseAndValidateImage(truncatedPayload)).rejects.toThrow(
      /Could not find SOF marker/
    );

    // Non-0xFF byte before marker (line 48 in image-parser.ts)
    const nonFfJpeg = new Uint8Array(20);
    nonFfJpeg[0] = 0xff; nonFfJpeg[1] = 0xd8; // SOI
    nonFfJpeg[2] = 0xff; nonFfJpeg[3] = 0xe0; // APP0
    nonFfJpeg[4] = 0x00; nonFfJpeg[5] = 0x02; // Length 2 (covers length bytes only)
    nonFfJpeg[6] = 0x42; // non-0xFF byte to skip
    nonFfJpeg[7] = 0xff; nonFfJpeg[8] = 0xc0; // SOF0
    nonFfJpeg[9] = 0x00; nonFfJpeg[10] = 0x08; // Length
    nonFfJpeg[11] = 0x08; // precision
    const view2 = new DataView(nonFfJpeg.buffer);
    view2.setUint16(12, 200, false); // height
    view2.setUint16(14, 300, false); // width
    nonFfJpeg[16] = 0x03; // components
    nonFfJpeg[17] = 0xff; nonFfJpeg[18] = 0xd9; // EOI
    const parsedNonFf = await parseAndValidateImage(nonFfJpeg);
    expect(parsedNonFf.width).toBe(300);
    expect(parsedNonFf.height).toBe(200);
  });
});
