import { requireRole } from "@/lib/auth";

export default async function OrganizerLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["organizer", "admin"]);
  return <div className="space-y-6">{children}</div>;
}
