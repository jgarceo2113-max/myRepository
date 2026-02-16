"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { ImageResponse } from "../shared/types";
import { getEnv, withCache, withRetry } from "../shared/utils";

async function _fetchTemplateCover(
  bucketId: string,
  fileId: string,
): Promise<string> {
  return withRetry({
    fn: async () => {
      const { storage } = await createAdminClient();
      const arrayBuffer = await storage.getFileView({ bucketId, fileId });
      return Buffer.from(arrayBuffer).toString("base64");
    },
  });
}

const fetchTemplateCover = withCache({
  fn: _fetchTemplateCover,
  keyPartsGenerator: (bucketId, fileId) => ["template-cover", bucketId, fileId],
  tagGenerator: (_bucketId, fileId) => [`template-cover-${fileId}`],
  staticTag: "template-cover",
  revalidate: 300,
});

export async function getTemplateCover(fileId: string): Promise<ImageResponse> {
  try {
    const { coverBucket } = getEnv();
    const res = await fetchTemplateCover(coverBucket, fileId);

    if (!res) {
      throw new Error("No cover file");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch template cover";
    return { ok: false, error: message };
  }
}
