import { createHash } from "node:crypto";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const MAX_UPLOAD_BYTES = 1_500_000;

export class UploadError extends Error {}

/** Only formats browsers render as plain images. SVG is refused on purpose: it can carry scripts. */
function detect(b: Buffer): "png" | "jpg" | "gif" | "webp" | undefined {
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.length > 6 && b.subarray(0, 4).toString("latin1") === "GIF8") return "gif";
  if (b.length > 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "webp";
  return undefined;
}

export const FILE_NAME = /^[0-9a-f]{16}\.(png|jpg|gif|webp)$/;

/**
 * Card art on disk. The name is a hash of the bytes plus the extension we detected ourselves, so nothing a
 * client sends ever becomes a path, the same picture uploaded twice is stored once, and a name can be cached forever.
 */
export class UploadStore {
  constructor(private readonly dir: string) {}

  async save(base64: unknown): Promise<{ file: string; bytes: number }> {
    if (typeof base64 !== "string" || base64.length === 0) throw new UploadError("expected { data: <base64 image> }");
    // Reject before decoding: base64 is about 4/3 of the real size.
    if (base64.length > Math.ceil(MAX_UPLOAD_BYTES * 1.4)) throw new UploadError(`image is too large (limit ${Math.round(MAX_UPLOAD_BYTES / 1000)} KB)`);
    const bytes = Buffer.from(base64.replace(/^data:[^,]*,/, ""), "base64");
    if (bytes.length === 0) throw new UploadError("the image is empty");
    if (bytes.length > MAX_UPLOAD_BYTES) throw new UploadError(`image is too large (limit ${Math.round(MAX_UPLOAD_BYTES / 1000)} KB)`);
    const ext = detect(bytes);
    if (!ext) throw new UploadError("only PNG, JPEG, GIF and WebP images are accepted");
    const file = `${createHash("sha256").update(bytes).digest("hex").slice(0, 16)}.${ext}`;
    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, file), bytes);
    return { file, bytes: bytes.length };
  }

  async list(): Promise<{ file: string; bytes: number; at: Date }[]> {
    let names: string[];
    try {
      names = await readdir(this.dir);
    } catch {
      return [];
    }
    const out = [];
    for (const file of names.filter((n) => FILE_NAME.test(n))) {
      const s = await stat(join(this.dir, file));
      out.push({ file, bytes: s.size, at: s.mtime });
    }
    return out.sort((a, b) => b.at.getTime() - a.at.getTime());
  }
}
