import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("admin");
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/challenges" className="hover:underline">Challenges</Link>
          <Link href="/admin/users" className="hover:underline">Users</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
