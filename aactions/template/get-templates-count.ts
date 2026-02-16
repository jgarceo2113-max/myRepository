"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { Databases, Query } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import { DefaultDocument, DocumentResponse } from "../shared/types";
import { getEnv, withCache, withRetry } from "../shared/utils";

async function _fetchTemplatesCount(
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
        queries: [
          Query.equal("author", userId),
          // isDeleted is stored as boolean in Appwrite
          Query.notEqual("isDeleted", true),
        ],
      });

      return result;
    },
  });
}

const fetchTemplatesCount = withCache({
  fn: _fetchTemplatesCount,
  tagGenerator: (_databases, _databaseId, _collectionId, userId) => [
    `template-count-${userId}`,
  ],
  staticTag: "user-template-count",
  revalidate: 300,
});

export async function getTemplatesCount(
  refresh?: boolean,
): Promise<DocumentResponse> {
  try {
    const { databaseId, templates } = getEnv();
    const { databases } = await createSessionClient();
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("No session");
    }

    const res = await fetchTemplatesCount(
      databases,
      databaseId,
      templates,
      user.$id,
      refresh,
    );
    if (!res) {
      throw new Error("Failed to fetch template count");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch template count";
    return { ok: false, error: message };
  }
}
