begin;

-- ---------- lease_takapuna.pdf ----------
with target as (
  select l.id as lease_id, l.organisation_id, l.property_id
    from leases l
    join documents d on d.lease_id = l.id
   where d.filename = 'lease_takapuna.pdf'
   limit 1
),
tenant as (
  insert into parties
    (organisation_id, legal_name, trading_name, party_type, contact_name, contact_email)
  select organisation_id, 'Tasman Ridge Outfitters Limited', 'Tasman Ridge',
         'tenant', 'Mere Walker', 'mere@tasmanridge.example'
    from target
  returning id
),
landlord as (
  insert into parties (organisation_id, legal_name, party_type, contact_name)
  select organisation_id, 'Kowhai Estates Limited', 'landlord', 'Alan Kerr'
    from target
  returning id
),
prop as (
  update properties set
      name           = 'Level 2, 88 Rangitoto Terrace, Takapuna',
      address_line1  = '88 Rangitoto Terrace',
      suburb         = 'Takapuna',
      city           = 'Auckland',
      postcode       = '0622',
      property_type  = 'office',
      floor_area_sqm = 412
   where id = (select property_id from target)
  returning id
)
update leases set
    tenant_party_id   = (select id from tenant),
    landlord_party_id = (select id from landlord),
    reference         = 'LS-2025-001',
    status            = 'active',
    commencement_date = date '2025-04-01',
    expiry_date       = date '2031-03-31'
 where id = (select lease_id from target);

-- ---------- sample_lease.pdf ----------
with target as (
  select l.id as lease_id, l.organisation_id, l.property_id
    from leases l
    join documents d on d.lease_id = l.id
   where d.filename = 'sample_lease.pdf'
   limit 1
),
tenant as (
  insert into parties
    (organisation_id, legal_name, trading_name, party_type, contact_name, contact_email)
  select organisation_id, 'Beacon Coffee Roasters Limited', 'Beacon Coffee',
         'tenant', 'Sam Iosefa', 'sam@beaconcoffee.example'
    from target
  returning id
),
landlord as (
  insert into parties (organisation_id, legal_name, party_type, contact_name)
  select organisation_id, 'Anchor Property Holdings Limited', 'landlord', 'Rita Lowe'
    from target
  returning id
),
prop as (
  update properties set
      name           = 'Level 3, 14 Kitchener Street',
      address_line1  = '14 Kitchener Street',
      suburb         = 'Auckland CBD',
      city           = 'Auckland',
      postcode       = '1010',
      property_type  = 'retail',
      floor_area_sqm = 188
   where id = (select property_id from target)
  returning id
)
update leases set
    tenant_party_id   = (select id from tenant),
    landlord_party_id = (select id from landlord),
    reference         = 'LS-2024-014',
    status            = 'active',
    commencement_date = date '2024-04-01',
    expiry_date       = date '2030-03-31'
 where id = (select lease_id from target);

commit;