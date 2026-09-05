import { redirect } from "next/navigation";

// Direct hit with no team/view segment — default to the whole workspace,
// same as the sidebar's default Content Studio view.
export default function ContentStudioPage() {
  redirect("/growth/studio/workspace/posts");
}
