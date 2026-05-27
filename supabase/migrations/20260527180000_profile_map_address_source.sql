-- Allow street address as a selectable profile map location source.

alter table public.profiles
  drop constraint if exists profiles_map_location_source_check;

alter table public.profiles
  add constraint profiles_map_location_source_check
  check (map_location_source in ('birthplace', 'current_home', 'secondary_home', 'address'));
