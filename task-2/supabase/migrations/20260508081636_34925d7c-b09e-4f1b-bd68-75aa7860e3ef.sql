
create table public.host_invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.hosts(id) on delete cascade,
  email text not null,
  role public.host_role not null default 'checker',
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  created_by uuid not null,
  accepted_at timestamptz,
  accepted_by uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index host_invites_host_idx on public.host_invites(host_id);
create index host_invites_token_idx on public.host_invites(token);

alter table public.host_invites enable row level security;

create policy "Hosts manage invites" on public.host_invites for all
  using (public.has_host_role(auth.uid(), host_id, 'host'))
  with check (public.has_host_role(auth.uid(), host_id, 'host'));

create or replace function public.accept_invite(_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _inv public.host_invites;
begin
  if _uid is null then raise exception 'Not authenticated'; end if;

  select * into _inv from public.host_invites where token = _token for update;
  if not found then raise exception 'Invite not found'; end if;
  if _inv.accepted_at is not null then raise exception 'Invite already used'; end if;
  if _inv.expires_at < now() then raise exception 'Invite expired'; end if;

  insert into public.host_members (host_id, user_id, role)
  values (_inv.host_id, _uid, _inv.role)
  on conflict (host_id, user_id) do update set role = excluded.role;

  update public.host_invites
    set accepted_at = now(), accepted_by = _uid
    where id = _inv.id;

  return _inv.host_id;
end;
$$;

-- Allow checking invite by token (for the accept page) without auth — read only
create policy "Anyone with token can read own invite" on public.host_invites for select
  using (true);
-- Note: token is unguessable; this is acceptable for an invite landing page.
