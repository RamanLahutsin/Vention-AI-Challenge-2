import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMyMemberships, type Host } from "@/lib/hosts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Settings, ExternalLink, Copy as CopyIcon, EyeOff, Users, Flag, UsersRound } from "lucide-react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: "draft" | "published";
  visibility: "public" | "unlisted";
  capacity: number;
};

export const Route = createFileRoute("/dashboard/$hostId/")({
  component: HostDashboard,
});

function HostDashboard() {
  const { hostId } = useParams({ from: "/dashboard/$hostId/" });
  const { memberships } = useMyMemberships();
  const [host, setHost] = useState<Host | null>(null);
  const [events, setEvents] = useState<EventRow[] | null>(null);

  useEffect(() => {
    supabase.from("hosts").select("*").eq("id", hostId).maybeSingle().then(({ data }) => setHost(data as Host | null));
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, status, visibility, capacity")
      .eq("host_id", hostId)
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as EventRow[]) ?? []));
  }, [hostId]);

  const myRole = memberships.find((m) => m.host_id === hostId)?.role;
  const canManage = myRole === "host";

  async function duplicate(id: string) {
    const { data: src, error } = await supabase.from("events").select("*").eq("id", id).single();
    if (error || !src) return toast.error(error?.message ?? "Not found");
    const { data, error: insErr } = await supabase
      .from("events")
      .insert({
        host_id: src.host_id,
        title: `${src.title} (copy)`,
        description: src.description,
        starts_at: src.starts_at,
        ends_at: src.ends_at,
        timezone: src.timezone,
        venue: src.venue,
        online_url: src.online_url,
        capacity: src.capacity,
        cover_url: src.cover_url,
        visibility: src.visibility,
        is_paid: src.is_paid,
        status: "draft",
      })
      .select("id")
      .single();
    if (insErr) return toast.error(insErr.message);
    toast.success("Duplicated");
    if (data) window.location.assign(`/dashboard/${hostId}/events/${data.id}`);
  }

  async function togglePublish(id: string, current: "draft" | "published") {
    const next = current === "published" ? "draft" : "published";
    const { error } = await supabase.from("events").update({ status: next }).eq("id", id);
    if (error) return toast.error(error.message);
    setEvents((prev) => prev?.map((e) => (e.id === id ? { ...e, status: next } : e)) ?? null);
    toast.success(next === "published" ? "Published" : "Unpublished");
  }

  if (!host) {
    return <div className="mx-auto max-w-5xl px-4 py-12 text-muted-foreground">Loading…</div>;
  }

  const now = new Date();
  const upcoming = (events ?? []).filter((e) => new Date(e.ends_at) >= now);
  const past = (events ?? []).filter((e) => new Date(e.ends_at) < now);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-mustard text-primary-foreground font-display text-xl font-bold shadow-soft">
            {host.name.charAt(0)}
          </span>
          <div>
            <h1 className="font-display text-3xl font-black leading-tight">{host.name}</h1>
            <p className="text-sm text-muted-foreground">@{host.slug}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {memberships.length > 1 && (
            <Select
              value={hostId}
              onValueChange={(v) => window.location.assign(`/dashboard/${v}`)}
            >
              <SelectTrigger className="w-[200px] rounded-full">
                <SelectValue placeholder="Switch host" />
              </SelectTrigger>
              <SelectContent>
                {memberships.map((m) => (
                  <SelectItem key={m.host_id} value={m.host_id}>
                    {m.hosts.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/h/$slug" params={{ slug: host.slug }}>
              <ExternalLink className="mr-2 h-4 w-4" /> Public page
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/$hostId/reports" params={{ hostId }}>
              <Flag className="mr-2 h-4 w-4" /> Reports
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/dashboard/$hostId/members" params={{ hostId }}>
              <UsersRound className="mr-2 h-4 w-4" /> Team
            </Link>
          </Button>
          {canManage && (
            <Button asChild className="rounded-full">
              <Link to="/dashboard/$hostId/events/new" params={{ hostId }}>
                <Plus className="mr-2 h-4 w-4" /> New event
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Section title="Upcoming">
        <EventList items={upcoming} hostId={hostId} canManage={canManage} onDuplicate={duplicate} onToggle={togglePublish} />
      </Section>

      <Section title="Past">
        <EventList items={past} hostId={hostId} canManage={canManage} onDuplicate={duplicate} onToggle={togglePublish} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EventList({
  items,
  hostId,
  canManage,
  onDuplicate,
  onToggle,
}: {
  items: EventRow[];
  hostId: string;
  canManage: boolean;
  onDuplicate: (id: string) => void;
  onToggle: (id: string, status: "draft" | "published") => void;
}) {
  if (items.length === 0)
    return (
      <Card className="rounded-2xl border-dashed p-8 text-center text-muted-foreground shadow-soft">
        Nothing here yet.
      </Card>
    );
  return (
    <div className="grid gap-3">
      {items.map((e) => (
        <Card key={e.id} className="rounded-2xl border-border/70 p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to="/dashboard/$hostId/events/$eventId"
                  params={{ hostId, eventId: e.id }}
                  className="truncate font-display text-lg font-bold hover:underline"
                >
                  {e.title}
                </Link>
                <Badge variant={e.status === "published" ? "default" : "secondary"} className="capitalize">
                  {e.status}
                </Badge>
                {e.visibility === "unlisted" && (
                  <Badge variant="outline" className="gap-1">
                    <EyeOff className="h-3 w-3" /> Unlisted
                  </Badge>
                )}
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(e.starts_at).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
                {" · "}cap {e.capacity || "∞"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/e/$eventId" params={{ eventId: e.id }}>
                  View
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to="/dashboard/$hostId/events/$eventId/attendees" params={{ hostId, eventId: e.id }}>
                  <Users className="mr-1.5 h-4 w-4" /> Attendees
                </Link>
              </Button>
              {canManage && (
                <>
                  <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onDuplicate(e.id)}>
                    <CopyIcon className="mr-1.5 h-4 w-4" /> Duplicate
                  </Button>
                  <Button size="sm" variant="secondary" className="rounded-full" onClick={() => onToggle(e.id, e.status)}>
                    {e.status === "published" ? "Unpublish" : "Publish"}
                  </Button>
                  <Button asChild size="sm" className="rounded-full">
                    <Link to="/dashboard/$hostId/events/$eventId" params={{ hostId, eventId: e.id }}>
                      <Settings className="mr-1.5 h-4 w-4" /> Edit
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
