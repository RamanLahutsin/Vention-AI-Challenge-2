-- Event gallery: photos uploaded by attendees, viewable by attendees and hosts

create table public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null,
  user_id uuid not null,
  storage_path text not null,
  caption text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create index event_photos_event_idx on public.event_photos(event_id, created_at desc);

alter table public.event_photos enable row level security;

-- Helper: did user attend (going) this event
create or replace function public.user_attended_event(_user_id uuid, _event_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.rsvps
    where event_id = _event_id and user_id = _user_id and status = 'going'
  )
$$;

create policy "Attendees and hosts view photos"
on public.event_photos for select
using (
  is_hidden = false and (
    public.user_attended_event(auth.uid(), event_id)
    or exists (
      select 1 from public.events e
      join public.host_members hm on hm.host_id = e.host_id
      where e.id = event_photos.event_id and hm.user_id = auth.uid()
    )
  )
  or auth.uid() = user_id
);

create policy "Attendees upload photos"
on public.event_photos for insert
with check (
  auth.uid() = user_id
  and public.user_attended_event(auth.uid(), event_id)
);

create policy "Owner or host can delete"
on public.event_photos for delete
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.events e
    join public.host_members hm on hm.host_id = e.host_id
    where e.id = event_photos.event_id and hm.user_id = auth.uid()
  )
);

create policy "Hosts can hide photos"
on public.event_photos for update
using (
  exists (
    select 1 from public.events e
    join public.host_members hm on hm.host_id = e.host_id
    where e.id = event_photos.event_id and hm.user_id = auth.uid()
  )
);

-- Storage bucket for event photos
insert into storage.buckets (id, name, public) values ('event-photos', 'event-photos', true)
on conflict (id) do nothing;

create policy "Public can view event photos"
on storage.objects for select
using (bucket_id = 'event-photos');

create policy "Attendees upload to event-photos"
on storage.objects for insert
with check (
  bucket_id = 'event-photos'
  and auth.uid()::text = (storage.foldername(name))[2]
);

create policy "Owners delete own files"
on storage.objects for delete
using (
  bucket_id = 'event-photos'
  and auth.uid()::text = (storage.foldername(name))[2]
);
