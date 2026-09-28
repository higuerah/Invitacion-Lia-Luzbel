-- Run once in the Supabase SQL editor. Use the Table Editor to create guests.
create extension if not exists pgcrypto;

create table if not exists public.event_settings (
  id boolean primary key default true check (id),
  capacity integer not null check (capacity > 0),
  deadline timestamptz not null,
  admin_email text not null default 'CAMBIA_POR_TU_CORREO',
  deadline_text text not null default 'Confirma antes del 30 de septiembre.'
);
insert into public.event_settings(id, capacity, deadline)
values (true, 100, '2026-10-01 00:00:00-07')
on conflict (id) do nothing;

create table if not exists public.guests (
  id uuid primary key default gen_random_uuid(),
  token uuid not null unique default gen_random_uuid(),
  label text not null check (length(trim(label)) between 1 and 100),
  max_adults integer not null check (max_adults between 0 and 30),
  max_children integer not null check (max_children between 0 and 30),
  constraint places_per_invitation check (max_adults + max_children between 1 and 30),
  active boolean not null default true
);

create table if not exists public.rsvps (
  guest_id uuid primary key references public.guests(id) on delete cascade,
  status text not null check (status in ('attending','declined')),
  adults integer not null check (adults between 0 and 30),
  children integer not null check (children between 0 and 30),
  updated_at timestamptz not null default now(),
  check ((status = 'declined' and adults = 0 and children = 0)
      or (status = 'attending' and adults + children >= 1))
);

alter table public.event_settings enable row level security;
alter table public.guests enable row level security;
alter table public.rsvps enable row level security;
revoke all on public.event_settings, public.guests, public.rsvps from anon, authenticated;

-- The dashboard is accessible only to the email owner who signs in by email link.
create or replace function public.is_event_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.event_settings
    where id = true and lower(admin_email) = lower(auth.jwt()->>'email'));
$$;
revoke all on function public.is_event_admin() from public;
grant execute on function public.is_event_admin() to authenticated;
grant select on public.event_settings to authenticated;
grant select, insert, update, delete on public.guests to authenticated;
grant select on public.rsvps to authenticated;
create policy admin_read_settings on public.event_settings for select to authenticated
  using (public.is_event_admin());
create policy admin_manage_guests on public.guests for all to authenticated
  using (public.is_event_admin()) with check (public.is_event_admin());
create policy admin_read_rsvps on public.rsvps for select to authenticated
  using (public.is_event_admin());

create or replace function public.get_invitation(p_token uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_guest public.guests%rowtype;
declare v_rsvp public.rsvps%rowtype;
begin
  select * into v_guest from public.guests where token = p_token and active;
  if not found then return null; end if;
  select * into v_rsvp from public.rsvps where guest_id = v_guest.id;
  return jsonb_build_object(
    'label', v_guest.label, 'max_seats', v_guest.max_adults + v_guest.max_children,
    'max_adults', v_guest.max_adults, 'max_children', v_guest.max_children,
    'deadline_text', (select deadline_text from public.event_settings where id = true),
    'rsvp', case when v_rsvp.guest_id is null then null else
      jsonb_build_object('status',v_rsvp.status,'adults',v_rsvp.adults,'children',v_rsvp.children) end
  );
end;
$$;

create or replace function public.submit_rsvp(p_token uuid, p_adults integer, p_children integer)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare v_guest public.guests%rowtype;
declare v_settings public.event_settings%rowtype;
declare v_used integer;
declare v_status text;
begin
  -- Lock the one settings row so concurrent confirmations cannot overbook.
  select * into v_settings from public.event_settings where id = true for update;
  if not found then raise exception 'La confirmación aún no está disponible.'; end if;
  if now() >= v_settings.deadline then raise exception 'Ya cerró el plazo de confirmación.'; end if;
  select * into v_guest from public.guests where token = p_token and active;
  if not found then raise exception 'No encontramos esta invitación.'; end if;
  if p_adults is null or p_children is null or p_adults < 0 or p_children < 0
     or p_adults > v_guest.max_adults or p_children > v_guest.max_children then
    raise exception 'Revisa los lugares reservados para esta invitación.';
  end if;
  v_status := case when p_adults + p_children = 0 then 'declined' else 'attending' end;
  select coalesce(sum(r.adults + r.children),0) into v_used
    from public.rsvps r join public.guests g on g.id = r.guest_id
    where r.guest_id <> v_guest.id and r.status = 'attending' and g.active;
  if v_status = 'attending' and v_used + p_adults + p_children > v_settings.capacity then
    raise exception 'Ya no quedan lugares disponibles. Comunícate con quien te invitó.';
  end if;
  insert into public.rsvps(guest_id,status,adults,children)
    values(v_guest.id,v_status,p_adults,p_children)
    on conflict(guest_id) do update set status=excluded.status,
      adults=excluded.adults, children=excluded.children, updated_at=now();
  return jsonb_build_object('rsvp', jsonb_build_object(
    'status',v_status,'adults',p_adults,'children',p_children));
end;
$$;

revoke all on function public.get_invitation(uuid), public.submit_rsvp(uuid,integer,integer) from public;
grant execute on function public.get_invitation(uuid), public.submit_rsvp(uuid,integer,integer) to anon;

-- Add invitees in the Table Editor: label, max_adults and max_children; leave id/token blank.
-- Read total: select coalesce(sum(r.adults+r.children),0) from public.rsvps r join public.guests g on g.id=r.guest_id where r.status='attending' and g.active;
-- Unique link: https://higuerah.github.io/REPOSITORY/?i=TOKEN_FROM_GUESTS_TABLE
