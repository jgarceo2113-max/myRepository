"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { revalidateTag } from "next/cache";
import { ID, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import sharp from "sharp";
import { getLoggedInUser } from "../auth";
import type { VoidActionResponse } from "../shared/types";
import { getEnv } from "../shared/utils";
import { getSafeFilename } from "../shared/utils/file";
import { updatePrefs } from "../shared/utils/preferences";

export async function updateProfilePhoto(
  file: File,
): Promise<VoidActionResponse> {
  const { storage } = await createSessionClient();

  try {
    const { avatarBucket } = getEnv();
    const currentUser = await getLoggedInUser();

    if (!currentUser) {
      throw new Error("No session");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Resize/compress to max width of 500px, keeping aspec ratio
    const resizedBuffer = await sharp(buffer)
      .resize({ width: 500, height: 500, fit: "cover", position: "center" })
      .jpeg({ quality: 90 })
      .toBuffer();

    const fileId = ID.unique();
    const securerFileName = getSafeFilename(file);

    // Upload new file
    const newFile = await storage.createFile({
      bucketId: avatarBucket,
      fileId,
      file: InputFile.fromBuffer(resizedBuffer, securerFileName),
      permissions: [
        Permission.read(Role.any()),
        Permission.update(Role.user(currentUser.$id)),
        Permission.delete(Role.user(currentUser.$id)),
      ],
    });

    const oldFileId = (currentUser.prefs as { avatarFileId?: string })
      .avatarFileId;
    if (oldFileId) {
      try {
        await storage.deleteFile({ bucketId: avatarBucket, fileId: oldFileId });
      } catch (deleteError) {
        console.warn(
          `Failed to delete previous avatar ${oldFileId}:`,
          deleteError,
        );
      } finally {
        revalidateTag(`avatar-preview-${oldFileId}`);
      }
    }

    const result = await updatePrefs({ avatarFileId: newFile.$id });
    if (!result.ok) {
      throw new Error(result.error);
    }

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "An unknown error occurred while updating the profile photo.";
    console.error(message);
    return { ok: false, error: message };
  }
}
