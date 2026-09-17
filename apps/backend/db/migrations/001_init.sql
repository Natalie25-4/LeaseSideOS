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

create table properties (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references organisations(id) on delete cascade,
    name text not null,
    address_line1 text,
    address_line2 text,
    suburb text,
    city text,
    postcode text,
    country text not null default 'NZ',
    property_type text
        check (property_type in ('office', 'retail', 'industrial', 'mixed')),
    floor_area_sqm numeric(10,2)
        check (floor_area_sqm is null or floor_area_sqm > 0),
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()  
);

create index properties_organisation_id_idx on properties(organisation_id);

create trigger properties_updated_at_trigger
    before update on properties
    for each row execute function set_updated_at();

create table parties (
    id uuid primary key default gen_random_uuid(),
    organisation_id uuid not null references organisations(id) on delete cascade,
    legal_name text not null,
    trading_name text,
    party_type text not null
        check (party_type in ('tenant', 'landlord', 'guarantor', 'agent')),
    nzbn text,
    contact_name text,
    contact_email citext,
    contact_phone text,
    postal_address text,
    notes text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()  
);

create index parties_organisation_id_idx on parties(organisation_id);
create index parties_type_idx on parties(organisation_id,party_type);

create trigger parties_updated_at_trigger
    before update on parties
    for each row execute function set_updated_at();

create view tenants     as select * from parties where party_type = 'tenant';
create view landlords   as select * from parties where party_type = 'landlord';


