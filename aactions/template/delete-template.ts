"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { revalidateTag } from "next/cache";
import { getLoggedInUser } from "../auth";
import { getEnv } from "../shared/utils";

export async function deleteTemplateById(id: string) {
  const { databases, storage } = await createSessionClient();
  const currentUser = await getLoggedInUser();

  const { databaseId, templates, templateBucket, coverBucket } = getEnv();
  if (!id) throw new Error("Template id is missing");

  // Step 1: Fetch template
  const existing = await databases.getDocument({
    databaseId: databaseId,
    collectionId: templates,
    documentId: id,
  });

  if (!existing) throw new Error("Template not found");

  const { jsonFileId, coverFileId } = existing;

  // Step 2: Soft delete (hide from UI immediately)
  await databases.updateDocument({
    databaseId: databaseId,
    collectionId: templates,
    documentId: id,
    data: { isDeleted: true },
  });

  // Step 3: Revalidate caches
  if (currentUser) {
    revalidateTag(`user-templates-${currentUser.$id}`);
    revalidateTag(`template-count-${currentUser.$id}`);
    revalidateTag("user-template-count");
  }

  // Step 4: Cleanup storage (best effort)
  try {
    if (jsonFileId) {
      await storage.deleteFile({
        bucketId: templateBucket,
        fileId: jsonFileId,
      });
    }
    if (coverFileId) {
      await storage.deleteFile({ bucketId: coverBucket, fileId: coverFileId });
    }

    // Step 5: Optional hard delete if cleanup succeeded
    await databases.deleteDocument({
      databaseId: databaseId,
      collectionId: templates,
      documentId: id,
    });
  } catch (cleanupErr) {
    console.error(
      `Cleanup failed for template ${id}. Template is soft-deleted, retry later.`,
      cleanupErr,
    );
  }

  return { ok: true };
}
