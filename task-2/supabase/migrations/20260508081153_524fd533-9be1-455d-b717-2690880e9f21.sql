
-- feedback
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index feedback_event_idx on public.feedback(event_id);

alter table public.feedback enable row level security;

create policy "Attendees view own feedback" on public.feedback for select
  using (auth.uid() = user_id);

create policy "Hosts view feedback for their events" on public.feedback for select
  using (exists (
    select 1 from public.events e
    join public.host_members hm on hm.host_id = e.host_id
    where e.id = feedback.event_id and hm.user_id = auth.uid()
  ));

create policy "Attendees submit feedback after event" on public.feedback for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.events e
      join public.rsvps r on r.event_id = e.id
      where e.id = feedback.event_id
        and r.user_id = auth.uid()
        and r.status = 'going'
        and e.ends_at < now()
    )
  );

-- reports
create type public.report_subject as enum ('event', 'host');
create type public.report_status as enum ('open', 'reviewed', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  subject_type public.report_subject not null,
  subject_id uuid not null,
  reporter_id uuid not null,
  reason text not null,
  status public.report_status not null default 'open',
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reports_subject_idx on public.reports(subject_type, subject_id);

create trigger reports_touch before update on public.reports
  for each row execute function public.touch_updated_at();

alter table public.reports enable row level security;

create policy "Reporter views own reports" on public.reports for select
  using (auth.uid() = reporter_id);

create policy "Hosts view reports about their stuff" on public.reports for select
  using (
    (subject_type = 'event' and exists (
      select 1 from public.events e
      join public.host_members hm on hm.host_id = e.host_id
      where e.id = reports.subject_id and hm.user_id = auth.uid()
    ))
    or
    (subject_type = 'host' and exists (
      select 1 from public.host_members hm
      where hm.host_id = reports.subject_id and hm.user_id = auth.uid()
    ))
  );

create policy "Authenticated users can create reports" on public.reports for insert
  with check (auth.uid() = reporter_id);

create policy "Hosts can update reports about their stuff" on public.reports for update
  using (
    (subject_type = 'event' and exists (
      select 1 from public.events e
      join public.host_members hm on hm.host_id = e.host_id
      where e.id = reports.subject_id and hm.user_id = auth.uid()
    ))
    or
    (subject_type = 'host' and exists (
      select 1 from public.host_members hm
      where hm.host_id = reports.subject_id and hm.user_id = auth.uid()
    ))
  );

-- hide events
alter table public.events add column is_hidden boolean not null default false;

drop policy "Published public events are viewable by everyone" on public.events;

create policy "Published public events are viewable by everyone" on public.events for select
  using (
    (status = 'published' and visibility = 'public' and is_hidden = false)
    or (status = 'published' and visibility = 'unlisted' and is_hidden = false)
    or (auth.uid() is not null and exists (
      select 1 from public.host_members hm
      where hm.host_id = events.host_id and hm.user_id = auth.uid()
    ))
  );
