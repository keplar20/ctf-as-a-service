import Link from "next/link";
import { Terminal } from "lucide-react";
import { getCurrentProfile } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export async function SiteHeader() {
  const profile = await getCurrentProfile();

  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Terminal className="h-5 w-5 text-primary" />
          <span className="text-primary">ctf</span>
          <span className="text-muted-foreground">@</span>
          <span>service</span>
          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-primary align-middle" aria-hidden />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {profile?.role === "admin" && (
            <Link href="/admin/challenges" className="hover:underline">Admin</Link>
          )}
          {(profile?.role === "organizer" || profile?.role === "admin") && (
            <Link href="/organizer" className="hover:underline">Organizer</Link>
          )}
          {profile && (
            <Link href="/play" className="hover:underline">Play</Link>
          )}
          {profile ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="text-muted-foreground hover:text-foreground hover:underline"
                title="Account settings"
              >
                {profile.display_name ?? profile.email}
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <>
              <Link href="/login" className="hover:underline">Sign in</Link>
              <Link href="/signup" className="hover:underline">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
