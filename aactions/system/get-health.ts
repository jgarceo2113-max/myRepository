"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { HealthResponse } from "../shared/types";

export async function getHealth(): Promise<HealthResponse> {
  try {
    const { health } = await createAdminClient();
    const result = await health.get();

    return {
      ok: true,
      data: {
        health: result.status === "pass" ? "online" : "offline",
        timestamp: new Date(),
        ping: result.ping,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to fetch system health and status";
    throw new Error(message);
  }
}
