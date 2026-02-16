"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import type { VoidActionResponse } from "../shared/types";
import { getEnv } from "../shared/utils";

export async function sendVerificationEmail(): Promise<VoidActionResponse> {
  try {
    const { baseUrl: BASE_URL } = getEnv();

    const { account } = await createSessionClient();
    await account.createVerification({
      url: `${BASE_URL}/verify`,
    });

    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send verification email";
    return { ok: false, error: message };
  }
}

export async function verifyEmail(
  userId: string,
  secret: string,
): Promise<VoidActionResponse> {
  try {
    const { account } = await createSessionClient();
    const res = await account.updateVerification({ userId, secret });
    if (!res) {
      throw new Error();
    }
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify email";
    return { ok: false, error: message };
  }
}
