"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { Users } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import { UsersList, UsersResponse } from "../shared/types";
import { withCache, withRetry } from "../shared/utils";

async function _fetchAllUser(
  users: Users,
  _userId: string,
): Promise<UsersList> {
  return await withRetry({
    fn: async () => {
      const allUsers = await users.list();
      return allUsers;
    },
  });
}

const fetchAllUser = withCache({
  fn: _fetchAllUser,
  staticTag: "global-users-count",
  revalidate: 300,
});

export async function getAllUsersCount(
  refresh?: boolean,
): Promise<UsersResponse> {
  try {
    const currentUser = await getLoggedInUser();
    if (!currentUser) {
      throw new Error("No session");
    }

    const { users } = await createAdminClient();

    const res = await fetchAllUser(users, currentUser.$id, refresh);
    if (!res) {
      throw new Error("Failed to fetch all users");
    }

    return { ok: true, data: res };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch all users";
    return { ok: false, error: message };
  }
}
