import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Compass, Search, MapPin } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type Row = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  cover_url: string | null;
  venue: string | null;
  hosts: { name: string; slug: string };
};

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore events — Gather" },
      { name: "description", content: "Browse upcoming community events." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const [events, setEvents] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [location, setLocation] = useState("");
  const [includePast, setIncludePast] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, cover_url, venue, hosts(name, slug)")
      .eq("status", "published")
      .eq("visibility", "public")
      .order("starts_at", { ascending: true })
      .limit(200)
      .then(({ data }) => {
        setEvents((data as unknown as Row[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (!includePast && new Date(e.ends_at) < now) return false;
      if (q && !`${e.title} ${e.hosts?.name ?? ""}`.toLowerCase().includes(q.toLowerCase())) return false;
      if (location && !(e.venue ?? "").toLowerCase().includes(location.toLowerCase())) return false;
      return true;
    });
  }, [events, q, location, includePast]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-accent-foreground">
          <Compass className="h-5 w-5" />
        </span>
        <h1 className="font-display text-4xl font-black">Explore</h1>
      </div>

      <Card className="mt-6 rounded-3xl border-border/70 p-4 shadow-soft">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search events or hosts" className="pl-9" />
          </div>
          <div className="relative">
            <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location"
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 px-2">
            <Switch id="past" checked={includePast} onCheckedChange={setIncludePast} />
            <Label htmlFor="past" className="cursor-pointer text-sm">
              Include past
            </Label>
          </div>
        </div>
      </Card>

      <div className="mt-6">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden rounded-3xl border shadow-soft">
                <Skeleton className="aspect-[16/9] w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl border-dashed p-12 text-center text-muted-foreground shadow-soft">
            <p className="font-display text-2xl">No events match 🌱</p>
            <p className="mt-2">Try a different search, or come back soon.</p>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((e) => {
              const ended = new Date(e.ends_at) < new Date();
              return (
                <Link
                  key={e.id}
                  to="/e/$eventId"
                  params={{ eventId: e.id }}
                  className="group overflow-hidden rounded-3xl border bg-card shadow-soft transition-shadow hover:shadow-pop"
                >
                  <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
                    {e.cover_url ? (
                      <img src={e.cover_url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/30 to-mustard/40" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2">
                      {ended && <Badge variant="secondary">Ended</Badge>}
                      <span className="text-xs text-muted-foreground">by {e.hosts?.name}</span>
                    </div>
                    <h3 className="mt-2 font-display text-xl font-bold leading-tight group-hover:text-primary">
                      {e.title}
                    </h3>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(e.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                    {e.venue && (
                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" /> {e.venue}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
