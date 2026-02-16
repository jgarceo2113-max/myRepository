"use server";

import type { SignupFormData } from "@/features/auth/schema/signup-schema";
import { createAdminClient } from "@/lib/server/appwrite";
import { ID } from "node-appwrite";
import type { SignupResponse } from "../shared/types";

export async function signupWithEmail(
  data: SignupFormData,
): Promise<SignupResponse> {
  const { fullName, email, password } = data;
  try {
    const { account, users } = await createAdminClient();
    const user = await account.create({
      userId: ID.unique(),
      email,
      password,
      name: fullName,
    });

    await users.updateLabels({ userId: user.$id, labels: ["user"] });

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Sign up failed";
    return { ok: false, error: message };
  }
}
