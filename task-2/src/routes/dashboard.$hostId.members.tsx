import { createFileRoute, Link, redirect, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Copy, Trash2, UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/lib/auth-context";

type Member = {
  user_id: string;
  role: "host" | "checker";
  created_at: string;
  profile?: { display_name: string | null; contact_email: string | null };
};
type Invite = {
  id: string;
  email: string;
  role: "host" | "checker";
  token: string;
  accepted_at: string | null;
  expires_at: string;
  created_at: string;
};

const inviteSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  role: z.enum(["host", "checker"]),
});

export const Route = createFileRoute("/dashboard/$hostId/members")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({ to: "/sign-in", search: { redirect: `/dashboard/${params.hostId}/members` } });
  },
  head: () => ({ meta: [{ title: "Team — Gather" }] }),
  component: MembersPage,
});

function MembersPage() {
  const { hostId } = useParams({ from: "/dashboard/$hostId/members" });
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"host" | "checker">("checker");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data: m } = await supabase
      .from("host_members")
      .select("user_id, role, created_at")
      .eq("host_id", hostId);
    const list = (m as Member[]) ?? [];
    const ids = list.map((x) => x.user_id);
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, contact_email")
        .in("id", ids);
      const map = Object.fromEntries((profs ?? []).map((p) => [p.id, p]));
      list.forEach((x) => (x.profile = map[x.user_id]));
    }
    setMembers(list);

    const { data: inv } = await supabase
      .from("host_invites")
      .select("id, email, role, token, accepted_at, expires_at, created_at")
      .eq("host_id", hostId)
      .order("created_at", { ascending: false });
    setInvites((inv as Invite[]) ?? []);
  }, [hostId]);

  useEffect(() => {
    load();
  }, [load]);

  async function sendInvite() {
    if (!user) return;
    const parsed = inviteSchema.safeParse({ email, role });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    const { error } = await supabase.from("host_invites").insert({
      host_id: hostId,
      email: parsed.data.email,
      role: parsed.data.role,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Invite created");
    setEmail("");
    load();
  }

  async function revoke(id: string) {
    const { error } = await supabase.from("host_invites").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Revoked");
    load();
  }

  async function removeMember(userId: string) {
    if (userId === user?.id) return toast.error("You cannot remove yourself");
    const { error } = await supabase
      .from("host_members")
      .delete()
      .eq("host_id", hostId)
      .eq("user_id", userId);
    if (error) return toast.error(error.message);
    toast.success("Member removed");
    load();
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="rounded-full">
        <Link to="/dashboard/$hostId" params={{ hostId }}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Link>
      </Button>

      <h1 className="mt-4 font-display text-3xl font-black">Team</h1>
      <p className="text-muted-foreground">
        Invite people to help host events or check guests in at the door.
      </p>

      <Card className="mt-6 rounded-3xl border-border/70 p-6 shadow-soft">
        <h2 className="font-display text-xl font-bold">Invite someone</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "host" | "checker")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checker">Checker (door only)</SelectItem>
                <SelectItem value="host">Host (full access)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button onClick={sendInvite} disabled={busy} className="w-full rounded-full">
              <UserPlus className="mr-2 h-4 w-4" /> Invite
            </Button>
          </div>
        </div>
      </Card>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Members ({members.length})</h2>
        <div className="mt-3 grid gap-2">
          {members.map((m) => (
            <Card key={m.user_id} className="rounded-2xl border-border/70 p-3 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.profile?.display_name ?? "Member"}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.profile?.contact_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.role === "host" ? "default" : "secondary"} className="capitalize">
                    {m.role}
                  </Badge>
                  {m.user_id !== user?.id && (
                    <Button size="sm" variant="ghost" className="rounded-full" onClick={() => removeMember(m.user_id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-xl font-bold">Pending invites ({invites.filter((i) => !i.accepted_at).length})</h2>
        {invites.length === 0 ? (
          <Card className="mt-3 rounded-2xl border-dashed p-6 text-center text-sm text-muted-foreground shadow-soft">
            No invites yet.
          </Card>
        ) : (
          <div className="mt-3 grid gap-2">
            {invites.map((i) => {
              const expired = !i.accepted_at && new Date(i.expires_at) < new Date();
              return (
                <Card key={i.id} className="rounded-2xl border-border/70 p-3 shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-medium">
                        <Mail className="h-4 w-4 text-muted-foreground" /> {i.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(i.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">{i.role}</Badge>
                      {i.accepted_at ? (
                        <Badge>Accepted</Badge>
                      ) : expired ? (
                        <Badge variant="secondary">Expired</Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                      {!i.accepted_at && !expired && (
                        <Button size="sm" variant="outline" className="rounded-full" onClick={() => copyLink(i.token)}>
                          <Copy className="mr-1 h-4 w-4" /> Copy link
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" className="rounded-full" onClick={() => revoke(i.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
