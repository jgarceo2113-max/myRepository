"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { AppwriteException } from "node-appwrite";
import { VoidActionResponse } from "../shared/types";

export async function updateAccountPassword(
  currentPassword: string,
  newPassword: string,
): Promise<VoidActionResponse> {
  try {
    const { account } = await createSessionClient();
    await account.updatePassword({
      password: newPassword,
      oldPassword: currentPassword,
    });

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof AppwriteException &&
      err.type === "user_invalid_credentials"
        ? "The current password didn't verify your identity. Please check your current password"
        : err instanceof Error
          ? err.message
          : "Failed to update email address";
    return { ok: false, error: message };
  }
}
