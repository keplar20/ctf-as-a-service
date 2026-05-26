"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

const ProfileSchema = z.object({
  display_name: z.string().min(1).max(50),
});

export async function updateDisplayName(formData: FormData) {
  const me = await requireProfile();
  const parsed = ProfileSchema.parse({ display_name: formData.get("display_name") });

  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: parsed.display_name })
    .eq("id", me.id);
  if (error) throw new Error(error.message);

  revalidatePath("/account");
}
