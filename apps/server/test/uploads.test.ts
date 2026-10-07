import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { FILE_NAME, MAX_AUDIO_BYTES, MAX_UPLOAD_BYTES, UploadStore } from "../src/content/uploads.js";

const dir = mkdtempSync(join(tmpdir(), "herotime-up-"));
const store = new UploadStore(dir);
afterAll(() => rmSync(dir, { recursive: true, force: true }));
const b64 = (bytes: Buffer): string => bytes.toString("base64");
const pad = (head: Buffer, size = 64): Buffer => Buffer.concat([head, Buffer.alloc(size)]);

describe("uploads", () => {
  it("accepts MP3 (ID3 tag or a bare frame), OGG and WAV, named by their content", async () => {
    const id3 = await store.save(b64(pad(Buffer.from("ID3\x03\x00", "latin1"))));
    const frame = await store.save(b64(pad(Buffer.from([0xff, 0xfb, 0x90, 0x64]))));
    const ogg = await store.save(b64(pad(Buffer.from("OggS", "latin1"))));
    const wav = await store.save(b64(pad(Buffer.concat([Buffer.from("RIFF", "latin1"), Buffer.alloc(4), Buffer.from("WAVE", "latin1")]))));
    expect([id3, frame, ogg, wav].map((x) => x.file.split(".")[1])).toEqual(["mp3", "mp3", "ogg", "wav"]);
    for (const x of [id3, ogg, wav]) expect(x.file).toMatch(FILE_NAME);
    expect((await store.list()).length).toBe(4);
  });

  it("sounds may be larger than pictures, up to their own limit", async () => {
    const bigSound = pad(Buffer.from("OggS", "latin1"), MAX_UPLOAD_BYTES + 1000);
    await expect(store.save(b64(bigSound))).resolves.toMatchObject({ bytes: bigSound.length });
    const bigPng = pad(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), MAX_UPLOAD_BYTES + 1000);
    await expect(store.save(b64(bigPng))).rejects.toThrow(/image is too large/);
    const hugeSound = pad(Buffer.from("OggS", "latin1"), MAX_AUDIO_BYTES + 1000);
    await expect(store.save(b64(hugeSound))).rejects.toThrow(/too large/);
  });

  it("refuses anything else", async () => {
    await expect(store.save(b64(Buffer.from("<svg onload=alert(1)></svg>")))).rejects.toThrow(/only PNG/);
  });
});
