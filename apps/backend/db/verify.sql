-- =============================================================================
-- verify.sql — schema regression test for 001_init.sql
--
-- Run with:  psql $DATABASE_URL -f verify.sql
--
-- EVERY statement marked "should FAIL" must error. If one succeeds, a
-- constraint is missing. Safe to re-run: truncates at start and end.
-- =============================================================================
\set ON_ERROR_STOP off

truncate organisations restart identity cascade;

-- ---------------------------------------------------------------- setup ----
insert into organisations (name) values ('Verify Org');

insert into properties (organisation_id, name, city, property_type, floor_area_sqm)
select id, '14 Kitchener St, Level 3', 'Auckland', 'office', 412 from organisations limit 1;

insert into parties (organisation_id, legal_name, party_type)
select id, 'Marlow & Finch Architects Ltd', 'tenant' from organisations limit 1;

insert into parties (organisation_id, legal_name, party_type)
select id, 'Kitchener Holdings Ltd', 'landlord' from organisations limit 1;

\echo ''
\echo '========================= USERS ========================='

\echo '-- should WORK: valid user'
insert into users (organisation_id, email, password_hash, full_name)
select id, 'dev@leaseside.test', 'placeholder', 'Alex Morgan' from organisations limit 1;

\echo '-- should FAIL: invalid role'
insert into users (organisation_id, email, password_hash, full_name, role)
select id, 'x@y.z', 'h', 'X', 'superuser' from organisations limit 1;

\echo '-- should FAIL: duplicate email, different case (citext)'
insert into users (organisation_id, email, password_hash, full_name)
select id, 'DEV@LEASESIDE.TEST', 'h', 'Dupe' from organisations limit 1;

\echo '-- should FAIL: organisation does not exist'
insert into users (organisation_id, email, password_hash, full_name)
values (gen_random_uuid(), 'a@b.c', 'h', 'Ghost');

\echo '-- should FAIL: no organisation (not null)'
insert into users (email, password_hash, full_name)
values ('b@c.d', 'h', 'Orphan');

\echo ''
\echo '======================= PROPERTIES ======================'

\echo '-- should FAIL: invalid property_type'
insert into properties (organisation_id, name, property_type)
select id, 'Bad Type', 'warehouse' from organisations limit 1;

\echo '-- should FAIL: negative floor area'
insert into properties (organisation_id, name, floor_area_sqm)
select id, 'Negative Area', -50 from organisations limit 1;

\echo '-- should FAIL: no organisation (not null)'
insert into properties (name) values ('Orphan Property');

\echo ''
\echo '======================== PARTIES ========================'

\echo '-- should FAIL: invalid party_type'
insert into parties (organisation_id, legal_name, party_type)
select id, 'Bad Party', 'subtenant' from organisations limit 1;

\echo '-- should FAIL: no party_type (not null)'
insert into parties (organisation_id, legal_name)
select id, 'Typeless' from organisations limit 1;

\echo ''
\echo '========================= LEASES ========================'

\echo '-- should WORK: valid lease'
insert into leases (organisation_id, property_id, tenant_party_id, landlord_party_id,
                    reference, status, commencement_date, expiry_date)
select o.id, p.id, t.id, l.id, 'LS-2024-014', 'active', date '2024-04-01', date '2030-03-31'
from organisations o
join properties p on p.organisation_id = o.id
join parties t on t.organisation_id = o.id and t.party_type = 'tenant'
join parties l on l.organisation_id = o.id and l.party_type = 'landlord'
limit 1;

\echo '-- should FAIL: expiry before commencement'
insert into leases (organisation_id, property_id, commencement_date, expiry_date)
select o.id, p.id, date '2026-01-01', date '2025-01-01'
from organisations o join properties p on p.organisation_id = o.id limit 1;

\echo '-- should FAIL: active lease with no dates'
insert into leases (organisation_id, property_id, status)
select o.id, p.id, 'active'
from organisations o join properties p on p.organisation_id = o.id limit 1;

\echo '-- should FAIL: tenant and landlord are the same party'
insert into leases (organisation_id, property_id, tenant_party_id, landlord_party_id)
select o.id, p.id, t.id, t.id
from organisations o
join properties p on p.organisation_id = o.id
join parties t on t.organisation_id = o.id and t.party_type = 'tenant' limit 1;

\echo '-- should FAIL: duplicate reference within the organisation'
insert into leases (organisation_id, property_id, reference)
select o.id, p.id, 'LS-2024-014'
from organisations o join properties p on p.organisation_id = o.id limit 1;

\echo '-- should FAIL: invalid status'
insert into leases (organisation_id, property_id, status)
select o.id, p.id, 'pending'
from organisations o join properties p on p.organisation_id = o.id limit 1;

\echo ''
\echo '==================== DELETE BEHAVIOUR ==================='

\echo '-- should FAIL: property has a lease (on delete restrict)'
delete from properties where name = '14 Kitchener St, Level 3';

\echo '-- should WORK: deleting the tenant nulls the link but keeps the lease'
delete from parties where party_type = 'tenant';
select reference,
       tenant_party_id is null as tenant_now_null,
       landlord_party_id is not null as landlord_kept
from leases;

\echo ''
\echo '-- should WORK: deleting the organisation cascades everything'
delete from organisations;
select (select count(*) from users)      as users,
       (select count(*) from properties) as properties,
       (select count(*) from parties)    as parties,
       (select count(*) from leases)     as leases;

\echo ''
\echo '======================== TRIGGERS ======================='
insert into organisations (name) values ('Trigger Test');
update organisations set name = 'Trigger Test 2' where name = 'Trigger Test';
select case when updated_at > created_at
            then 'PASS: updated_at trigger fired'
            else 'FAIL: updated_at did not move' end as trigger_check
from organisations where name = 'Trigger Test 2';

\echo ''
\echo '========================= VIEWS ========================='
insert into parties (organisation_id, legal_name, party_type)
select id, 'View Test Tenant', 'tenant' from organisations limit 1;
insert into parties (organisation_id, legal_name, party_type)
select id, 'View Test Landlord', 'landlord' from organisations limit 1;

select (select count(*) from parties)   as all_parties,
       (select count(*) from tenants)   as tenants,
       (select count(*) from landlords) as landlords;
-- expect 2, 1, 1

truncate organisations restart identity cascade;
\echo ''
\echo 'verify.sql complete.'