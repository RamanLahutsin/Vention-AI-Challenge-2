import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, MapPin, Users, Globe2, EyeOff, Ticket, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ReportButton } from "@/components/report-button";
import { EventFeedback } from "@/components/event-feedback";
import { EventGallery } from "@/components/event-gallery";

type EventFull = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  venue: string | null;
  online_url: string | null;
  capacity: number;
  cover_url: string | null;
  visibility: "public" | "unlisted";
  status: "draft" | "published";
  hosts: { name: string; slug: string; logo_url: string | null };
};

type MyRsvp = { id: string; status: "going" | "waitlist" | "cancelled"; code: string } | null;

export const Route = createFileRoute("/e/$eventId")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("events")
      .select("*, hosts(name, slug, logo_url)")
      .eq("id", params.eventId)
      .maybeSingle();
    return { event: (data as EventFull | null) ?? null };
  },
  head: ({ loaderData }) => {
    const e = loaderData?.event;
    if (!e) return { meta: [{ title: "Event — Gather" }] };
    const desc = (e.description ?? "").slice(0, 160);
    return {
      meta: [
        { title: `${e.title} — Gather` },
        { name: "description", content: desc },
        { property: "og:title", content: e.title },
        { property: "og:description", content: desc },
        ...(e.cover_url ? [{ property: "og:image", content: e.cover_url }] : []),
        { property: "og:type", content: "website" },
      ],
    };
  },
  component: EventPage,
});

function EventPage() {
  const { eventId } = useParams({ from: "/e/$eventId" });
  const { event } = Route.useLoaderData();
  const { user } = useAuth();
  const [counts, setCounts] = useState<{ going: number; waitlist: number }>({ going: 0, waitlist: 0 });
  const [myRsvp, setMyRsvp] = useState<MyRsvp>(null);
  const [busy, setBusy] = useState(false);
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    if (!user || !event) { setIsHost(false); return; }
    supabase
      .from("host_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("host_id", event.host_id)
      .maybeSingle()
      .then(({ data }) => setIsHost(!!data));
  }, [user, event]);

  const refresh = useCallback(async () => {
    const { data: c } = await supabase.rpc("event_rsvp_counts", { _event_id: eventId });
    if (c && c[0]) setCounts({ going: c[0].going ?? 0, waitlist: c[0].waitlist ?? 0 });
    if (user) {
      const { data: r } = await supabase
        .from("rsvps")
        .select("id, status, code")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .maybeSingle();
      setMyRsvp((r as MyRsvp) ?? null);
    } else {
      setMyRsvp(null);
    }
  }, [eventId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!event) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-black">Event not found</h1>
        <p className="mt-2 text-muted-foreground">It may be unpublished or the link is wrong.</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/explore">Browse events</Link>
        </Button>
      </div>
    );
  }

  const ended = new Date(event.ends_at) < new Date();
  const fmt = new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: event.timezone,
  });
  const isFull = event.capacity > 0 && counts.going >= event.capacity;

  async function handleRsvp() {
    if (!user) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("rsvp_to_event", { _event_id: eventId });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data) {
      const status = (data as { status: string }).status;
      toast.success(status === "waitlist" ? "Added to waitlist" : "You're going!");
    }
    refresh();
  }

  async function handleCancel() {
    setBusy(true);
    const { error } = await supabase.rpc("cancel_rsvp", { _event_id: eventId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("RSVP cancelled");
    refresh();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description ?? undefined,
    startDate: event.starts_at,
    endDate: event.ends_at,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: event.online_url
      ? "https://schema.org/OnlineEventAttendanceMode"
      : "https://schema.org/OfflineEventAttendanceMode",
    location: event.online_url
      ? { "@type": "VirtualLocation", url: event.online_url }
      : event.venue
      ? { "@type": "Place", name: event.venue }
      : undefined,
    image: event.cover_url ?? undefined,
    organizer: { "@type": "Organization", name: event.hosts.name },
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Card className="overflow-hidden rounded-3xl border-border/70 shadow-soft">
        <div className="relative aspect-[3/1] w-full bg-secondary">
          {event.cover_url ? (
            <img src={event.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-primary/20 to-mustard/30" />
          )}
        </div>

        <div className="p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            {ended && <Badge variant="secondary">Ended</Badge>}
            {event.visibility === "unlisted" && (
              <Badge variant="outline" className="gap-1">
                <EyeOff className="h-3 w-3" /> Unlisted
              </Badge>
            )}
            {!ended && isFull && <Badge variant="outline">Full · waitlist open</Badge>}
          </div>
          <h1 className="mt-3 font-display text-4xl font-black leading-tight md:text-5xl">{event.title}</h1>

          <Link
            to="/h/$slug"
            params={{ slug: event.hosts.slug }}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium hover:bg-accent"
          >
            {event.hosts.logo_url ? (
              <img src={event.hosts.logo_url} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {event.hosts.name.charAt(0)}
              </span>
            )}
            <span>by {event.hosts.name}</span>
          </Link>

          <div className="mt-6 grid gap-3 text-sm">
            <Row icon={<Calendar className="h-4 w-4" />}>
              <div>
                <p className="font-medium text-foreground">{fmt.format(new Date(event.starts_at))}</p>
                <p className="text-muted-foreground">
                  Until {fmt.format(new Date(event.ends_at))} · {event.timezone}
                </p>
              </div>
            </Row>
            {event.venue && (
              <Row icon={<MapPin className="h-4 w-4" />}>
                <span>{event.venue}</span>
              </Row>
            )}
            {event.online_url && (
              <Row icon={<Globe2 className="h-4 w-4" />}>
                <a href={event.online_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {event.online_url}
                </a>
              </Row>
            )}
            <Row icon={<Users className="h-4 w-4" />}>
              <span>
                {counts.going} going{event.capacity > 0 ? ` / ${event.capacity}` : ""}
                {counts.waitlist > 0 ? ` · ${counts.waitlist} on waitlist` : ""}
              </span>
            </Row>
          </div>

          {event.description && (
            <div className="prose prose-sm mt-8 max-w-none whitespace-pre-wrap text-foreground/90">
              {event.description}
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ended ? (
              <Badge variant="secondary" className="rounded-full px-4 py-2 text-sm">
                This event has ended
              </Badge>
            ) : !user ? (
              <Button asChild size="lg" className="rounded-full px-6">
                <Link to="/sign-in" search={{ redirect: `/e/${event.id}` }}>
                  <Ticket className="mr-2 h-4 w-4" /> Sign in to RSVP
                </Link>
              </Button>
            ) : myRsvp ? (
              <>
                <Badge className="rounded-full px-4 py-2 text-sm" variant={myRsvp.status === "going" ? "default" : "secondary"}>
                  {myRsvp.status === "going" ? "✓ You're going" : "On waitlist"}
                </Badge>
                <Button asChild variant="outline" size="lg" className="rounded-full">
                  <Link to="/tickets">View ticket</Link>
                </Button>
                <Button onClick={handleCancel} disabled={busy} variant="ghost" size="lg" className="rounded-full">
                  <X className="mr-2 h-4 w-4" /> Cancel RSVP
                </Button>
              </>
            ) : (
              <Button onClick={handleRsvp} disabled={busy} size="lg" className="rounded-full px-6">
                <Ticket className="mr-2 h-4 w-4" /> {isFull ? "Join waitlist" : "RSVP — I'll be there"}
              </Button>
            )}
          </div>

          <div className="mt-10">
            <EventFeedback eventId={event.id} isHost={isHost} endedAt={event.ends_at} />
          </div>

          <div className="mt-10">
            <EventGallery eventId={event.id} hostId={event.host_id} endsAt={event.ends_at} />
          </div>

          <div className="mt-8 flex justify-end border-t pt-4">
            <ReportButton subjectType="event" subjectId={event.id} label="Report event" />
          </div>
        </div>
      </Card>
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-lg bg-secondary text-muted-foreground">{icon}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}
