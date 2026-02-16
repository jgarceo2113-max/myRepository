"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { revalidateTag } from "next/cache";
import { VoidActionResponse } from "../shared/types";
import { withRetry } from "../shared/utils";
import { getLoggedInUser } from "./account.action";

export async function updateUserStaus(
  userId: string,
  status: boolean,
): Promise<VoidActionResponse> {
  try {
    const { users } = await createAdminClient();
    const currentUser = await getLoggedInUser();
    if (!currentUser) {
      throw new Error("No session");
    }

    withRetry({
      fn: async () => await users.updateStatus({ userId, status }),
    });

    if (!status) {
      await withRetry({
        fn: async () => await users.deleteSessions({ userId }),
      });
    }

    revalidateTag(`users-${currentUser.$id}`);
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update user status";
    return { ok: false, error: message };
  }
}
