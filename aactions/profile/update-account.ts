"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { VoidActionResponse } from "../shared/types";

export async function updateAccounInfo(data: {
  fullName: string;
}): Promise<VoidActionResponse> {
  try {
    const { account } = await createSessionClient();
    await account.updateName({ name: data.fullName });

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update account info";
    return { ok: false, error: message };
  }
}
