"use server";

import { createFunctionClient } from "@/lib/server/appwrite";
import { ExecutionMethod } from "node-appwrite";
import {
  CPUResponse,
  MemoryResponse,
  SystemInfoResponse,
  SystemResponse,
  SystemStateResponse,
} from "../shared/types";
import { getEnv } from "../shared/utils";

// Function overloads for specific metric values
export async function getSystemMetrics(metric: "cpu"): Promise<CPUResponse>;
export async function getSystemMetrics(
  metric: "memory",
): Promise<MemoryResponse>;
export async function getSystemMetrics(
  metric: "system",
): Promise<SystemInfoResponse>;
export async function getSystemMetrics(
  metric: "all",
): Promise<SystemStateResponse>;
export async function getSystemMetrics(
  metric: "cpu" | "memory" | "system" | "all" = "all",
): Promise<SystemResponse> {
  try {
    const { functions } = await createFunctionClient();
    const { systemInfoFunc } = getEnv();
    const execution = await functions.createExecution({
      functionId: systemInfoFunc,
      body: JSON.stringify({ metric }),
      async: false,
      method: ExecutionMethod.POST,
    });

    const res = JSON.parse(execution.responseBody || "{}");
    if (!res) {
      throw new Error("Empty response");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch system info";
    return { ok: false, error: message };
  }
}
