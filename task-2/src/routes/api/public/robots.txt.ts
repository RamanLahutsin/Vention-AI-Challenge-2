import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/robots/txt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const body = `User-agent: *\nAllow: /\nDisallow: /dashboard\nDisallow: /account\nDisallow: /tickets\nDisallow: /my-events\n\nSitemap: ${origin}/api/public/sitemap.xml\n`;
        return new Response(body, {
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      },
    },
  },
});
