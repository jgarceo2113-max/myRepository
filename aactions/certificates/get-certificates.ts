"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { type Databases, Query } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import type {
  Certificate,
  CertificateData,
  CertificatResponse,
  Ordering,
} from "../shared/types";
import { getEnv, withCache, withRetry } from "../shared/utils";

async function _fetchCertificates(
  databaseId: string,
  collectionId: string,
  searchTerm: string | null,
  status: string,
  order: Ordering,
  sortBy: string,
  limit: number,
  page: number,
  databases: Databases,
  userId: string,
): Promise<CertificateData> {
  const queries: string[] = [
    Query.limit(limit),
    Query.offset((page - 1) * limit),
    Query.equal("issuer", userId),
    order === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
  ];

  if (searchTerm) {
    if (searchTerm.match(/^[a-f0-9]{16,32}$/i)) {
      queries.push(Query.equal("$id", [searchTerm]));
    } else {
      queries.push(Query.search("recipientFullName", searchTerm));
    }
  }

  if (status !== "any") {
    queries.push(Query.equal("status", status.toString()));
  }

  try {
    const result = await withRetry({
      fn: async () =>
        await databases.listDocuments(databaseId, collectionId, queries),
    });

    return {
      items: result.documents as unknown as Certificate[],
      total: result.total,
      page,
      limit,
    };
  } catch (err: unknown) {
    throw err;
  }
}

const fetchCertificates = withCache({
  fn: _fetchCertificates,
  keyPartsGenerator: (
    _databaseId,
    _collectionId,
    searchTerm,
    status,
    order,
    sortBy,
    limit,
    page,
    _databases,
    userId,
  ) => [
    "certificates",
    userId,
    searchTerm ? searchTerm : "",
    status.toString(),
    order,
    sortBy,
    limit.toString(),
    page.toString(),
  ],
  tagGenerator: (
    _databaseId,
    _collectionId,
    _searchTerm,
    _status,
    _order,
    _sortBy,
    _limit,
    _page,
    _databases,
    userId,
  ) => [`certificates-${userId}`],
  staticTag: "certificates",
  revalidate: 120,
});

export async function getCertificates(
  page: number,
  limit: number = 10, // Default to 10 to match API route
  searchTerm: string | null = null,
  sortBy: string = "$createdAt",
  sortOrder: Ordering = "desc",
  status: string = "any",
): Promise<CertificatResponse> {
  try {
    // 1. Validate page (checking for positive number)
    // NOTE: TypeScript types enforce 'number', but additional check
    // for non-finite numbers is a good practice for safety.
    if (!Number.isFinite(page) || page < 1) {
      throw new Error("Page must be a positive number");
    } // 2. Validate limit (checking for range 1-50)

    if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
      throw new Error("Limit must be a number between 1 and 50");
    } // 3. Validate sortOrder (matching API route's 'order' check)

    if (sortOrder !== "asc" && sortOrder !== "desc") {
      throw new Error("order must be 'asc' or 'desc'");
    } // 4. Validate sortBy

    if (typeof sortBy !== "string") {
      throw new Error("sortBy must be a string");
    }

    const { databases } = await createSessionClient();
    const { databaseId, certificates } = getEnv();
    const currentUser = await getLoggedInUser();
    if (!currentUser) {
      throw new Error("No session");
    }

    const res = await fetchCertificates(
      databaseId,
      certificates,
      searchTerm,
      status,
      sortOrder,
      sortBy,
      limit,
      page,
      databases,
      currentUser.$id,
    );

    if (!res) {
      throw new Error("Failed to fetch certificates");
    }
    return { ok: true, data: res };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch certificates";
    console.error("getCertificates failed:", err);
    return { ok: false, error: errorMessage };
  }
}
