import { redirect } from "next/navigation";
import { hasSession } from "@/lib/require-session";
import { NoteShell } from "@/components/note-shell";

export default async function HomePage() {
  if (!(await hasSession())) {
    redirect("/login");
  }
  return <NoteShell />;
}
