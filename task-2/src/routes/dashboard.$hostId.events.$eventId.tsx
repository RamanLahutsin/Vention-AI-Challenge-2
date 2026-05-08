import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard/$hostId/events/$eventId")({
  beforeLoad: async ({ params }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session)
      throw redirect({
        to: "/sign-in",
        search: { redirect: `/dashboard/${params.hostId}/events/${params.eventId}` },
      });
  },
  component: () => <Outlet />,
});
