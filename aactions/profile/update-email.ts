"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { AppwriteException } from "node-appwrite";
import { VoidActionResponse } from "../shared/types";

export async function updateAccountEmail(
  newEmail: string,
  password: string,
): Promise<VoidActionResponse> {
  try {
    const { account } = await createSessionClient();
    await account.updateEmail({ email: newEmail, password });

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof AppwriteException &&
      err.type === "user_invalid_credentials"
        ? "The current password provided didn't verify your identity, please enter current password"
        : err instanceof Error
          ? err.message
          : "Failed to update email address";

    return { ok: false, error: message };
  }
}
