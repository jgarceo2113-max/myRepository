"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { Query, type Databases } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import type {
  ErrorResponse,
  SuccessResponse,
  Template,
  TemplatesResponse,
} from "../shared/types";
import { getEnv, withCache } from "../shared/utils";

interface FetchTemplateProps {
  userId: string;
  databaseId: string;
  collectionId: string;
  limit: number;
  offset: number;
  searchTerm?: string;
  databases: Databases;
}

const _fetchUserTemplates = async ({
  userId,
  databaseId,
  collectionId,
  limit,
  offset,
  searchTerm,
  databases,
}: FetchTemplateProps): Promise<
  | SuccessResponse<Omit<TemplatesResponse, "page" | "hasNextPage">>
  | ErrorResponse
> => {
  try {
    const queries: string[] = [
      Query.equal("author", userId),
      Query.notEqual("isDeleted", true),
      Query.limit(limit),
      Query.offset(offset),
    ];

    if (searchTerm) {
      queries.push(Query.search("name", searchTerm));
    }

    const result = await databases.listDocuments({
      databaseId,
      collectionId,
      queries,
    });

    const templatesData: Template[] = result.documents.map((row) => ({
      id: row.$id,
      name: row.name,
      preview: row.coverFileId,
      json: row.jsonFileId,
      meta: {
        author: row.author,
        date_created: row.$createdAt,
        date_modified: row.$updatedAt,
        isPortrait: row.isPortrait,
        size: {
          w: row.width,
          h: row.height,
          paper: row.paper,
        },
      },
    }));

    const totalPages = Math.ceil(result.total / limit);

    return {
      ok: true,
      data: { templates: templatesData, total: result.total, totalPages },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch template";
    return { ok: false, error: message };
  }
};

const fetchUserTemplates = withCache({
  fn: _fetchUserTemplates,
  keyPartsGenerator: ({
    userId,
    collectionId,
    limit,
    offset,
    searchTerm,
  }: FetchTemplateProps) => [
    "user-templates",
    userId,
    collectionId,
    limit.toString(),
    offset.toString(),
    searchTerm || "",
  ],
  tagGenerator: ({ userId }) => [`user-templates-${userId}`],
  staticTag: "user-templates",
  revalidate: 300,
});

export async function getUserTemplates(
  searchTerm: string = "",
  page: number = 1,
  limit: number = 10,
  refresh: boolean = false,
): Promise<SuccessResponse<TemplatesResponse> | ErrorResponse> {
  try {
    const { databaseId, templates } = getEnv();
    const { databases } = await createSessionClient();

    const currentUser = await getLoggedInUser();
    if (!currentUser) {
      throw new Error("No session");
    }

    const offset = (page - 1) * limit;
    const res = await fetchUserTemplates(
      {
        userId: currentUser.$id,
        databaseId,
        collectionId: templates,
        limit,
        offset,
        databases,
        searchTerm,
      },
      refresh,
    );

    if (!res.ok) {
      throw new Error(res.error);
    } else {
      const { templates, total, totalPages } = res.data;

      return {
        ok: true,
        data: {
          templates,
          total,
          page,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
        },
      };
    }
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch templates";
    return { ok: false, error: message };
  }
}
