// actions/users.ts
"use server";

import { createAdminClient } from "@/lib/server/appwrite";
import { type Users as AWUsers, Query } from "node-appwrite";
import { getLoggedInUser } from "../auth";
import type { Ordering, UserData, UserDataReponse } from "../shared/types";
import { withCache, withRetry } from "../shared/utils";

async function _fetchUsers(
  searchTerm: string | null,
  role: string,
  order: Ordering,
  sortBy: string,
  limit: number,
  page: number,
  usersService: AWUsers,
  currentUserId: string,
): Promise<UserData> {
  const offset = (page - 1) * limit;
  const queries: string[] = [
    Query.limit(limit),
    Query.offset(offset),
    Query.notEqual("$id", [currentUserId]),
    order === "asc" ? Query.orderAsc(sortBy) : Query.orderDesc(sortBy),
  ];

  // Handle ID search separately
  if (searchTerm?.match(/^[a-f0-9]{16,32}$/i)) {
    queries.push(Query.equal("$id", [searchTerm]));
  }

  if (role !== "any") {
    if (role !== "admin" && role !== "issuer" && role !== "user") {
      throw new Error("Role must be 'admin', 'issuer', 'user', or 'any'");
    }
    queries.push(Query.contains("labels", [role]));
  } else {
    queries.push(
      Query.or([
        Query.contains("labels", ["admin"]),
        Query.contains("labels", ["issuer"]),
        Query.contains("labels", ["user"]),
      ]),
    );
  }

  try {
    const result = await withRetry({
      fn: async () =>
        await usersService.list({
          queries,
          search:
            searchTerm && !searchTerm.match(/^[a-f0-9]{16,32}$/i)
              ? searchTerm
              : undefined,
        }),
    });

    const sanitizedItems = result.users.map((user) => ({
      $id: user.$id,
      name: user.name,
      email: user.email,
      role: user.labels.includes("admin")
        ? "admin"
        : user.labels.includes("issuer")
          ? "issuer"
          : "user",
      $createdAt: user.$createdAt,
      $updatedAt: user.$updatedAt,
      avatarId: user.prefs?.avatarFileId || "",
      isEmailVerified: user.emailVerification,
      isBlocked: !user.status,
    }));

    return {
      items: sanitizedItems,
      total: result.total,
      page,
      limit,
    };
  } catch (err: unknown) {
    throw err;
  }
}

const fetchUsers = withCache({
  fn: _fetchUsers,
  keyPartsGenerator: (
    searchTerm,
    role,
    order,
    sortBy,
    limit,
    page,
    _usersService,
    currentUserId,
  ) => [
    "users",
    currentUserId,
    searchTerm ? searchTerm : "",
    role.toString(),
    order,
    sortBy,
    limit.toString(),
    page.toString(),
  ],
  tagGenerator: (
    _searchTerm,
    _role,
    _order,
    _sortBy,
    _limit,
    _page,
    _usersService,
    currentUserId,
  ) => [`users-${currentUserId}`],
  staticTag: "users",
  revalidate: 120,
});

export async function getUsers(
  page: number,
  limit: number = 10,
  searchTerm: string | null = null,
  sortBy: string = "$createdAt",
  sortOrder: Ordering = "desc",
  role: string = "any",
): Promise<UserDataReponse> {
  try {
    if (!Number.isFinite(page) || page < 1) {
      throw new Error("Page must be a positive number");
    }

    if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
      throw new Error("Limit must be a number between 1 and 50");
    }

    if (sortOrder !== "asc" && sortOrder !== "desc") {
      throw new Error("order must be 'asc' or 'desc'");
    }

    if (typeof sortBy !== "string") {
      throw new Error("sortBy must be a string");
    }

    const { users } = await createAdminClient();
    const currentUser = await getLoggedInUser();
    if (!currentUser) {
      throw new Error("No session");
    }
    if (!currentUser.labels.includes("admin")) {
      throw new Error("Unauthorized: Admin access required");
    }

    const res = await fetchUsers(
      searchTerm,
      role,
      sortOrder,
      sortBy,
      limit,
      page,
      users,
      currentUser.$id,
    );

    if (!res) {
      throw new Error("Failed to fetch users");
    }
    return { ok: true, data: res };
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to fetch users";
    console.error("getUsers failed:", err);
    return { ok: false, error: errorMessage };
  }
}
