import { describe, it, expect } from "vitest";
import {
  parseAndValidateImage,
  computeSha256Hex,
  MAX_ASSET_SIZE_BYTES,
  MAX_IMAGE_DIMENSION,
} from "../src/services/image-parser.js";
import { AssetValidationError } from "../src/domain/errors.js";

/**
 * Creates a valid synthetic PNG binary header with specified dimensions.
 */
function createSyntheticPng(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(33);
  // Signature
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  // IHDR length: 13
  const view = new DataView(buf.buffer);
  view.setUint32(8, 13, false);
  // Chunk type 'IHDR'
  buf.set([0x49, 0x48, 0x44, 0x52], 12);
  // Width and Height
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  // Bit depth, color type, compression, filter, interlace
  buf.set([8, 2, 0, 0, 0], 24);
  return buf;
}

/**
 * Creates a valid synthetic JPEG binary header with specified dimensions.
 */
function createSyntheticJpeg(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(30);
  // SOI marker (FF D8)
  buf[0] = 0xff;
  buf[1] = 0xd8;
  // SOF0 marker (FF C0)
  buf[2] = 0xff;
  buf[3] = 0xc0;
  const view = new DataView(buf.buffer);
  view.setUint16(4, 11, false); // Length
  buf[6] = 8; // Precision
  view.setUint16(7, height, false); // Height
  view.setUint16(9, width, false); // Width
  buf[11] = 3; // 3 components (YCbCr)
  return buf;
}

/**
 * Creates a valid synthetic WebP binary header with specified dimensions.
 */
function createSyntheticWebp(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(32);
  // 'RIFF'
  buf.set([0x52, 0x49, 0x46, 0x46], 0);
  const view = new DataView(buf.buffer);
  view.setUint32(4, 24, true); // File size - 8
  // 'WEBP'
  buf.set([0x57, 0x45, 0x42, 0x50], 8);
  // 'VP8X' (extended format)
  buf.set([0x56, 0x50, 0x38, 0x58], 12);
  view.setUint32(16, 10, true); // Chunk size
  // Flags at byte 20
  buf[20] = 0;
  // 24-bit canvas width minus 1 (little-endian)
  const wMinus1 = width - 1;
  buf[24] = wMinus1 & 0xff;
  buf[25] = (wMinus1 >> 8) & 0xff;
  buf[26] = (wMinus1 >> 16) & 0xff;
  // 24-bit canvas height minus 1 (little-endian)
  const hMinus1 = height - 1;
  buf[27] = hMinus1 & 0xff;
  buf[28] = (hMinus1 >> 8) & 0xff;
  buf[29] = (hMinus1 >> 16) & 0xff;
  return buf;
}

describe("Image Parser & Magic Bytes Validation", () => {
  describe("Valid Image Formats", () => {
    it("parses valid PNG headers and extracts dimensions and hash", async () => {
      const pngBytes = createSyntheticPng(1200, 800);
      const parsed = await parseAndValidateImage(pngBytes);

      expect(parsed.mimeType).toBe("image/png");
      expect(parsed.width).toBe(1200);
      expect(parsed.height).toBe(800);
      expect(parsed.sizeBytes).toBe(pngBytes.length);
      expect(parsed.hash).toHaveLength(64);
    });

    it("parses valid JPEG headers and extracts dimensions and hash", async () => {
      const jpegBytes = createSyntheticJpeg(1920, 1080);
      const parsed = await parseAndValidateImage(jpegBytes);

      expect(parsed.mimeType).toBe("image/jpeg");
      expect(parsed.width).toBe(1920);
      expect(parsed.height).toBe(1080);
      expect(parsed.sizeBytes).toBe(jpegBytes.length);
      expect(parsed.hash).toHaveLength(64);
    });

    it("parses valid WebP headers and extracts dimensions and hash", async () => {
      const webpBytes = createSyntheticWebp(640, 480);
      const parsed = await parseAndValidateImage(webpBytes);

      expect(parsed.mimeType).toBe("image/webp");
      expect(parsed.width).toBe(640);
      expect(parsed.height).toBe(480);
      expect(parsed.sizeBytes).toBe(webpBytes.length);
      expect(parsed.hash).toHaveLength(64);
    });
  });

  describe("Malicious, SVG, and Unapproved Formats Rejection", () => {
    it("strictly rejects SVG images to prevent stored XSS attacks", async () => {
      const svg1 = new TextEncoder().encode("<svg xmlns=\"http://www.w3.org/2000/svg\"><circle/></svg>");
      await expect(parseAndValidateImage(svg1)).rejects.toThrow(AssetValidationError);
      await expect(parseAndValidateImage(svg1)).rejects.toThrow("SVG and HTML vector formats are strictly forbidden");

      const svg2 = new TextEncoder().encode("<?xml version=\"1.0\"?><svg><script>alert(1)</script></svg>");
      await expect(parseAndValidateImage(svg2)).rejects.toThrow(AssetValidationError);
    });

    it("strictly rejects HTML files disguised as images", async () => {
      const html = new TextEncoder().encode("<!DOCTYPE html><html><body><script>alert(1)</script></body></html>");
      await expect(parseAndValidateImage(html)).rejects.toThrow(AssetValidationError);
    });

    it("rejects arbitrary text, JSON, and binary executables", async () => {
      const text = new TextEncoder().encode("Hello, this is just a plain text file");
      await expect(parseAndValidateImage(text)).rejects.toThrow(AssetValidationError);

      const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]); // 'MZ'
      await expect(parseAndValidateImage(exe)).rejects.toThrow(AssetValidationError);
    });

    it("rejects empty or corrupt image buffers", async () => {
      await expect(parseAndValidateImage(new Uint8Array(0))).rejects.toThrow("Image buffer is empty");
      await expect(parseAndValidateImage(new Uint8Array([0x89, 0x50]))).rejects.toThrow(AssetValidationError);
    });
  });

  describe("Size, Dimension, and Total Pixel Caps", () => {
    it("rejects images exceeding the 5 MB maximum size cap", async () => {
      const largeBuf = new Uint8Array(MAX_ASSET_SIZE_BYTES + 1);
      // Pre-fill with PNG signature
      largeBuf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);

      await expect(parseAndValidateImage(largeBuf)).rejects.toThrow(/exceeds maximum allowed size of 5 MB/);
    });

    it("rejects images with dimensions exceeding 4096 px", async () => {
      const excessiveWidth = createSyntheticPng(4097, 100);
      await expect(parseAndValidateImage(excessiveWidth)).rejects.toThrow(/exceed maximum allowed dimension of 4096px/);

      const excessiveHeight = createSyntheticJpeg(100, 4097);
      await expect(parseAndValidateImage(excessiveHeight)).rejects.toThrow(/exceed maximum allowed dimension of 4096px/);
    });
  });

  describe("SHA-256 Hashing", () => {
    it("produces deterministic SHA-256 hex strings", async () => {
      const data = new TextEncoder().encode("Deterministic image bytes test payload");
      const hash1 = await computeSha256Hex(data);
      const hash2 = await computeSha256Hex(data);
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
  });
});
