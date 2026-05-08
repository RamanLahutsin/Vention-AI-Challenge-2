import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Upload, Trash2, EyeOff, Eye, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

type Photo = {
  id: string;
  event_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  is_hidden: boolean;
  created_at: string;
};

const BUCKET = "event-photos";

export function EventGallery({
  eventId,
  hostId,
  endsAt,
}: {
  eventId: string;
  hostId: string;
  endsAt: string;
}) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [isHostMember, setIsHostMember] = useState(false);
  const [hasAttended, setHasAttended] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("event_photos")
      .select("*")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    setPhotos((data as Photo[]) ?? []);
    setLoading(false);
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      setIsHostMember(false);
      setHasAttended(false);
      return;
    }
    supabase
      .from("host_members")
      .select("user_id")
      .eq("host_id", hostId)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setIsHostMember(!!data));
    supabase
      .from("rsvps")
      .select("status")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "going")
      .maybeSingle()
      .then(({ data }) => setHasAttended(!!data));
  }, [user, hostId, eventId]);

  const publicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const handleUpload = async (file: File) => {
    if (!user) {
      toast.error("Sign in to upload");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${eventId}/${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("event_photos").insert({
        event_id: eventId,
        user_id: user.id,
        storage_path: path,
        caption: caption || null,
      });
      if (insErr) throw insErr;
      toast.success("Photo uploaded");
      setCaption("");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (p: Photo) => {
    const { error } = await supabase.from("event_photos").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.storage.from(BUCKET).remove([p.storage_path]);
    toast.success("Deleted");
    load();
  };

  const toggleHide = async (p: Photo) => {
    const { error } = await supabase
      .from("event_photos")
      .update({ is_hidden: !p.is_hidden })
      .eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    load();
  };

  const eventEnded = new Date(endsAt) < new Date();
  const canUpload = !!user && eventEnded && (hasAttended || isHostMember);

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="size-5" />
        <h3 className="text-lg font-semibold">Community gallery</h3>
      </div>

      {canUpload ? (
        <div className="space-y-2">
          <Input
            placeholder="Caption (optional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            variant="secondary"
          >
            <Upload className="size-4 mr-2" />
            {uploading ? "Uploading..." : "Upload photo"}
          </Button>
        </div>
      ) : !eventEnded ? (
        <p className="text-sm text-muted-foreground">
          Gallery uploads open after the event ends.
        </p>
      ) : !user ? (
        <p className="text-sm text-muted-foreground">Sign in as an attendee to upload.</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only attendees who RSVP'd can add photos.
        </p>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {photos.map((p) => {
            const mine = user?.id === p.user_id;
            const canModerate = isHostMember;
            return (
              <div key={p.id} className="relative group rounded-md overflow-hidden border">
                <img
                  src={publicUrl(p.storage_path)}
                  alt={p.caption || "Event photo"}
                  loading="lazy"
                  className={`w-full h-40 object-cover ${p.is_hidden ? "opacity-40" : ""}`}
                />
                {p.caption && (
                  <div className="p-2 text-xs bg-background/80 backdrop-blur absolute bottom-0 inset-x-0">
                    {p.caption}
                  </div>
                )}
                {(mine || canModerate) && (
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    {canModerate && (
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => toggleHide(p)}
                        title={p.is_hidden ? "Unhide" : "Hide"}
                      >
                        {p.is_hidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      </Button>
                    )}
                    {(mine || canModerate) && (
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => handleDelete(p)}
                        title="Delete"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
