"use server";
import { createSessionClient } from "@/lib/server/appwrite";
import { withRetry } from "../shared/utils";

export async function getLoggedInUser() {
  try {
    return await withRetry({
      fn: async () => {
        const { account } = await createSessionClient();
        return await account.get();
      },
    });
  } catch {
    return null;
  }
}
