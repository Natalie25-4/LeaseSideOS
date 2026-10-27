create table documents (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  lease_id uuid references leases(id) on delete set null,
  document_type text not null default 'lease'
    check (document_type in ('lease','variation','renewal','other')),
  filename text not null,
  page_count integer check (page_count is null or page_count > 0),
  effective_date date,
  executed_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_organisation_id_idx on documents (organisation_id);
create index documents_lease_id_idx on documents (lease_id);

create trigger documents_updated_at_trigger
  before update on documents
  for each row execute function set_updated_at();

create table clauses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  document_id uuid not null references documents(id) on delete cascade,
  clause_type text not null,
  clause_reference text,
  page_number integer not null check (page_number >= 1),
  char_start integer not null check (char_start >= 0),
  char_end integer not null,
  source_text text not null,
  extracted_value jsonb,
  confidence numeric(3,2) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  method text not null,
  model_name text not null,
  prompt_version text not null,
  created_at timestamptz not null default now(),
  constraint clauses_char_range check (char_end > char_start),
  constraint clauses_no_duplicate unique (document_id, clause_type, char_start)
);

create index clauses_document_id_idx on clauses (document_id);
create index clauses_org_type_idx on clauses (organisation_id, clause_type);