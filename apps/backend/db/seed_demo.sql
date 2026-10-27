begin;

with org as (
  insert into organisations (name)
  values ('Sheehy Property Group')
  returning id
),
prop as (
  insert into properties
    (organisation_id, name, address_line1, suburb, city, postcode, property_type, floor_area_sqm)
  select id, 'Victoria Street West Office', '120 Victoria Street West',
         'Auckland CBD', 'Auckland', '1010', 'office', 412
  from org
  returning id, organisation_id
),
tenant as (
  insert into parties
    (organisation_id, legal_name, trading_name, party_type, contact_name, contact_email)
  select organisation_id, 'Harbourline Technologies Limited', 'Harbourline',
         'tenant', 'Dana Whitiora', 'dana@harbourline.example'
  from prop
  returning id
),
landlord as (
  insert into parties (organisation_id, legal_name, party_type, contact_name)
  select organisation_id, 'Sheehy Holdings Limited', 'landlord', 'Chris Sheehy'
  from prop
  returning id
)
insert into leases
  (organisation_id, property_id, tenant_party_id, landlord_party_id,
   reference, status, commencement_date, expiry_date)
select prop.organisation_id, prop.id, tenant.id, landlord.id,
       'LS-2026-001', 'active', date '2025-04-01', date '2035-03-31'
from prop, tenant, landlord;

commit;