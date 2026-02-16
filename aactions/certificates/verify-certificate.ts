"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { Databases, Query } from "node-appwrite";
import { Certificate, DefaultDocument } from "../shared/types";
import { getEnv, withRetry } from "../shared/utils";

async function fetchCertificate(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  certificateId: string,
): Promise<DefaultDocument> {
  return await withRetry({
    fn: async () => {
      return await databases.listDocuments({
        databaseId,
        collectionId,
        queries: [
          Query.equal("status", ["-1", "1"]),
          Query.equal("$id", certificateId),
        ],
      });
    },
  });
}

export async function verifyCertificateId(id: string) {
  try {
    if (!id) {
      return { ok: false, error: "Certificate ID is required" };
    }

    const { databaseId, certificates } = getEnv();
    const { databases } = await createAdminClient();

    const res = await fetchCertificate(databases, databaseId, certificates, id);
    if (!res.documents.length) {
      return {
        ok: true,
        error: "Certificate not found or invalid status",
        data: { validity: false, status: "0", id, data: null },
      };
    }

    const certificate = res.documents[0] as unknown as Certificate;
    return {
      ok: true,
      data: {
        validity: true,
        id,
        status: certificate.status,
        data: {
          id,
          holderName: certificate.recipientFullName,
          issuer: certificate.issuer,
          issuanceDate: certificate.$createdAt,
        },
      },
    };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify certificate";
    return { ok: false, error: message };
  }
}
