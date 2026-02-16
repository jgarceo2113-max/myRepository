"use server";

import { createAdminClient, createSessionClient } from "@/lib/server/appwrite";
import { Databases, Query } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import { DefaultDocument, DocumentResponse } from "../shared/types";
import { getEnv, withCache, withRetry } from "../shared/utils";

/* ------------------------------ USER METRICS ------------------------------ */

async function _fetchIssuedCertificatesCount(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  userId: string,
): Promise<DefaultDocument> {
  return await withRetry({
    fn: async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const result = await databases.listDocuments({
        databaseId,
        collectionId,
        queries: [
          Query.equal("issuer", userId),
          Query.equal("status", "1"),
          Query.greaterThanEqual("$updatedAt", startOfMonth.toISOString()),
          Query.lessThanEqual("$updatedAt", endOfMonth.toISOString()),
        ],
      });

      return result;
    },
  });
}

const fetchIssuedCertificatesCount = withCache({
  fn: _fetchIssuedCertificatesCount,
  tagGenerator: (_databases, _databaseId, _collectionId, userId) => [
    `issued-certificates-${userId}`,
  ],
  staticTag: "user-issued-certificate-count",
  revalidate: 300,
});

export async function getIssuedCertificatesCount(
  refresh?: boolean,
): Promise<DocumentResponse> {
  try {
    const { databaseId, certificates } = getEnv();
    const { databases } = await createSessionClient();
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("No session");
    }

    const res = await fetchIssuedCertificatesCount(
      databases,
      databaseId,
      certificates,
      user.$id,
      refresh,
    );
    if (!res) {
      throw new Error("Failed to fetch issued certificates");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to fetch issued certificate this month";

    return { ok: false, error: message };
  }
}

/* -------------------------------------------------------------------------- */

async function _fetchPendingCertificateCount(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  userId: string,
): Promise<DefaultDocument> {
  return await withRetry({
    fn: async () => {
      const result = await databases.listDocuments({
        databaseId,
        collectionId,
        queries: [Query.equal("issuer", userId), Query.equal("status", "0")],
      });

      return result;
    },
  });
}

const fetchPendingCertificateCount = withCache({
  fn: _fetchPendingCertificateCount,
  tagGenerator: (_databases, _databaseId, _collectionId, userId) => [
    `pending-certificates-${userId}`,
  ],
  staticTag: "user-pending-certificate-count",
  revalidate: 300,
});

export async function getPendingCertificatesCount(
  refresh?: boolean,
): Promise<DocumentResponse> {
  try {
    const { databaseId, certificates } = getEnv();
    const { databases } = await createSessionClient();
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("No session");
    }

    const res = await fetchPendingCertificateCount(
      databases,
      databaseId,
      certificates,
      user.$id,
      refresh,
    );
    if (!res) {
      throw new Error("Failed to fetch pending certificates");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to fetch pending certificates";

    return { ok: false, error: message };
  }
}

async function _fetchRevokedCertificateCount(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  userId: string,
): Promise<DefaultDocument> {
  return await withRetry({
    fn: async () => {
      const result = await databases.listDocuments({
        databaseId,
        collectionId,
        queries: [Query.equal("issuer", userId), Query.equal("status", "-1")],
      });

      console.log(JSON.stringify(result, null, 2));
      return result;
    },
  });
}

const fetchRevokedCertificateCount = withCache({
  fn: _fetchRevokedCertificateCount,
  tagGenerator: (_databases, _databaseId, _collectionId, userId) => [
    `revoked-certificates-${userId}`,
  ],
  staticTag: "user-revoked-certificate-count",
  revalidate: 300,
});

export async function getRevokedCertificatesCount(
  refresh?: boolean,
): Promise<DocumentResponse> {
  try {
    const { databaseId, certificates } = getEnv();
    const { databases } = await createSessionClient();
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("No session");
    }

    const res = await fetchRevokedCertificateCount(
      databases,
      databaseId,
      certificates,
      user.$id,
      refresh,
    );
    if (!res) {
      throw new Error("Failed to fetch pending certificates");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to fetch pending certificates";

    return { ok: false, error: message };
  }
}

/* ----------------------------- GLOBAL METRICS ----------------------------- */

async function _fetchAllIssuedCertificates(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  _userId: string,
): Promise<DefaultDocument> {
  return await withRetry({
    fn: async () => {
      const result = await databases.listDocuments({
        databaseId,
        collectionId,
        queries: [Query.equal("status", "1")],
      });

      return result;
    },
  });
}

const fetchAllIssuedCertificates = withCache({
  fn: _fetchAllIssuedCertificates,
  staticTag: "global-issued-certificates-count",
  revalidate: 300,
});

export async function getAllIssuedCertificateCount(
  refresh?: boolean,
): Promise<DocumentResponse> {
  try {
    const { databaseId, certificates } = getEnv();
    const { databases } = await createAdminClient();
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("No session");
    }

    const res = await fetchAllIssuedCertificates(
      databases,
      databaseId,
      certificates,
      user.$id,
      refresh,
    );
    if (!res) {
      throw new Error("Failed to fetch issued certificates");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch issued certificate";

    return { ok: false, error: message };
  }
}
