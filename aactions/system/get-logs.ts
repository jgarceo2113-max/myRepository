"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { Query } from "node-appwrite";
import { SystemLogs, SystemLogsResponse } from "../shared/types";
import { getEnv } from "../shared/utils";

export async function getLogs(
  page: number,
  limit: number,
  sortBy: string,
  sortOrder: "asc" | "desc",
): Promise<SystemLogsResponse> {
  try {
    const { logsDb, logs } = getEnv();
    const { databases } = await createSessionClient();

    const queries = [
      Query.limit(limit),
      Query.offset((page - 1) * limit),
      sortOrder === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
    ];

    const res: SystemLogs = await databases.listDocuments(
      logsDb,
      logs,
      queries,
    );

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch logs";
    return { ok: false, error: message };
  }
}
