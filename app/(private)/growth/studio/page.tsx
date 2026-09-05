import { redirect } from "next/navigation";

// No team chosen yet — pick one from the sidebar's Content Studio switcher
// (Team & Access also works as a fallback entry point).
export default function ContentStudioPage() {
  redirect("/growth/team");
}
