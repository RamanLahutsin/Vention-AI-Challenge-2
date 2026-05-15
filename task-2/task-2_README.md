# Task 2 Usage Guide

This guide explains how to run and use Task 2 through the main operational journey:

Publish -> RSVP -> Ticket -> Check-in

It is a practical walkthrough for Hosts, Attendees, and Checkers.

## 1) Run the app locally

1. Open a terminal at the repository root.
2. Move into Task 2:
   - cd task-2
3. Install dependencies:
   - npm install
4. Start development server:
   - npm run dev
5. Open the local URL shown in the terminal.

## 2) Publish flow (Host)

### Step 1: Sign in and become a Host

1. Go to Sign up or Sign in.
2. Open Become Host.
3. Fill Host profile details:
   - name
   - logo
   - short bio
   - contact email
4. Submit and confirm the Host page is created.

Expected result:

- You now have Host-level access to create and manage events.

### Step 2: Create event draft

1. Open Dashboard for your Host.
2. Create a new event.
3. Fill core event fields:
   - title and description
   - start and end date/time with timezone context
   - venue address or online link
   - capacity
   - cover image
4. Choose visibility:
   - Public (searchable)
   - Unlisted (link-only)
5. Leave status as Draft while editing.

Expected result:

- Event is saved but not publicly active yet.

### Step 3: Configure pricing toggle

1. In the event editor, find Free/Paid toggle.
2. Keep Free enabled.
3. Observe Paid as disabled with Coming soon tooltip.

Expected result:

- Pricing intent is visible, but only free event flow is currently active.

### Step 4: Publish and share

1. Change event status to Published.
2. Copy event link and share it.
3. If needed later, use Unpublish to stop new RSVPs.

Expected result:

- Public events appear in Explore.
- Unlisted events remain accessible via direct link.

## 3) RSVP flow (Attendee)

### Step 1: Find an event

1. Browse Explore page.
2. Use search and filters (date/location/include past) to narrow results.
3. Open the target event page.

Expected result:

- Event details page is visible.

### Step 2: RSVP with auth redirect

1. Click RSVP.
2. If signed out, complete sign-in.
3. After sign-in, verify you are returned to the same event page.
4. Click RSVP again if needed.

Expected result:

- You are added as Going, or placed on Waitlist when capacity is full.

### Step 3: Cancel RSVP (optional)

1. On the event page, choose cancel RSVP.
2. Confirm status update.

Expected result:

- Your seat is released and waitlist promotion can occur automatically.

### Step 4: Ended event behavior

1. Open an event whose end time has passed.
2. Confirm Ended state is shown.

Expected result:

- RSVP action is hidden for ended events.

## 4) Ticket flow (Attendee)

### Step 1: Open My Tickets

1. Navigate to Tickets page.
2. Find your upcoming event ticket.

Expected result:

- Ticket appears with unique code and QR.

### Step 2: Use Add to Calendar

1. Open ticket details.
2. Use Add to Calendar option.
3. Confirm event appears in your calendar app after import.

Expected result:

- You have a calendar reminder tied to event timing.

### Step 3: Keep ticket ready for entry

1. Keep the ticket code visible before arrival.
2. Provide code to venue checker during entry.

Expected result:

- Check-in can be completed quickly via manual code entry.

## 5) Check-in flow (Checker)

### Step 1: Open event check-in page

1. Sign in with a Checker account that belongs to the Host.
2. Open Host Dashboard -> target event -> Attendees/Check-in page.

Expected result:

- Check-in console shows attendee list and counters.

### Step 2: Manual code check-in

1. Enter attendee code into manual code input.
2. Submit check-in.

Expected result:

- Matching attendee is marked checked-in.
- Checked-in counter updates live.

### Step 3: Duplicate prevention

1. Try checking in the same code again.

Expected result:

- System blocks duplicate check-in and shows feedback.

### Step 4: Undo last scan/check-in

1. Use undo/toggle action for the most recent check-in.

Expected result:

- Last check-in is reverted and counters are corrected.

## 6) Operations quick guide

### Host dashboard metrics

- Use dashboard cards/lists to monitor:
  - Going
  - Waitlist
  - Checked-in

### Export CSV

1. Open event attendees/check-in view.
2. Trigger CSV export.
3. Open exported file in Excel or Google Sheets.

### My Events workspace

1. Open My Events.
2. Filter by host, date, and text query.
3. Use quick actions according to your role.

### Post-event feedback

1. After event end, attendees can submit:
   - 1-5 star rating
   - optional comment

### Gallery moderation

1. Attendees upload event photos.
2. Host reviews submissions and approves visibility for public gallery.

### Report and review queue

1. Report event or photo when needed.
2. Open Reports queue in dashboard.
3. Review and hide items as required.

## 7) Suggested demo script for reviewers

If you need to demonstrate the full flow quickly:

1. Host publishes a new event.
2. Attendee RSVPs and opens ticket.
3. Checker checks attendee in by manual code.
4. Host exports CSV and reviews counters.

This sequence validates the core product path in one pass.
