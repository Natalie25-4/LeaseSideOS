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
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create trigger organisations_updated_at_trigger
    before update on organisations
    for each row execute function set_updated_at();

create table users (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references organisations(id) on delete cascade,
    email citext not null unique,
    password_hash text not null,
    full_name text not null,
    role text not null default 'property_manager'
        check (role in ('admin', 'property_manager', 'viewer')),
    is_active boolean not null default true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

create index users_organisation_id_idx on users(organisation_id);

create trigger users_updated_at_trigger
    before update on users
    for each row execute function set_updated_at();


