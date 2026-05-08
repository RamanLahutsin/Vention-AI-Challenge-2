import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useMyMemberships } from "@/lib/hosts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarHeart, Plus, Calendar } from "lucide-react";

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published";
  host_id: string;
  hosts: { name: string; slug: string };
};

export const Route = createFileRoute("/my-events")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/sign-in", search: { redirect: "/my-events" } });
  },
  head: () => ({ meta: [{ title: "My events — Gather" }] }),
  component: MyEvents,
});

function MyEvents() {
  const { user } = useAuth();
  const { memberships, loading } = useMyMemberships();
  const [events, setEvents] = useState<Row[]>([]);

  useEffect(() => {
    if (!user || memberships.length === 0) {
      setEvents([]);
      return;
    }
    const ids = memberships.map((m) => m.host_id);
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, status, host_id, hosts(name, slug)")
      .in("host_id", ids)
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as unknown as Row[]) ?? []));
  }, [user, memberships]);

  if (loading) {
    return <div className="mx-auto max-w-4xl px-4 py-12 text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-mustard text-mustard-foreground">
            <CalendarHeart className="h-5 w-5" />
          </span>
          <h1 className="font-display text-4xl font-black">My events</h1>
        </div>
        {memberships.length === 0 ? (
          <Button asChild className="rounded-full">
            <Link to="/become-host">
              <Plus className="mr-2 h-4 w-4" /> Become a host
            </Link>
          </Button>
        ) : (
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard">Open dashboard</Link>
          </Button>
        )}
      </div>

      {memberships.length === 0 ? (
        <Card className="mt-8 rounded-3xl border-dashed p-12 text-center text-muted-foreground shadow-soft">
          You don't host or help check in any events yet. Become a host to get started.
        </Card>
      ) : events.length === 0 ? (
        <Card className="mt-8 rounded-3xl border-dashed p-12 text-center text-muted-foreground shadow-soft">
          You're a member of {memberships.length} host{memberships.length === 1 ? "" : "s"} but no events have been
          created yet.
        </Card>
      ) : (
        <div className="mt-8 grid gap-3">
          {events.map((e) => (
            <Card key={e.id} className="rounded-2xl border-border/70 p-4 shadow-soft">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link to="/e/$eventId" params={{ eventId: e.id }} className="truncate font-display text-lg font-bold hover:underline">
                    {e.title}
                  </Link>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(e.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    {" · "}by {e.hosts.name}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={e.status === "published" ? "default" : "secondary"} className="capitalize">
                    {e.status}
                  </Badge>
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link to="/dashboard/$hostId/events/$eventId" params={{ hostId: e.host_id, eventId: e.id }}>
                      Manage
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
