import { auth } from "@clerk/nextjs/server";
import Sidebar from "@/components/layout/Sidebar";
import BrandMark from "@/components/hub/BrandMark";
import PrivateAuthGate from "@/components/PrivateAuthGate";
import UserInitializer from "@/components/UserInitializer";
import WorkspaceOnboardingGate from "@/components/WorkspaceOnboardingGate";

// None of the ~20 Growth Hub components underneath here guard their
// useQuery calls against Clerk's client-side auth state — they assume
// they're only ever rendered while signed in. auth.protect() below only
// covers the initial server-rendered request; it does nothing once
// someone clicks "sign out" while already on one of these pages, since
// Clerk clears the client-side session (and Convex's auth token with it)
// before the resulting redirect finishes navigating away. Every one of
// those now-tokenless queries reacts instantly and throws "Not
// authenticated". PrivateAuthGate closes that for every current and
// future component in the tree in one place, instead of hand-guarding
// each one individually — see its own comment for why it has to be a
// separate client component rather than inlined here.
export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
    <PrivateAuthGate>
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
    </PrivateAuthGate>
  );
}
