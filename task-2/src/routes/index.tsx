import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Ticket, QrCode, Users, MapPin, Calendar } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Gather — Run delightful community events" },
      {
        name: "description",
        content:
          "Publish event pages, collect RSVPs, hand out QR tickets, and check guests in at the door. Free for community organizers.",
      },
      { property: "og:title", content: "Gather — Run delightful community events" },
      {
        property: "og:description",
        content: "Publish event pages, collect RSVPs, and check guests in with QR tickets.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 60% at 20% 10%, oklch(0.93 0.06 70 / 0.8) 0%, transparent 60%), radial-gradient(50% 50% at 90% 30%, oklch(0.82 0.14 85 / 0.35) 0%, transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-1.5 text-xs font-semibold tracking-wide text-muted-foreground shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Free for community organizers
            </span>
            <h1 className="mt-6 font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              Bring your{" "}
              <span className="relative inline-block">
                <span className="relative z-10">people</span>
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-1 -z-0 h-3 rounded-full bg-mustard md:bottom-2 md:h-4"
                />
              </span>{" "}
              together.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              Publish a beautiful event page, collect RSVPs, hand out QR tickets, and check guests
              in at the door — all in one cozy little tool.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link to="/sign-up">Start hosting — it's free</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-7">
                <Link to="/explore">Browse events</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Calendar,
              title: "Publish in minutes",
              body: "Cover image, time zone, capacity, venue. Public or unlisted. Draft, publish, duplicate.",
              tone: "bg-accent text-accent-foreground",
            },
            {
              icon: Ticket,
              title: "RSVPs + waitlist",
              body: "Capacity is enforced. Cancellations promote the next person automatically.",
              tone: "bg-sage text-sage-foreground",
            },
            {
              icon: QrCode,
              title: "QR check-in",
              body: "Every ticket gets a unique code. Checkers scan or type at the door.",
              tone: "bg-mustard text-mustard-foreground",
            },
          ].map((f) => (
            <Card
              key={f.title}
              className="group rounded-3xl border-border/70 bg-card p-6 shadow-soft transition-shadow hover:shadow-pop"
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl ${f.tone} shadow-soft`}
              >
                <f.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 font-display text-2xl font-bold">{f.title}</h3>
              <p className="mt-2 text-muted-foreground">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-mustard p-10 text-primary-foreground shadow-pop md:p-16">
          <div
            aria-hidden
            className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl"
          />
          <div className="relative grid gap-6 md:grid-cols-2 md:items-center">
            <div>
              <h2 className="font-display text-4xl font-black leading-tight md:text-5xl">
                Your next gathering, ready to share.
              </h2>
              <p className="mt-3 max-w-md text-primary-foreground/85">
                Become a host and publish your first event today. No credit card, no fluff.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="rounded-full bg-white text-foreground hover:bg-white/90"
              >
                <Link to="/sign-up">Become Host</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground"
              >
                <Link to="/explore">See live events</Link>
              </Button>
            </div>
          </div>
          <div className="relative mt-8 flex flex-wrap gap-4 text-sm text-primary-foreground/80">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> Capacity & waitlist
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> In-person or online
            </span>
            <span className="inline-flex items-center gap-1.5">
              <QrCode className="h-4 w-4" /> Door check-in
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
