"use server";

import { createSessionClient } from "@/lib/server/appwrite";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { LogoutResponse } from "../shared/types";
import { getEnv } from "../shared/utils";
import { getLoggedInUser } from "./account.action";

export async function logOut(): Promise<LogoutResponse> {
  try {
    const { cookie: COOKIE_NAME } = getEnv();

    const { account } = await createSessionClient();
    const currentUser = await getLoggedInUser();
    if (currentUser) {
      revalidatePath(`user-templates-${currentUser.$id}`);
    }

    (await cookies()).delete(COOKIE_NAME);
    await account.deleteSession({ sessionId: "current" });

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Log out failed";
    return { ok: false, error: message };
  }
}

export async function logoutSession(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const { account } = await createSessionClient();
  await Promise.all(ids.map((id) => account.deleteSession({ sessionId: id })));
}
