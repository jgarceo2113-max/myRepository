"use server";

import { CertificateStatus } from "@/types";
import { Databases } from "node-appwrite";
import { VoidActionResponse } from "../shared/types";

export async function updateCertificateStatus(
  databaseId: string,
  collectionId: string,
  databases: Databases,
  status: CertificateStatus,
  id: string,
): Promise<VoidActionResponse> {
  try {
    await databases.updateDocument({
      databaseId,
      collectionId,
      documentId: id,
      data: { status },
    });

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : `Failed to update status for certificate id: ${id}`;
    return { ok: false, error: message };
  }
}
