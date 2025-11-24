// components/Providers.tsx
"use client";
import React from "react";
import { SessionProvider } from "next-auth/react";
import { UserProvider } from "./UserProvider";

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: any;
}) {
  return (
    <SessionProvider session={session}>
      <UserProvider>{children}</UserProvider>
    </SessionProvider>
  );
}
