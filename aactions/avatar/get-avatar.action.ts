"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import type { Storage } from "node-appwrite";
import type { ImageResponse } from "../shared/types";
import { getEnv, withCache } from "../shared/utils";

export async function _fetchAvatar(
  bucketId: string,
  fileId: string,
  storage: Storage,
): Promise<string> {
  const arrayBuffer = await storage.getFileView({ bucketId, fileId });
  return Buffer.from(arrayBuffer).toString("base64");
}

const fetchAvatar = withCache({
  fn: _fetchAvatar,
  keyPartsGenerator: (_bucketId, fileId, _storage) => [
    "avatar-preview",
    fileId,
  ],
  tagGenerator: (_bucketId, fileId, _storage) => [`avatar-preview-${fileId}`],
  revalidate: 300,
  staticTag: "avatar-preview",
});

export async function getAvatar(fileId: string): Promise<ImageResponse> {
  try {
    const { avatarBucket } = getEnv();
    const { storage } = await createAdminClient();

    const res = await fetchAvatar(avatarBucket, fileId, storage);
    if (!res) {
      throw new Error("No avatar set");
    }

    return { ok: true, data: res };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch avatar";
    return { ok: false, error: message };
  }
}
