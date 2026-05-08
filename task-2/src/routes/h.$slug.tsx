import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { ReportButton } from "@/components/report-button";

type Host = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logo_url: string | null;
  contact_email: string | null;
};
type EventLite = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  cover_url: string | null;
};

export const Route = createFileRoute("/h/$slug")({
  loader: async ({ params }) => {
    const { data: host } = await supabase.from("hosts").select("*").eq("slug", params.slug).maybeSingle();
    return { host: host as Host | null };
  },
  head: ({ loaderData }) => {
    const h = loaderData?.host;
    if (!h) return { meta: [{ title: "Host — Gather" }] };
    return {
      meta: [
        { title: `${h.name} — Gather` },
        { name: "description", content: (h.bio ?? `Events by ${h.name}.`).slice(0, 160) },
        { property: "og:title", content: h.name },
        { property: "og:description", content: (h.bio ?? `Events by ${h.name}.`).slice(0, 160) },
        ...(h.logo_url ? [{ property: "og:image", content: h.logo_url }] : []),
      ],
    };
  },
  component: HostPage,
});

function HostPage() {
  const { slug } = useParams({ from: "/h/$slug" });
  const { host } = Route.useLoaderData();
  const [events, setEvents] = useState<EventLite[]>([]);

  useEffect(() => {
    if (!host) return;
    supabase
      .from("events")
      .select("id, title, starts_at, ends_at, cover_url")
      .eq("host_id", host.id)
      .eq("status", "published")
      .eq("visibility", "public")
      .order("starts_at", { ascending: false })
      .then(({ data }) => setEvents((data as EventLite[]) ?? []));
  }, [host, slug]);

  if (!host) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-black">Host not found</h1>
      </div>
    );
  }

  const now = new Date();
  const upcoming = events.filter((e) => new Date(e.ends_at) >= now);
  const past = events.filter((e) => new Date(e.ends_at) < now);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center gap-4">
        {host.logo_url ? (
          <img src={host.logo_url} alt="" className="h-20 w-20 rounded-3xl object-cover shadow-soft" />
        ) : (
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-mustard text-primary-foreground font-display text-3xl font-bold shadow-soft">
            {host.name.charAt(0)}
          </span>
        )}
        <div>
          <h1 className="font-display text-4xl font-black">{host.name}</h1>
          <p className="text-sm text-muted-foreground">@{host.slug}</p>
          {host.bio && <p className="mt-2 max-w-prose text-muted-foreground">{host.bio}</p>}
        </div>
      </div>

      <Section title="Upcoming events" items={upcoming} />
      <Section title="Past events" items={past} />

      <div className="mt-10 flex justify-end border-t pt-4">
        <ReportButton subjectType="host" subjectId={host.id} label="Report host" />
      </div>
    </div>
  );
}

function Section({ title, items }: { title: string; items: EventLite[] }) {
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl font-bold">{title}</h2>
      {items.length === 0 ? (
        <Card className="mt-4 rounded-2xl border-dashed p-8 text-center text-muted-foreground shadow-soft">
          Nothing here yet.
        </Card>
      ) : (
        <div className="mt-4 grid gap-3">
          {items.map((e) => (
            <Link
              key={e.id}
              to="/e/$eventId"
              params={{ eventId: e.id }}
              className="group flex items-center gap-4 rounded-2xl border bg-card p-3 shadow-soft transition-shadow hover:shadow-pop"
            >
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-secondary">
                {e.cover_url ? (
                  <img src={e.cover_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/30 to-mustard/40" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display text-lg font-bold group-hover:text-primary">{e.title}</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(e.starts_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              {new Date(e.ends_at) < new Date() && <Badge variant="secondary">Ended</Badge>}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
