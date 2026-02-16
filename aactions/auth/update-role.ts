"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { revalidateTag } from "next/cache";
import { VoidActionResponse } from "../shared/types";
import { withRetry } from "../shared/utils";
import { getLoggedInUser } from "./account.action";

const ROLE_LABELS = ["admin", "issuer", "user"];

export async function updateUserRole(
  userId: string,
  role: "admin" | "issuer" | "user",
): Promise<VoidActionResponse> {
  try {
    const { users } = await createAdminClient();
    const currentUser = await getLoggedInUser();
    if (!currentUser) {
      throw new Error("No session");
    }

    // 1. Fetch the current user details to get existing labels
    const user = await withRetry({
      fn: async () => await users.get({ userId }),
    });

    // 2. Filter out existing role labels
    const otherLabels = user.labels.filter(
      (label) => !ROLE_LABELS.includes(label),
    );

    // 3. Create the new list of labels including the new role
    const newLabels = [...otherLabels, role];

    // 4. Update the user's labels
    await withRetry({
      fn: async () => await users.updateLabels({ userId, labels: newLabels }),
    });

    revalidateTag("users");
    revalidateTag(`users-${currentUser.$id}`);

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update user role label";
    return { ok: false, error: message };
  }
}
