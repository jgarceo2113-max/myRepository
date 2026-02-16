import { ID } from "node-appwrite";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/json": "json",
};

export function getSafeFileExtension(file: File): string {
  function sanitize(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") // Remove all non-alphanumeric chars
      .slice(0, 5); // Limit length
  }

  const mimeExt = MIME_TO_EXT[file.type];
  if (mimeExt) {
    // If the MIME type is in our allowed/supported list, use it.
    return mimeExt;
  }

  let rawExtension = "";
  const filenameParts = file.name.split(".");

  if (filenameParts.length > 1) {
    rawExtension = filenameParts.pop() || "";
  }

  const finalExt = sanitize(rawExtension);

  // Return the sanitized filename extension, or 'dat' if it was empty.
  return finalExt || "dat";
}

export function getSafeFilename(file: File): string {
  const systemId = ID.unique();
  const extension = getSafeFileExtension(file);

  return `${systemId}.${extension}`;
}

export function sanitizeFilename(str: string) {
  // Windows reserved names (case-insensitive)
  const reserved = /^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i;

  // Replace spaces with underscores
  let filename = str.replace(/\s+/g, "_");

  // Remove/replace invalid characters
  // Windows: < > : " / \ | ? *
  // Also remove control characters (0x00-0x1F) and DEL (0x7F)
  filename = filename.replace(/[<>:"/\\|?*\x00-\x1F\x7F]/g, "");

  // Remove leading/trailing dots and spaces (Windows issue)
  filename = filename.replace(/^[.\s]+|[.\s]+$/g, "");

  // Check if name (without extension) is reserved
  const parts = filename.split(".");
  const nameOnly = parts.length > 1 ? parts.slice(0, -1).join(".") : filename;
  const ext = parts.length > 1 ? "." + parts[parts.length - 1] : "";

  if (reserved.test(nameOnly)) {
    filename = nameOnly + "_" + ext;
  }

  // Ensure not empty
  return filename || "unnamed";
}
