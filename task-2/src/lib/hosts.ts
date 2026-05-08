import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export type Host = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  logo_url: string | null;
  contact_email: string | null;
  owner_id: string;
};

export type Membership = {
  host_id: string;
  user_id: string;
  role: "host" | "checker";
  hosts: Host;
};

export function useMyMemberships() {
  const { user } = useAuth();
  const [data, setData] = useState<Membership[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!user) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from("host_members")
      .select("host_id, user_id, role, hosts(*)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!active) return;
        setData((data ?? []) as unknown as Membership[]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const memberships = useMemo(() => data ?? [], [data]);
  return { memberships, loading, refetch: () => setData(null) };
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}
