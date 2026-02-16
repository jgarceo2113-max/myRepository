"use client";
import { UserRole } from "@/types";
import { notFound } from "next/navigation";
import { useUser } from "./user-provider";

const RoleProvider = ({
  role: prefferedRole,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) => {
  const { role } = useUser();

  if (role === prefferedRole) {
    return children;
  } else {
    notFound();
  }
};

export { RoleProvider };
