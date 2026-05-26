import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: async () => (await cookies()).getAll(),
        setAll: async (toSet: CookieToSet[]) => {
          try {
            const store = await cookies();
            toSet.forEach(({ name, value, options }) =>
              store.set(name, value, options)
            );
          } catch {
            // called from a Server Component — middleware will refresh cookies
          }
        },
      },
    }
  );
}
