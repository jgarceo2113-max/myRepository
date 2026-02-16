"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { Databases } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import { DefaultDocument, DocumentResponse } from "../shared/types";
import { getEnv, withCache, withRetry } from "../shared/utils";

async function _fetchAllTemplates(
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
      });

      return result;
    },
  });
}

const fetchAllTemplates = withCache({
  fn: _fetchAllTemplates,
  staticTag: "global-templates-count",
  revalidate: 300,
});

export async function getAllTemplatesCount(
  refresh?: boolean,
): Promise<DocumentResponse> {
  try {
    const { databaseId, templates } = getEnv();
    const { databases } = await createAdminClient();
    const user = await getLoggedInUser();
    if (!user) {
      throw new Error("No session");
    }

    const res = await fetchAllTemplates(
      databases,
      databaseId,
      templates,
      user.$id,
      refresh,
    );
    if (!res) {
      throw new Error("Failed to fetch active templates");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch active templates";

    return { ok: false, error: message };
  }
}
