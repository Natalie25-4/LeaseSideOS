create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create table organisations (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

create trigger organisations_updated_at_trigger
    before update on organisations
    for each row execute procedure set_updated_at();

