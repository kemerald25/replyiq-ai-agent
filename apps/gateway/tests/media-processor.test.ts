import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { processImageMedia, MediaProcessingError } from "../src/media/processor.js";

describe("Sharp Media Processor", () => {
  it("resizes large images so max edge is 1600px and transcodes to WebP", async () => {
    // Create an 1800x900 synthetic PNG (exceeds 1600px max edge)
    const largePng = await sharp({
      create: {
        width: 1800,
        height: 900,
        channels: 3,
        background: { r: 10, g: 150, b: 80 },
      },
    })
      .png()
      .toBuffer();

    const processed = await processImageMedia(largePng, "image/png");

    expect(processed.mimeType).toBe("image/webp");
    expect(processed.width).toBe(1600);
    expect(processed.height).toBe(800); // 2:1 aspect ratio preserved
    expect(processed.sizeBytes).toBeLessThan(1024 * 1024); // Under 1 MB
    expect(processed.buffer.byteLength).toBe(processed.sizeBytes);
    expect(processed.base64.length).toBeGreaterThan(0);
  }, 15000);

  it("does not upscale images smaller than 1600px", async () => {
    // Create an 800x600 synthetic JPEG
    const smallJpeg = await sharp({
      create: {
        width: 800,
        height: 600,
        channels: 3,
        background: { r: 255, g: 100, b: 50 },
      },
    })
      .jpeg()
      .toBuffer();

    const processed = await processImageMedia(smallJpeg, "image/jpeg");

    expect(processed.mimeType).toBe("image/webp");
    expect(processed.width).toBe(800);
    expect(processed.height).toBe(600);
  });

  it("rejects non-image buffers", async () => {
    const fakeBuffer = Buffer.from("Hello world, this is not an image file");

    await expect(processImageMedia(fakeBuffer, "text/plain")).rejects.toThrow(
      MediaProcessingError
    );
  });

  it("rejects images exceeding 5 MB input cap", async () => {
    const hugeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6 MB

    await expect(processImageMedia(hugeBuffer, "image/jpeg")).rejects.toThrow(
      MediaProcessingError
    );
  });

  it("rejects unsupported image format like GIF or TIFF", async () => {
    const gifBuffer = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .gif()
      .toBuffer();

    await expect(processImageMedia(gifBuffer, "image/gif")).rejects.toThrow(
      "Unsupported image format"
    );
  });
});
