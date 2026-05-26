"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";

const RoleSchema = z.enum(["admin", "organizer", "participant"]);

export async function updateUserRole(userId: string, role: string) {
  const me = await requireRole("admin");

  if (userId === me.id) {
    throw new Error("you cannot change your own role");
  }

  const parsed = RoleSchema.parse(role);
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}

const QuotaSchema = z.coerce.number().int().min(0).max(1000);

export async function updateUserQuota(userId: string, quota: number | string) {
  await requireRole("admin");
  const parsed = QuotaSchema.parse(quota);
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ event_quota: parsed })
    .eq("id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/users");
}

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).max(50).optional(),
  role: RoleSchema.default("participant"),
  event_quota: z.coerce.number().int().min(0).max(1000).default(0),
});

export async function createUser(formData: FormData) {
  await requireRole("admin");

  const parsed = CreateUserSchema.parse({
    email: formData.get("email"),
    password: formData.get("password"),
    display_name: formData.get("display_name") || undefined,
    role: formData.get("role") || "participant",
    event_quota: formData.get("event_quota") || 0,
  });

  const admin = createAdminClient();

  // Create the auth user. handle_new_user trigger creates the profile row.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: parsed.password,
    email_confirm: true, // skip the confirmation email — admin is vouching
    user_metadata: parsed.display_name ? { display_name: parsed.display_name } : undefined,
  });
  if (createErr) throw new Error(createErr.message);
  if (!created.user) throw new Error("user not returned by createUser");

  // Then upgrade the profile if role / quota differ from defaults.
  if (parsed.role !== "participant" || parsed.event_quota > 0) {
    const { error: updErr } = await admin
      .from("profiles")
      .update({ role: parsed.role, event_quota: parsed.event_quota })
      .eq("id", created.user.id);
    if (updErr) throw new Error(updErr.message);
  }

  revalidatePath("/admin/users");
}

export async function deleteUser(userId: string) {
  const me = await requireRole("admin");
  if (userId === me.id) throw new Error("you cannot delete yourself");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/users");
}
