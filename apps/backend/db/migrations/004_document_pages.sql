create table document_pages (
  document_id uuid not null references documents(id) on delete cascade,
  page_number integer not null check (page_number >= 1),
  text text not null,
  primary key (document_id, page_number)
);