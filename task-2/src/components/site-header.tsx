import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sparkles, Ticket, Compass, CalendarHeart, LogOut, User as UserIcon } from "lucide-react";

export function SiteHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { location } = useRouterState();

  async function handleSignOut() {
    await signOut();
    await router.navigate({ to: "/" });
    await router.invalidate();
  }

  const navLinks = [
    { to: "/explore", label: "Explore", icon: Compass },
    { to: "/tickets", label: "My Tickets", icon: Ticket },
    { to: "/my-events", label: "My Events", icon: CalendarHeart },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-gradient-to-br from-primary to-mustard text-primary-foreground shadow-soft">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">Gather</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = location.pathname.startsWith(l.to);
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="rounded-full">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-sage text-sage-foreground font-semibold">
                    {(user.email ?? "?").charAt(0).toUpperCase()}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/account">
                    <UserIcon className="mr-2 h-4 w-4" /> Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/tickets">
                    <Ticket className="mr-2 h-4 w-4" /> My Tickets
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">
                    <CalendarHeart className="mr-2 h-4 w-4" /> Host dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link to="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted-foreground">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-primary to-mustard text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-display text-lg font-bold text-foreground">Gather</span>
          </div>
          <p>Made for community organizers and the people who show up. ✨</p>
          <p>© {new Date().getFullYear()} Gather</p>
        </div>
      </div>
    </footer>
  );
}
