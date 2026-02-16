"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import type { Storage } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import { TemplateResponse } from "../shared/types";
import { getEnv, withCache, withRetry } from "../shared/utils";

async function _fetchTemplate(
  fileId: string,
  bucketId: string,
  storage: Storage,
  _userId: string,
): Promise<ArrayBuffer> {
  return withRetry({
    fn: async () => {
      return storage.getFileDownload({ bucketId, fileId });
    },
  });
}

const fetchTemplate = withCache({
  fn: _fetchTemplate,
  keyPartsGenerator: (bucketId, fileId, _userId) =>
    ["user-template", bucketId, fileId, _userId] as string[],
  tagGenerator: (fileId, _userId) => [`user-template-${fileId}-${_userId}`],
  staticTag: "user-template",
  revalidate: 300,
});

export async function getTemplate(fileId: string): Promise<TemplateResponse> {
  try {
    const { storage } = await createSessionClient();
    const currentUser = await getLoggedInUser();

    if (!currentUser) {
      throw new Error("No session");
    }

    const { templateBucket } = getEnv();

    const res = await fetchTemplate(
      fileId,
      templateBucket,
      storage,
      currentUser.$id,
    );

    if (!res) {
      throw new Error("No template data saved");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch template cover";
    return { ok: false, error: message };
  }
}
