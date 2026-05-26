"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { CATEGORIES, DIFFICULTIES, TYPES } from "@/lib/types";

const ChallengeSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(CATEGORIES as [string, ...string[]]),
  difficulty: z.enum(DIFFICULTIES as [string, ...string[]]),
  type: z.enum(TYPES as [string, ...string[]]),
  points: z.coerce.number().int().min(0),
  flag: z.string().min(1),
  file_url: z.string().url().nullable().optional(),
  image: z.string().min(1).nullable().optional(),
  container_port: z.coerce.number().int().min(1).max(65535).nullable().optional(),
  is_active: z.boolean().optional(),
});

export async function createChallenge(formData: FormData) {
  await requireRole("admin");
  const supabase = createClient();

  const title = String(formData.get("title") ?? "");
  const parsed = ChallengeSchema.parse({
    title,
    slug: String(formData.get("slug") || slugify(title)),
    description: formData.get("description"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty"),
    type: formData.get("type") || "static",
    points: formData.get("points"),
    flag: formData.get("flag"),
    file_url: formData.get("file_url") ? String(formData.get("file_url")) : null,
    image: formData.get("image") ? String(formData.get("image")) : null,
    container_port: formData.get("container_port") ? String(formData.get("container_port")) : null,
    is_active: formData.get("is_active") === "on",
  });

  const { data, error } = await supabase
    .from("challenges")
    .insert(parsed)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/challenges");
  redirect(`/admin/challenges/${data!.id}`);
}

export async function updateChallenge(id: string, formData: FormData) {
  await requireRole("admin");
  const supabase = createClient();

  const parsed = ChallengeSchema.parse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    category: formData.get("category"),
    difficulty: formData.get("difficulty"),
    type: formData.get("type") || "static",
    points: formData.get("points"),
    flag: formData.get("flag"),
    file_url: formData.get("file_url") ? String(formData.get("file_url")) : null,
    image: formData.get("image") ? String(formData.get("image")) : null,
    container_port: formData.get("container_port") ? String(formData.get("container_port")) : null,
    is_active: formData.get("is_active") === "on",
  });

  const { error } = await supabase.from("challenges").update(parsed).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/challenges");
  revalidatePath(`/admin/challenges/${id}`);
}

export async function togglePublish(id: string, next: boolean) {
  await requireRole("admin");
  const supabase = createClient();
  const { error } = await supabase.from("challenges").update({ is_active: next }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/challenges");
}

export async function deleteChallenge(id: string) {
  await requireRole("admin");
  const supabase = createClient();
  const { error } = await supabase.from("challenges").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/challenges");
}
