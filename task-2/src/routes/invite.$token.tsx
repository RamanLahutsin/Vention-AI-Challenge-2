import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type InvitePreview = {
  email: string;
  role: "host" | "checker";
  expires_at: string;
  accepted_at: string | null;
  hosts: { id: string; name: string; slug: string; logo_url: string | null };
};

export const Route = createFileRoute("/invite/$token")({
  head: () => ({ meta: [{ title: "Accept invite — Gather" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = useParams({ from: "/invite/$token" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("host_invites")
      .select("email, role, expires_at, accepted_at, hosts(id, name, slug, logo_url)")
      .eq("token", token)
      .maybeSingle()
      .then(({ data }) => {
        setInvite((data as unknown as InvitePreview) ?? null);
        setLoading(false);
      });
  }, [token]);

  async function accept() {
    if (!user) {
      navigate({ to: "/sign-in", search: { redirect: `/invite/${token}` } });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("accept_invite", { _token: token });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("You're in!");
    if (data) navigate({ to: "/dashboard/$hostId", params: { hostId: data as string } });
  }

  if (loading) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center text-muted-foreground">Loading…</div>;
  }
  if (!invite) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-black">Invite not found</h1>
        <p className="mt-2 text-muted-foreground">It may have been revoked.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/">Go home</Link></Button>
      </div>
    );
  }

  const expired = !invite.accepted_at && new Date(invite.expires_at) < new Date();
  const used = !!invite.accepted_at;

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card className="rounded-3xl border-border/70 p-8 text-center shadow-soft">
        {invite.hosts.logo_url ? (
          <img src={invite.hosts.logo_url} alt="" className="mx-auto h-16 w-16 rounded-2xl object-cover" />
        ) : (
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-mustard text-primary-foreground font-display text-2xl font-bold">
            {invite.hosts.name.charAt(0)}
          </span>
        )}
        <h1 className="mt-4 font-display text-2xl font-black">Join {invite.hosts.name}</h1>
        <p className="mt-2 text-muted-foreground">
          You've been invited as a <Badge variant="outline" className="ml-1 capitalize">{invite.role}</Badge>
        </p>

        {used ? (
          <p className="mt-6 text-sm text-muted-foreground">This invite was already accepted.</p>
        ) : expired ? (
          <p className="mt-6 text-sm text-muted-foreground">This invite has expired.</p>
        ) : (
          <Button onClick={accept} disabled={busy} size="lg" className="mt-6 w-full rounded-full">
            {user ? "Accept invite" : "Sign in to accept"}
          </Button>
        )}
      </Card>
    </div>
  );
}
