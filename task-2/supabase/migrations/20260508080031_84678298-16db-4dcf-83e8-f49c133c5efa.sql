
-- Enums
create type public.host_role as enum ('host', 'checker');
create type public.event_visibility as enum ('public', 'unlisted');
create type public.event_status as enum ('draft', 'published');

-- Hosts
create table public.hosts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  bio text,
  logo_url text,
  contact_email text,
  owner_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index hosts_owner_idx on public.hosts(owner_id);

-- Host members
create table public.host_members (
  host_id uuid not null references public.hosts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.host_role not null default 'host',
  created_at timestamptz not null default now(),
  primary key (host_id, user_id)
);
create index host_members_user_idx on public.host_members(user_id);

-- Events
create table public.events (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'UTC',
  venue text,
  online_url text,
  capacity integer not null default 0 check (capacity >= 0),
  cover_url text,
  visibility public.event_visibility not null default 'public',
  status public.event_status not null default 'draft',
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index events_host_idx on public.events(host_id);
create index events_starts_idx on public.events(starts_at);
create index events_status_idx on public.events(status);

-- Triggers for updated_at
create trigger hosts_updated_at before update on public.hosts
  for each row execute function public.touch_updated_at();
create trigger events_updated_at before update on public.events
  for each row execute function public.touch_updated_at();

-- Role helper (SECURITY DEFINER, locked down)
create or replace function public.has_host_role(_user_id uuid, _host_id uuid, _role public.host_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.host_members
    where user_id = _user_id and host_id = _host_id and role = _role
  )
$$;
revoke execute on function public.has_host_role(uuid, uuid, public.host_role) from public, anon;
grant execute on function public.has_host_role(uuid, uuid, public.host_role) to authenticated;

-- Auto-add creator as host member
create or replace function public.add_owner_as_host_member()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.host_members (host_id, user_id, role)
  values (new.id, new.owner_id, 'host')
  on conflict do nothing;
  return new;
end;
$$;
revoke execute on function public.add_owner_as_host_member() from public, anon, authenticated;

create trigger hosts_add_owner_member after insert on public.hosts
  for each row execute function public.add_owner_as_host_member();

-- RLS
alter table public.hosts enable row level security;
alter table public.host_members enable row level security;
alter table public.events enable row level security;

-- hosts policies
create policy "Hosts are viewable by everyone"
  on public.hosts for select using (true);

create policy "Authenticated users can create a host"
  on public.hosts for insert
  with check (auth.uid() = owner_id);

create policy "Host members with host role can update"
  on public.hosts for update
  using (public.has_host_role(auth.uid(), id, 'host'));

create policy "Owner can delete host"
  on public.hosts for delete
  using (auth.uid() = owner_id);

-- host_members policies
create policy "Host members are viewable by everyone"
  on public.host_members for select using (true);

create policy "Hosts can add members"
  on public.host_members for insert
  with check (public.has_host_role(auth.uid(), host_id, 'host'));

create policy "Hosts can update members"
  on public.host_members for update
  using (public.has_host_role(auth.uid(), host_id, 'host'));

create policy "Members can leave or hosts can remove"
  on public.host_members for delete
  using (auth.uid() = user_id or public.has_host_role(auth.uid(), host_id, 'host'));

-- events policies
create policy "Published public events are viewable by everyone"
  on public.events for select
  using (
    (status = 'published' and visibility = 'public')
    or (status = 'published' and visibility = 'unlisted')
    or (auth.uid() is not null and exists (
      select 1 from public.host_members hm
      where hm.host_id = events.host_id and hm.user_id = auth.uid()
    ))
  );

create policy "Hosts can create events"
  on public.events for insert
  with check (public.has_host_role(auth.uid(), host_id, 'host'));

create policy "Hosts can update events"
  on public.events for update
  using (public.has_host_role(auth.uid(), host_id, 'host'));

create policy "Hosts can delete events"
  on public.events for delete
  using (public.has_host_role(auth.uid(), host_id, 'host'));

-- Storage buckets
insert into storage.buckets (id, name, public) values
  ('host-logos', 'host-logos', true),
  ('event-covers', 'event-covers', true);

-- Storage policies
create policy "Public read host logos"
  on storage.objects for select using (bucket_id = 'host-logos');
create policy "Authenticated upload host logos"
  on storage.objects for insert
  with check (bucket_id = 'host-logos' and auth.uid() is not null);
create policy "Authenticated update own host logos"
  on storage.objects for update
  using (bucket_id = 'host-logos' and auth.uid() = owner);
create policy "Authenticated delete own host logos"
  on storage.objects for delete
  using (bucket_id = 'host-logos' and auth.uid() = owner);

create policy "Public read event covers"
  on storage.objects for select using (bucket_id = 'event-covers');
create policy "Authenticated upload event covers"
  on storage.objects for insert
  with check (bucket_id = 'event-covers' and auth.uid() is not null);
create policy "Authenticated update own event covers"
  on storage.objects for update
  using (bucket_id = 'event-covers' and auth.uid() = owner);
create policy "Authenticated delete own event covers"
  on storage.objects for delete
  using (bucket_id = 'event-covers' and auth.uid() = owner);
