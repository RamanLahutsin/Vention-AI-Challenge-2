import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { slugify } from "@/lib/hosts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and dashes only"),
  bio: z.string().max(500).optional(),
  contact_email: z.string().email().max(255),
});

export const Route = createFileRoute("/become-host")({
  head: () => ({ meta: [{ title: "Become a host — Gather" }] }),
  component: BecomeHost,
});

function BecomeHost() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    throw redirect({ to: "/sign-in", search: { redirect: "/become-host" } });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const parsed = schema.safeParse({ name, slug: slug || slugify(name), bio, contact_email: contactEmail });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check your input");
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase
      .from("hosts")
      .insert({
        name: parsed.data.name,
        slug: parsed.data.slug,
        bio: parsed.data.bio || null,
        contact_email: parsed.data.contact_email,
        owner_id: user.id,
      })
      .select("id, slug")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "That handle is taken" : error.message);
      return;
    }
    toast.success("Host created!");
    navigate({ to: "/dashboard/$hostId", params: { hostId: data.id } });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-mustard text-primary-foreground shadow-pop">
        <Sparkles className="h-6 w-6" />
      </span>
      <h1 className="mt-4 font-display text-4xl font-black">Become a host</h1>
      <p className="mt-2 text-muted-foreground">
        Set up your public host page. You can change any of this later.
      </p>

      <Card className="mt-8 rounded-3xl border-border/70 p-6 shadow-soft">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Host name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              maxLength={80}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="slug">Handle</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">gather.app/h/</span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(slugify(e.target.value));
                }}
                maxLength={60}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact">Contact email</Label>
            <Input
              id="contact"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="bio">Short bio</Label>
            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} />
          </div>
          <Button type="submit" disabled={submitting} className="w-full rounded-full">
            {submitting ? "Creating…" : "Create host"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-sm text-muted-foreground">
        Already host somewhere?{" "}
        <Link to="/my-events" className="font-semibold text-primary hover:underline">
          Go to your events
        </Link>
      </p>
    </div>
  );
}
