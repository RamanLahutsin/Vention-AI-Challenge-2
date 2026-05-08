import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/")({
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) throw redirect({ to: "/sign-in", search: { redirect: "/dashboard" } });
    const { data } = await supabase
      .from("host_members")
      .select("host_id")
      .eq("user_id", session.session.user.id)
      .limit(1);
    if (!data || data.length === 0) throw redirect({ to: "/become-host" });
    throw redirect({ to: "/dashboard/$hostId", params: { hostId: data[0].host_id } });
  },
});
