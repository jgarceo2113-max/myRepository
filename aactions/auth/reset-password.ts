"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { VoidActionResponse } from "../shared/types";
import { getEnv } from "../shared/utils";

export async function sendPasswordReset(
  email: string,
): Promise<VoidActionResponse> {
  try {
    const { baseUrl: BASE_URL } = getEnv();

    const { account } = await createAdminClient();
    await account.createRecovery({ email, url: `${BASE_URL}/reset` });

    return { ok: true };
  } catch (err: any) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to send password reset link.";
    return { ok: false, error: message };
  }
}

export async function resetUserPassword(
  userId: string,
  secret: string,
  password: string,
): Promise<VoidActionResponse> {
  try {
    const { account } = await createAdminClient();
    await account.updateRecovery({ userId, secret, password });
    return { ok: true };
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "Failed to reset password.";

    if (message.includes("Invalid token")) {
      return {
        ok: false,
        error: "This recovery link has already been used or is invalid.",
      };
    }

    return { ok: false, error: message };
  }
}
