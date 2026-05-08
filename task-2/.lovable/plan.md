## Plan

Fix the host dashboard event routing so clicking **Attendees** opens the attendee list instead of the event configuration page.

## What I’ll change

1. Convert `src/routes/dashboard.$hostId.events.$eventId.tsx` into a parent layout route that renders an `<Outlet />`.
2. Move the existing event configuration UI into a new index child route, so it still appears at `/dashboard/:hostId/events/:eventId`.
3. Keep `src/routes/dashboard.$hostId.events.$eventId.attendees.tsx` as the attendee-list child route, which will then render correctly at `/dashboard/:hostId/events/:eventId/attendees`.
4. Update any `Route.useParams` / `useParams({ from: ... })` references in the moved edit page to match the new index route path.

## Technical note

This is the same layout-route issue as the earlier dashboard-level fix, but one level deeper: the event route has a child route (`/attendees`) but currently renders the edit form directly instead of rendering an outlet for children.