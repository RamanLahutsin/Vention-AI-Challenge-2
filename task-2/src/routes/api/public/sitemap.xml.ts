import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/sitemap/xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const staticUrls = ["/", "/explore", "/sign-in", "/sign-up", "/become-host"];

        const { data: events } = await supabaseAdmin
          .from("events")
          .select("id, updated_at")
          .eq("status", "published")
          .eq("visibility", "public")
          .eq("is_hidden", false)
          .limit(1000);

        const { data: hosts } = await supabaseAdmin
          .from("hosts")
          .select("slug, updated_at")
          .limit(1000);

        const urls = [
          ...staticUrls.map((u) => `<url><loc>${origin}${u}</loc></url>`),
          ...(events ?? []).map(
            (e) =>
              `<url><loc>${origin}/e/${e.id}</loc><lastmod>${new Date(
                e.updated_at,
              ).toISOString()}</lastmod></url>`,
          ),
          ...(hosts ?? []).map(
            (h) =>
              `<url><loc>${origin}/h/${h.slug}</loc><lastmod>${new Date(
                h.updated_at,
              ).toISOString()}</lastmod></url>`,
          ),
        ].join("");

        const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
        return new Response(xml, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
