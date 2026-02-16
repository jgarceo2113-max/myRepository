"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { PreferenceResponse } from "../types";

// biome-ignore lint/suspicious/noExplicitAny: function accepts mixed types for user preferences
export async function updatePrefs(
  data: Record<string, any>,
): Promise<PreferenceResponse> {
  try {
    const { account } = await createSessionClient();
    const prefs = await account.getPrefs();

    await account.updatePrefs({ ...prefs, ...data });

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to update preference settings. Please try again";

    return { ok: false, error: message };
  }
}
