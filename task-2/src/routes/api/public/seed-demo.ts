import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const SEED_TOKEN = "gather-demo-seed";
const PASSWORD = "DemoPass123!";

const USERS = [
  { email: "alice@gather.test", display_name: "Alice Organizer" },
  { email: "bob@gather.test", display_name: "Bob Organizer" },
  { email: "carla@gather.test", display_name: "Carla Attendee" },
  { email: "dave@gather.test", display_name: "Dave Attendee" },
  { email: "erin@gather.test", display_name: "Erin Checker" },
];

async function ensureUser(email: string, display_name: string) {
  // Try create; if exists, fetch by listing
  const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name },
  });
  if (created?.user) return created.user.id;
  if (error && !/already/i.test(error.message)) throw error;

  // Fallback: find existing
  let page = 1;
  while (true) {
    const { data, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const found = data.users.find((u) => u.email === email);
    if (found) return found.id;
    if (data.users.length < 200) throw new Error(`Could not find user ${email}`);
    page++;
  }
}

export const Route = createFileRoute("/api/public/seed-demo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get("token") !== SEED_TOKEN) {
          return new Response("Unauthorized", { status: 401 });
        }

        const ids: Record<string, string> = {};
        for (const u of USERS) {
          ids[u.email] = await ensureUser(u.email, u.display_name);
        }

        // Hosts
        const hostsToCreate = [
          {
            slug: "neon-collective",
            name: "Neon Collective",
            bio: "Underground music nights and community jams.",
            owner_id: ids["alice@gather.test"],
            contact_email: "alice@gather.test",
          },
          {
            slug: "garden-society",
            name: "Garden Society",
            bio: "Outdoor brunches, picnics, and plant swaps.",
            owner_id: ids["bob@gather.test"],
            contact_email: "bob@gather.test",
          },
        ];

        const hostIds: Record<string, string> = {};
        for (const h of hostsToCreate) {
          const { data: existing } = await supabaseAdmin
            .from("hosts")
            .select("id")
            .eq("slug", h.slug)
            .maybeSingle();
          if (existing) {
            hostIds[h.slug] = existing.id;
            continue;
          }
          const { data, error } = await supabaseAdmin
            .from("hosts")
            .insert(h)
            .select("id")
            .single();
          if (error) throw error;
          hostIds[h.slug] = data.id;
        }

        // Add Erin as a checker on Neon Collective
        await supabaseAdmin
          .from("host_members")
          .upsert(
            {
              host_id: hostIds["neon-collective"],
              user_id: ids["erin@gather.test"],
              role: "checker",
            },
            { onConflict: "host_id,user_id" },
          );

        // Events
        const now = Date.now();
        const day = 86_400_000;
        const eventsToCreate: Array<{
          host_id: string;
          title: string;
          description: string;
          starts_at: string;
          ends_at: string;
          timezone: string;
          venue: string;
          capacity: number;
          visibility: "public" | "unlisted";
          status: "draft" | "published";
        }> = [
          {
            host_id: hostIds["neon-collective"],
            title: "Synthwave Sundown",
            description: "An evening of analog synths and soft drinks on the rooftop.",
            starts_at: new Date(now + 3 * day).toISOString(),
            ends_at: new Date(now + 3 * day + 3 * 3600_000).toISOString(),
            timezone: "UTC",
            venue: "Rooftop @ 21 Elm Street",
            capacity: 3,
            visibility: "public",
            status: "published",
          },
          {
            host_id: hostIds["neon-collective"],
            title: "Secret Loft Jam (unlisted)",
            description: "Bring an instrument. Direct link only.",
            starts_at: new Date(now + 10 * day).toISOString(),
            ends_at: new Date(now + 10 * day + 4 * 3600_000).toISOString(),
            timezone: "UTC",
            venue: "Undisclosed loft",
            capacity: 0,
            visibility: "unlisted",
            status: "published",
          },
          {
            host_id: hostIds["garden-society"],
            title: "Sunday Garden Brunch",
            description: "Pastries, pour-over, and a plant swap.",
            starts_at: new Date(now + 7 * day).toISOString(),
            ends_at: new Date(now + 7 * day + 3 * 3600_000).toISOString(),
            timezone: "UTC",
            venue: "Riverside Park, Pavilion 2",
            capacity: 25,
            visibility: "public",
            status: "published",
          },
          {
            host_id: hostIds["garden-society"],
            title: "Past Picnic (for feedback testing)",
            description: "Already wrapped up — perfect for testing feedback and gallery.",
            starts_at: new Date(now - 5 * day).toISOString(),
            ends_at: new Date(now - 5 * day + 3 * 3600_000).toISOString(),
            timezone: "UTC",
            venue: "Meadow Hill",
            capacity: 50,
            visibility: "public",
            status: "published",
          },
        ];

        const eventIds: Record<string, string> = {};
        for (const e of eventsToCreate) {
          const { data: existing } = await supabaseAdmin
            .from("events")
            .select("id")
            .eq("host_id", e.host_id)
            .eq("title", e.title)
            .maybeSingle();
          if (existing) {
            eventIds[e.title] = existing.id;
            continue;
          }
          const { data, error } = await supabaseAdmin
            .from("events")
            .insert(e)
            .select("id")
            .single();
          if (error) throw error;
          eventIds[e.title] = data.id;
        }

        // RSVPs to demonstrate capacity & past attendance
        const rsvps = [
          // Synthwave (capacity 3) → fill it: Carla, Dave going; Erin waitlist
          { event: "Synthwave Sundown", user: "carla@gather.test", status: "going" },
          { event: "Synthwave Sundown", user: "dave@gather.test", status: "going" },
          { event: "Synthwave Sundown", user: "bob@gather.test", status: "going" },
          { event: "Synthwave Sundown", user: "erin@gather.test", status: "waitlist" },
          // Past picnic — Carla & Dave attended (going) for feedback/gallery
          { event: "Past Picnic (for feedback testing)", user: "carla@gather.test", status: "going" },
          { event: "Past Picnic (for feedback testing)", user: "dave@gather.test", status: "going" },
          // Garden brunch upcoming — Carla going
          { event: "Sunday Garden Brunch", user: "carla@gather.test", status: "going" },
        ];

        for (const r of rsvps) {
          const event_id = eventIds[r.event];
          const user_id = ids[r.user];
          if (!event_id || !user_id) continue;
          const { data: existing } = await supabaseAdmin
            .from("rsvps")
            .select("id")
            .eq("event_id", event_id)
            .eq("user_id", user_id)
            .maybeSingle();
          if (existing) continue;
          await supabaseAdmin.from("rsvps").insert({
            event_id,
            user_id,
            status: r.status as "going" | "waitlist",
          });
        }

        // Demo gallery photos for Past Picnic
        const pastPicnicId = eventIds["Past Picnic (for feedback testing)"];
        let photosAdded = 0;
        if (pastPicnicId) {
          const samples = [
            { user: "carla@gather.test", seed: "picnic-1", caption: "Sunset light over the meadow" },
            { user: "dave@gather.test", seed: "picnic-2", caption: "Plant swap table was packed" },
            { user: "carla@gather.test", seed: "picnic-3", caption: "Group photo before clean-up" },
          ];
          for (const s of samples) {
            const userId = ids[s.user];
            if (!userId) continue;
            const path = `${pastPicnicId}/seed/${s.seed}.jpg`;
            const { data: existing } = await supabaseAdmin
              .from("event_photos")
              .select("id")
              .eq("event_id", pastPicnicId)
              .eq("storage_path", path)
              .maybeSingle();
            if (existing) continue;
            try {
              const res = await fetch(`https://picsum.photos/seed/${s.seed}/800/600`);
              if (!res.ok) continue;
              const buf = new Uint8Array(await res.arrayBuffer());
              const { error: upErr } = await supabaseAdmin.storage
                .from("event-photos")
                .upload(path, buf, { contentType: "image/jpeg", upsert: true });
              if (upErr) continue;
              const { error: insErr } = await supabaseAdmin.from("event_photos").insert({
                event_id: pastPicnicId,
                user_id: userId,
                storage_path: path,
                caption: s.caption,
              });
              if (!insErr) photosAdded++;
            } catch {
              // skip on failure
            }
          }
        }

        return Response.json({
          ok: true,
          password: PASSWORD,
          users: USERS.map((u) => ({ email: u.email, name: u.display_name })),
          hosts: Object.keys(hostIds),
          events: Object.keys(eventIds),
          photosAdded,
        });
      },
    },
  },
});
