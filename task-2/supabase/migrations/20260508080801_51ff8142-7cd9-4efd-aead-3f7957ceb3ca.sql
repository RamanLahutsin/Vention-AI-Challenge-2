
create type public.rsvp_status as enum ('going', 'waitlist', 'cancelled');

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null,
  status public.rsvp_status not null default 'going',
  code text not null default encode(gen_random_bytes(6), 'hex'),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index rsvps_unique_active_idx on public.rsvps(event_id, user_id) where status <> 'cancelled';
create index rsvps_event_status_created_idx on public.rsvps(event_id, status, created_at);
create index rsvps_user_idx on public.rsvps(user_id);

create trigger rsvps_touch before update on public.rsvps
  for each row execute function public.touch_updated_at();

alter table public.rsvps enable row level security;

create policy "Users view own rsvps" on public.rsvps for select
  using (auth.uid() = user_id);

create policy "Hosts view rsvps for their events" on public.rsvps for select
  using (exists (
    select 1 from public.events e
    join public.host_members hm on hm.host_id = e.host_id
    where e.id = rsvps.event_id and hm.user_id = auth.uid()
  ));

create policy "Users create own rsvps" on public.rsvps for insert
  with check (auth.uid() = user_id);

create policy "Users update own rsvps" on public.rsvps for update
  using (auth.uid() = user_id);

create policy "Hosts update rsvps (check-in)" on public.rsvps for update
  using (exists (
    select 1 from public.events e
    join public.host_members hm on hm.host_id = e.host_id
    where e.id = rsvps.event_id and hm.user_id = auth.uid()
  ));

-- RPC: rsvp_to_event — atomic capacity + waitlist
create or replace function public.rsvp_to_event(_event_id uuid)
returns public.rsvps
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _event public.events;
  _going_count int;
  _existing public.rsvps;
  _new_status public.rsvp_status;
  _result public.rsvps;
begin
  if _uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into _event from public.events where id = _event_id for update;
  if not found then raise exception 'Event not found'; end if;
  if _event.status <> 'published' then raise exception 'Event is not published'; end if;
  if _event.ends_at < now() then raise exception 'Event has ended'; end if;

  select * into _existing from public.rsvps
    where event_id = _event_id and user_id = _uid and status <> 'cancelled'
    limit 1;
  if found then
    return _existing;
  end if;

  if _event.capacity > 0 then
    select count(*) into _going_count from public.rsvps
      where event_id = _event_id and status = 'going';
    if _going_count >= _event.capacity then
      _new_status := 'waitlist';
    else
      _new_status := 'going';
    end if;
  else
    _new_status := 'going';
  end if;

  insert into public.rsvps (event_id, user_id, status)
  values (_event_id, _uid, _new_status)
  returning * into _result;

  return _result;
end;
$$;

-- RPC: cancel_rsvp — cancel and promote next waitlister
create or replace function public.cancel_rsvp(_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _existing public.rsvps;
  _next public.rsvps;
  _event public.events;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;

  select * into _event from public.events where id = _event_id for update;
  if not found then raise exception 'Event not found'; end if;

  select * into _existing from public.rsvps
    where event_id = _event_id and user_id = _uid and status <> 'cancelled'
    limit 1;
  if not found then return; end if;

  update public.rsvps set status = 'cancelled' where id = _existing.id;

  if _existing.status = 'going' and _event.capacity > 0 then
    select * into _next from public.rsvps
      where event_id = _event_id and status = 'waitlist'
      order by created_at asc limit 1;
    if found then
      update public.rsvps set status = 'going' where id = _next.id;
    end if;
  end if;
end;
$$;

-- RPC: event_rsvp_counts
create or replace function public.event_rsvp_counts(_event_id uuid)
returns table(going int, waitlist int)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) filter (where status = 'going')::int as going,
    count(*) filter (where status = 'waitlist')::int as waitlist
  from public.rsvps where event_id = _event_id;
$$;
