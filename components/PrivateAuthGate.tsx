"use client";

import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Loader2 } from "lucide-react";

// Isolated into its own client component rather than used directly inside
// the (private) layout (a Server Component, since it calls
// @clerk/nextjs/server's auth.protect()) — importing convex/react's
// context-consuming helpers straight into a server module trips Next's
// "createContext only works in Client Components" boundary check, even
// though the intent (gate children on client-side auth state) is fine.
function FullScreenLoading() {
  return (
    <div className="app-surface flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-[#3556d9]" size={28} />
    </div>
  );
}

export default function PrivateAuthGate({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AuthLoading>
        <FullScreenLoading />
      </AuthLoading>
      <Unauthenticated>
        <FullScreenLoading />
      </Unauthenticated>
      <Authenticated>{children}</Authenticated>
    </>
  );
}
