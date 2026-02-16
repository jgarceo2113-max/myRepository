"use server";

import type { LoginFormData } from "@/features/auth/schema/login-schema";
import { createAdminClient } from "@/lib/server/appwrite";
import { cookies } from "next/headers";
import type { LoginResponse } from "../shared/types";
import { getEnv } from "../shared/utils/validation";

export async function loginWithEmail(
  data: LoginFormData,
): Promise<LoginResponse> {
  try {
    const { cookie: COOKIE_NAME } = getEnv();
    const { email, password, rememberMe } = data;

    const { account: adminAccount } = await createAdminClient();

    const session = await adminAccount.createEmailPasswordSession({
      email,
      password,
    });

    // Set session cookie expiration (30 days)
    (await cookies()).set(COOKIE_NAME, session.secret, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: rememberMe ? 60 * 60 * 24 * 30 : undefined,
    });

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return { ok: false, error: message };
  }
}
