import { redirect } from "next/navigation";

export default async function ContentStudioTeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  redirect(`/growth/studio/${teamId}/posts`);
}
