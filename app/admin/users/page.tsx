import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "./role-select";
import { QuotaInput } from "./quota-input";
import { CreateUserForm } from "./create-user-form";
import { DeleteUserButton } from "./delete-user-button";
import { formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const me = await requireRole("admin");
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });
  const users = (data ?? []) as Profile[];

  // Per-organizer event count, to show "X/Y used" beside the quota field.
  const { data: eventCountRows } = await supabase
    .from("events")
    .select("organizer_id");
  const eventCount = new Map<string, number>();
  for (const r of eventCountRows ?? []) {
    const id = (r as { organizer_id: string }).organizer_id;
    eventCount.set(id, (eventCount.get(id) ?? 0) + 1);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          {users.length} {users.length === 1 ? "account" : "accounts"} — create, promote, or remove users here.
        </p>
      </div>

      <CreateUserForm />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Display name</th>
                <th className="px-4 py-2">Joined</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Event quota</th>
                <th className="px-4 py-2 w-px"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me.id;
                const used = eventCount.get(u.id) ?? 0;
                return (
                  <tr key={u.id} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-2 font-mono">{u.email}</td>
                    <td className="px-4 py-2">{u.display_name ?? "—"}</td>
                    <td className="px-4 py-2 text-muted-foreground">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-2">
                      {isSelf ? (
                        <Badge variant="secondary">{u.role} (you)</Badge>
                      ) : (
                        <RoleSelect userId={u.id} currentRole={u.role} />
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {u.role === "admin" ? (
                        <span className="text-xs text-muted-foreground">unlimited</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <QuotaInput userId={u.id} initial={u.event_quota} />
                          <span className="text-xs text-muted-foreground">
                            {used} used
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {!isSelf && <DeleteUserButton userId={u.id} email={u.email} />}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
