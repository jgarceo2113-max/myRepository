"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { revalidateTag } from "next/cache";
import { ID, Models, Permission, Role } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { getLoggedInUser } from "../auth";
import { getEnv } from "../shared/utils";

export async function saveTemplate(formData: FormData) {
  const { databaseId, templates, templateBucket, coverBucket } = getEnv();

  console.log("CALLED \n\n\n\n\n\n\n");

  const currentUser = await getLoggedInUser();
  if (!currentUser) {
    throw new Error("No session");
  }

  const jsonFile = formData.get("jsonFile") as File | null;
  if (!jsonFile) throw new Error("Missing template data. Please try again");

  const screenshotFile = formData.get("screenshot") as File | null;
  if (!screenshotFile) throw new Error("Missing cover data. Please try again");

  // Metadata
  const name = formData.get("name") as string;
  const size = JSON.parse((formData.get("size") as string) || "{}");
  const isPortrait = JSON.parse((formData.get("isPortrait") as string) || "false");

  if (typeof isPortrait !== "boolean") {
    throw new Error("Invalid isPortrait value (expected boolean)");
  }

  const templateId = formData.get("templateId") as string | null;
  if (!size?.w || !size?.h || !size?.label) {
    throw new Error("Missing required size properties: width, height, or label");
  }

  const width = Number(size.w);
  const height = Number(size.h);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Invalid size values: width=${size.w}, height=${size.h}`);
  }

  const baseFileName = ID.unique();
  const { databases, storage } = await createSessionClient();

  let existing: Models.Document | null = null;
  if (templateId) {
    existing = await databases.getDocument({
      databaseId: databaseId,
      collectionId: templates,
      documentId: templateId,
    });
  }

  // Upload new JSON template
  const jsonBuffer = Buffer.from(await jsonFile.arrayBuffer());
  const jsonPermissions = [
    Permission.read(Role.label("issuer")),
    Permission.update(Role.user(currentUser.$id)),
    Permission.delete(Role.user(currentUser.$id)),
  ];

  // Some buckets are configured with extension allow-lists. Try .json first; fallback to .txt.
  let templateData: Models.File;
  try {
    templateData = await storage.createFile({
      bucketId: templateBucket,
      fileId: ID.unique(),
      file: InputFile.fromBuffer(jsonBuffer, `${baseFileName}.json`),
      permissions: jsonPermissions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // Retry with .txt if the bucket blocks .json
    if (message.toLowerCase().includes("file extension not allowed")) {
      templateData = await storage.createFile({
        bucketId: templateBucket,
        fileId: ID.unique(),
        file: InputFile.fromBuffer(jsonBuffer, `${baseFileName}.txt`),
        permissions: jsonPermissions,
      });
    } else {
      throw new Error(
        `Template JSON upload failed (bucket=${templateBucket}). ${message}`,
      );
    }
  }

  // Upload template cover
  const coverImageBuffer = Buffer.from(await screenshotFile.arrayBuffer());
  // Preserve the real file extension to satisfy Appwrite bucket extension allow-lists.
  // (Common allow-lists: jpg, jpeg, png, webp)
  const originalName = (screenshotFile as unknown as { name?: string }).name || "";
  const extFromName = originalName.includes(".")
    ? originalName.split(".").pop()?.toLowerCase()
    : undefined;
  const extFromMime = screenshotFile.type?.split("/")?.pop()?.toLowerCase();
  const safeExt =
    (extFromName && /^(jpg|jpeg|png|webp|gif)$/.test(extFromName) && extFromName) ||
    (extFromMime && /^(jpg|jpeg|png|webp|gif)$/.test(extFromMime) && extFromMime) ||
    "jpg";
  const coverPermissions = [
    Permission.read(Role.label("issuer")),
    Permission.update(Role.user(currentUser.$id)),
    Permission.delete(Role.user(currentUser.$id)),
  ];

  let templateCoverData: Models.File;
  try {
    templateCoverData = await storage.createFile({
      bucketId: coverBucket,
      fileId: ID.unique(),
      file: InputFile.fromBuffer(coverImageBuffer, `${baseFileName}.${safeExt}`),
      permissions: coverPermissions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    // If bucket blocks .jpeg but allows .jpg (or vice-versa), retry once.
    if (message.toLowerCase().includes("file extension not allowed")) {
      const altExt = safeExt === "jpeg" ? "jpg" : safeExt === "jpg" ? "jpeg" : null;
      if (altExt) {
        templateCoverData = await storage.createFile({
          bucketId: coverBucket,
          fileId: ID.unique(),
          file: InputFile.fromBuffer(
            coverImageBuffer,
            `${baseFileName}.${altExt}`,
          ),
          permissions: coverPermissions,
        });
      } else {
        throw new Error(
          `Template cover upload failed (bucket=${coverBucket}, ext=${safeExt}). ${message}`,
        );
      }
    } else {
      throw new Error(
        `Template cover upload failed (bucket=${coverBucket}, ext=${safeExt}). ${message}`,
      );
    }
  }

  revalidateTag(`user-templates-${currentUser.$id}`);
  revalidateTag(`template-count-${currentUser.$id}`);

  if (templateId && existing) {
    // biome-ignore lint/suspicious/noExplicitAny: handling variable document structure from Appwrite
    const existingData = (existing as any).data || existing;

    // Delete old template file
    if (existingData?.jsonFileId) {
      try {
        await storage.deleteFile({
          bucketId: templateBucket,
          fileId: existingData.jsonFileId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unexpected error occured";
        console.error("Cant delete JSON template:", message);
      }
    }

    // Delete old cover
    if (existingData?.coverFileId) {
      try {
        await storage.getFile({
          bucketId: coverBucket,
          fileId: existingData.coverFileId,
        });
        console.log("Cover file exists, attempting deletion");
        await storage.deleteFile({
          bucketId: coverBucket,
          fileId: existingData.coverFileId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Unexpected error occurred";
        console.error("Cannot delete cover image:", message);
      }
    }

    const updateData: Record<string, unknown> = {
      jsonFileId: templateData.$id,
      coverFileId: templateCoverData.$id,
      name,
      width,
      height,
      paper: size.label,
      isPortrait,
      isDeleted: false,
    };

    await databases.updateDocument({
      databaseId: databaseId,
      collectionId: templates,
      documentId: templateId,
      data: updateData,
    });

    return { ok: true, id: templateId };
  } else {
    const document = {
      author: currentUser.$id,
      name,
      coverFileId: templateCoverData.$id,
      jsonFileId: templateData.$id,
      width,
      height,
      paper: size.label,
      isPortrait,
      isDeleted: false,
    };

    const documentId = ID.unique();
    await databases.createDocument({
      databaseId: databaseId,
      collectionId: templates,
      documentId,
      data: document,
    });

    return { ok: true, id: documentId };
  }
}
