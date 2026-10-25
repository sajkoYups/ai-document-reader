import assert from "node:assert/strict";
import test from "node:test";
import { isJpegBase64, withTimeout } from "../services/ocrService.js";

test("OCR accepts a JPEG start-of-image and rejects other bytes", () => {
  assert.equal(isJpegBase64(Buffer.from([0xff, 0xd8, 0xff, 0xdb]).toString("base64")), true);
  assert.equal(isJpegBase64(Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString("base64")), false);
  assert.equal(isJpegBase64(""), false);
});

test("OCR page timeout rejects a wedged recognition", async () => {
  await assert.rejects(withTimeout(new Promise(() => undefined), 20), /timed out/);
});
