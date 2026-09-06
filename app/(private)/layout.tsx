import { auth } from "@clerk/nextjs/server";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Loader2 } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import BrandMark from "@/components/hub/BrandMark";
import UserInitializer from "@/components/UserInitializer";
import WorkspaceOnboardingGate from "@/components/WorkspaceOnboardingGate";

// None of the ~20 Growth Hub components underneath here guard their
// useQuery calls against Clerk's client-side auth state — they assume
// they're only ever rendered while signed in. auth.protect() above only
// covers the initial server-rendered request; it does nothing once
// someone clicks "sign out" while already on one of these pages, since
// Clerk clears the client-side session (and Convex's auth token with it)
// before the resulting redirect finishes navigating away. Every one of
// those now-tokenless queries reacts instantly and throws "Not
// authenticated" straight into the page. Authenticated/AuthLoading/
// Unauthenticated are driven by the exact same auth state
// ConvexProviderWithClerk uses to decide whether to attach a token at
// all, so gating the whole private tree on it closes every one of those
// call sites at once, in one place, instead of hand-guarding ~20 files.
function FullScreenLoading() {
  return (
    <div className="app-surface flex min-h-screen items-center justify-center">
      <Loader2 className="animate-spin text-[#3556d9]" size={28} />
    </div>
  );
}

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
    <>
      <AuthLoading>
        <FullScreenLoading />
      </AuthLoading>
      <Unauthenticated>
        <FullScreenLoading />
      </Unauthenticated>
      <Authenticated>
        <WorkspaceOnboardingGate>
          <div className="app-surface flex min-h-screen">
            <UserInitializer />
            <Sidebar />
            <main className="relative z-10 min-w-0 flex-1">
              <div className="border-b border-white/70 bg-white/55 px-5 py-4 backdrop-blur-xl md:hidden">
                <BrandMark />
              </div>
              <div className="mx-auto w-full max-w-[94rem] p-5 sm:p-8 lg:p-10">
                {children}
              </div>
            </main>
          </div>
        </WorkspaceOnboardingGate>
      </Authenticated>
    </>
  );
}
