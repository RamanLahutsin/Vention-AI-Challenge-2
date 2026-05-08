import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export function ReportButton({
  subjectType,
  subjectId,
  label = "Report",
}: {
  subjectType: "event" | "host";
  subjectId: string;
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!user) return;
    const trimmed = reason.trim();
    if (trimmed.length < 5) return toast.error("Please describe the issue (min 5 chars)");
    if (trimmed.length > 1000) return toast.error("Reason must be under 1000 chars");
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      subject_type: subjectType,
      subject_id: subjectId,
      reporter_id: user.id,
      reason: trimmed,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Report submitted. Thanks for letting us know.");
    setReason("");
    setOpen(false);
  }

  if (!user) {
    return (
      <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
        <Link to="/sign-in" search={{ redirect: window.location.pathname }}>
          <Flag className="mr-1.5 h-4 w-4" /> {label}
        </Link>
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground">
          <Flag className="mr-1.5 h-4 w-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {subjectType}</DialogTitle>
          <DialogDescription>
            Tell the host what's wrong. They'll review and decide what to do.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="reason">Reason</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 1000))}
            placeholder="Spam, misleading info, inappropriate content…"
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
