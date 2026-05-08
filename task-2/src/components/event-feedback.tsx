import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { toast } from "sonner";

type Feedback = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id: string;
};

export function EventFeedback({
  eventId,
  isHost,
  endedAt,
}: {
  eventId: string;
  isHost: boolean;
  endedAt: string;
}) {
  const { user } = useAuth();
  const [items, setItems] = useState<Feedback[]>([]);
  const [mine, setMine] = useState<Feedback | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);

  const ended = new Date(endedAt) < new Date();

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("feedback")
      .select("id, rating, comment, created_at, user_id")
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });
    const list = (data as Feedback[]) ?? [];
    setItems(list);
    if (user) {
      const own = list.find((f) => f.user_id === user.id) ?? null;
      setMine(own);
      // check if user was going
      const { data: r } = await supabase
        .from("rsvps")
        .select("status")
        .eq("event_id", eventId)
        .eq("user_id", user.id)
        .eq("status", "going")
        .maybeSingle();
      setCanSubmit(!!r);
    }
  }, [eventId, user]);

  useEffect(() => {
    if (ended) load();
  }, [ended, load]);

  if (!ended) return null;

  async function submit() {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("feedback").insert({
      event_id: eventId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Thanks for your feedback!");
    setComment("");
    load();
  }

  const avg = items.length > 0 ? items.reduce((s, i) => s + i.rating, 0) / items.length : 0;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">Feedback</h2>
        {items.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-mustard text-mustard" />
            <span className="font-semibold">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({items.length})</span>
          </div>
        )}
      </div>

      {user && canSubmit && !mine && (
        <Card className="mt-4 rounded-2xl border-border/70 p-4 shadow-soft">
          <p className="text-sm font-medium">How was it?</p>
          <div className="mt-2 flex items-center gap-0">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n)}
                aria-label={`${n} stars`}
                className="p-2"
              >
                <Star
                  className={`pointer-events-none h-6 w-6 ${n <= rating ? "fill-mustard text-mustard" : "text-muted-foreground"}`}
                />
              </button>
            ))}
          </div>
          <Textarea
            className="mt-3"
            placeholder="Optional — what stood out?"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={3}
          />
          <div className="mt-3 flex justify-end">
            <Button onClick={submit} disabled={busy} className="rounded-full">
              Submit feedback
            </Button>
          </div>
        </Card>
      )}

      {mine && (
        <Card className="mt-4 rounded-2xl border-border/70 p-4 shadow-soft">
          <p className="text-sm text-muted-foreground">Your feedback</p>
          <RatingStars value={mine.rating} />
          {mine.comment && <p className="mt-2 text-sm">{mine.comment}</p>}
        </Card>
      )}

      {isHost && items.length > 0 && (
        <div className="mt-4 grid gap-2">
          <p className="text-sm text-muted-foreground">All feedback (hosts only)</p>
          {items.map((f) => (
            <Card key={f.id} className="rounded-2xl border-border/70 p-4 shadow-soft">
              <RatingStars value={f.rating} />
              {f.comment && <p className="mt-2 text-sm">{f.comment}</p>}
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(f.created_at).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}

      {!isHost && !canSubmit && !mine && (
        <p className="mt-3 text-sm text-muted-foreground">
          Feedback is open to attendees who were going.
        </p>
      )}
    </section>
  );
}

function RatingStars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= value ? "fill-mustard text-mustard" : "text-muted-foreground"}`}
        />
      ))}
    </div>
  );
}
