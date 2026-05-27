alter table public.profiles
  add column if not exists map_location_source text not null default 'current_home'
  check (map_location_source in ('birthplace', 'current_home', 'secondary_home'));
