import { createFileRoute, redirect, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Image as ImageIcon, Lock, Trash2 } from "lucide-react";

export const Route = createFileRoute("/dashboard/$hostId/events/$eventId/")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({ to: "/sign-in", search: { redirect: `/dashboard/${params.hostId}/events/${params.eventId}` } });
  },
  head: () => ({ meta: [{ title: "Edit event — Gather" }] }),
  component: EditEvent,
});

const tzList = [
  "UTC",
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "Africa/Lagos",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
];

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EditEvent() {
  const { hostId, eventId } = useParams({ from: "/dashboard/$hostId/events/$eventId/" });
  const isNew = eventId === "new";
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(!isNew);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  const [venue, setVenue] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [capacity, setCapacity] = useState(0);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<"public" | "unlisted">("public");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isNew) return;
    supabase
      .from("events")
      .select("*")
      .eq("id", eventId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Event not found");
          navigate({ to: "/dashboard/$hostId", params: { hostId } });
          return;
        }
        setTitle(data.title);
        setDescription(data.description ?? "");
        setStartsAt(toLocalInput(data.starts_at));
        setEndsAt(toLocalInput(data.ends_at));
        setTimezone(data.timezone);
        setVenue(data.venue ?? "");
        setOnlineUrl(data.online_url ?? "");
        setCapacity(data.capacity);
        setCoverUrl(data.cover_url);
        setVisibility(data.visibility);
        setStatus(data.status);
        setLoading(false);
      });
  }, [eventId, hostId, isNew, navigate]);

  const validation = useMemo(() => {
    if (!title.trim()) return "Title is required";
    if (!startsAt || !endsAt) return "Start and end times are required";
    if (new Date(endsAt) <= new Date(startsAt)) return "End must be after start";
    return null;
  }, [title, startsAt, endsAt]);

  async function uploadCover(file: File) {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("event-covers").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    setUploading(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
    setCoverUrl(data.publicUrl);
    toast.success("Cover uploaded");
  }

  async function save(action: "save" | "publish" | "unpublish") {
    if (validation) return toast.error(validation);
    setSaving(true);
    const payload = {
      host_id: hostId,
      title: title.trim(),
      description: description || null,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: new Date(endsAt).toISOString(),
      timezone,
      venue: venue || null,
      online_url: onlineUrl || null,
      capacity: Math.max(0, Math.floor(capacity || 0)),
      cover_url: coverUrl,
      visibility,
      status: action === "publish" ? "published" as const : action === "unpublish" ? "draft" as const : status,
      is_paid: false,
    };
    if (isNew) {
      const { data, error } = await supabase.from("events").insert(payload).select("id").single();
      setSaving(false);
      if (error) return toast.error(error.message);
      toast.success("Created");
      navigate({ to: "/dashboard/$hostId/events/$eventId", params: { hostId, eventId: data.id } });
    } else {
      const { error } = await supabase.from("events").update(payload).eq("id", eventId);
      setSaving(false);
      if (error) return toast.error(error.message);
      setStatus(payload.status);
      toast.success(action === "publish" ? "Published" : action === "unpublish" ? "Unpublished" : "Saved");
    }
  }

  async function deleteEvent() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    navigate({ to: "/dashboard/$hostId", params: { hostId } });
  }

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-12 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-display text-3xl font-black">{isNew ? "Create event" : "Edit event"}</h1>

      <Card className="mt-6 overflow-hidden rounded-3xl border-border/70 shadow-soft">
        <div className="relative aspect-[3/1] w-full bg-secondary">
          {coverUrl ? (
            <img src={coverUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <ImageIcon className="h-10 w-10" />
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3 rounded-full"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : coverUrl ? "Replace cover" : "Add cover"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCover(f);
            }}
          />
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="desc">Description</Label>
            <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={6} maxLength={4000} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="start">Starts</Label>
              <Input id="start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end">Ends</Label>
              <Input id="end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label>Timezone</Label>
              <Select value={timezone} onValueChange={setTimezone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tzList.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="venue">Venue address</Label>
              <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="123 Main St" maxLength={255} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="online">Online link</Label>
              <Input id="online" value={onlineUrl} onChange={(e) => setOnlineUrl(e.target.value)} placeholder="https://…" maxLength={500} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity">Capacity (0 = unlimited)</Label>
              <Input
                id="capacity"
                type="number"
                min={0}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Visibility</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as "public" | "unlisted")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public — searchable</SelectItem>
                  <SelectItem value="unlisted">Unlisted — link only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border bg-secondary/40 p-4">
            <div>
              <p className="font-medium">Free / Paid</p>
              <p className="text-sm text-muted-foreground">All events are free for now.</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-3 opacity-60">
                    <span className="text-sm">Paid</span>
                    <Switch checked={false} disabled />
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Coming soon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save("save")} disabled={saving} variant="outline" className="rounded-full">
            {saving ? "Saving…" : "Save draft"}
          </Button>
          {status === "published" ? (
            <Button onClick={() => save("unpublish")} disabled={saving} variant="secondary" className="rounded-full">
              Unpublish
            </Button>
          ) : (
            <Button onClick={() => save("publish")} disabled={saving} className="rounded-full">
              Publish
            </Button>
          )}
        </div>
        {!isNew && (
          <Button variant="ghost" onClick={deleteEvent} className="rounded-full text-destructive hover:text-destructive">
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        )}
      </div>
    </div>
  );
}
