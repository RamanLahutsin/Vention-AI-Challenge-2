import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Calendar, MapPin } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

type TicketRow = {
  id: string;
  status: "going" | "waitlist" | "cancelled";
  code: string;
  checked_in_at: string | null;
  events: {
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    venue: string | null;
    timezone: string;
    cover_url: string | null;
  };
};

export const Route = createFileRoute("/tickets")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/sign-in", search: { redirect: "/tickets" } });
  },
  head: () => ({ meta: [{ title: "My tickets — Gather" }] }),
  component: Tickets,
});

function Tickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<TicketRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("rsvps")
      .select("id, status, code, checked_in_at, events(id, title, starts_at, ends_at, venue, timezone, cover_url)")
      .eq("user_id", user.id)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTickets((data as unknown as TicketRow[]) ?? []));
  }, [user]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-sage text-sage-foreground">
          <Ticket className="h-5 w-5" />
        </span>
        <h1 className="font-display text-4xl font-black">My tickets</h1>
      </div>

      {tickets === null ? (
        <p className="mt-8 text-muted-foreground">Loading…</p>
      ) : tickets.length === 0 ? (
        <Card className="mt-8 rounded-3xl border-dashed p-12 text-center text-muted-foreground shadow-soft">
          No tickets yet. <Link to="/explore" className="text-primary hover:underline">Find an event</Link>.
        </Card>
      ) : (
        <div className="mt-8 grid gap-4">
          {tickets.map((t) => {
            const ended = new Date(t.events.ends_at) < new Date();
            return (
              <Card key={t.id} className="overflow-hidden rounded-3xl border-border/70 shadow-soft">
                <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={t.status === "going" ? "default" : "secondary"}>
                        {t.status === "going" ? "Going" : "Waitlist"}
                      </Badge>
                      {t.checked_in_at && <Badge variant="outline">Checked in</Badge>}
                      {ended && <Badge variant="secondary">Ended</Badge>}
                    </div>
                    <Link
                      to="/e/$eventId"
                      params={{ eventId: t.events.id }}
                      className="mt-2 block font-display text-2xl font-bold hover:underline"
                    >
                      {t.events.title}
                    </Link>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(t.events.starts_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                    {t.events.venue && (
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> {t.events.venue}
                      </p>
                    )}
                    <p className="mt-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      Code: {t.code}
                    </p>
                  </div>
                  {t.status === "going" && (
                    <div className="rounded-2xl bg-white p-3 shadow-soft">
                      <QRCodeSVG value={`gather:${t.events.id}:${t.code}`} size={128} />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/explore">Find more events</Link>
        </Button>
      </div>
    </div>
  );
}
