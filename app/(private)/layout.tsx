import { auth } from "@clerk/nextjs/server";
import Sidebar from "@/components/layout/Sidebar";
import BrandMark from "@/components/hub/BrandMark";
import UserInitializer from "@/components/UserInitializer";
import WorkspaceOnboardingGate from "@/components/WorkspaceOnboardingGate";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await auth.protect();

  return (
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
  );
}
