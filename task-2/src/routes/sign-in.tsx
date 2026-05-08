import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/sign-in")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "Sign in — Gather" }] }),
  component: SignIn,
});

function SignIn() {
  const navigate = useNavigate();
  const { redirect } = useSearch({ from: "/sign-in" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back!");
    navigate({ to: redirect ?? "/" });
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16">
      <span className="grid h-14 w-14 place-items-center rounded-3xl bg-gradient-to-br from-primary to-mustard text-primary-foreground shadow-pop">
        <Sparkles className="h-7 w-7" />
      </span>
      <h1 className="mt-5 font-display text-4xl font-black">Welcome back</h1>
      <p className="mt-2 text-muted-foreground">Sign in to RSVP and manage your events.</p>

      <Card className="mt-8 w-full rounded-3xl border-border/70 p-6 shadow-soft">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={loading} className="w-full rounded-full">
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          to="/sign-up"
          search={{ redirect }}
          className="font-semibold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
