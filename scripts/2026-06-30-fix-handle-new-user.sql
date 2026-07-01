create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to 'public'
as $fn$
declare
  base_username text;
  final_display_name text;
begin
  base_username := lower(regexp_replace(
    coalesce(
      nullif(new.raw_user_meta_data ->> 'preferred_username', ''),
      nullif(new.raw_user_meta_data ->> 'user_name', ''),
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'player'),
    '[^a-zA-Z0-9_]+', '', 'g'));
  if base_username = '' then base_username := 'player'; end if;
  final_display_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    nullif(new.raw_user_meta_data ->> 'user_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Player');
  insert into public.profiles (id, email, display_name, username, apple_private_email)
  values (
    new.id, new.email, final_display_name,
    left(base_username, 23) || '_' || substr(replace(new.id::text, '-', ''), 1, 8),
    coalesce(new.email, '') ilike '%privaterelay.appleid.com')
  on conflict (id) do nothing;
  return new;
end;
$fn$;
