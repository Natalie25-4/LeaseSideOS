import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { env } from "../config/env.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const leasesRouter = Router();

leasesRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(`
    select
      l.id, l.reference, l.status, l.commencement_date, l.expiry_date,
      p.name       as property_name,
      t.legal_name as tenant_name
    from leases l
    join properties p on p.id = l.property_id
    left join parties t on t.id = l.tenant_party_id
    order by l.expiry_date nulls last, l.reference
  `);
  res.json(rows);
});

leasesRouter.get("/:id/clauses", async (req, res) => {
  const { rows } = await pool.query(
    `select c.*, d.filename, d.document_type
       from clauses c
       join documents d on d.id = c.document_id
      where d.lease_id = $1
      order by c.page_number, c.char_start`,
    [req.params.id]
  );
  res.json(rows);
});

leasesRouter.post("/:id/documents", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const { rows: leaseRows } = await pool.query(
    "select id, organisation_id from leases where id = $1",
    [req.params.id]
  );
  const lease = leaseRows[0];
  if (!lease) return res.status(404).json({ error: "lease not found" });

  const base = env.LEASE_INTELLIGENCE_URL;

  // 1. PDF -> pages
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(req.file.buffer)]), req.file.originalname);

  const pagesRes = await fetch(`${base}/documents/pages`, { method: "POST", body: form });
  if (!pagesRes.ok) {
    return res.status(502).json({ error: "pdf parsing failed", detail: await pagesRes.text() });
  }
  const { pages, page_count } = (await pagesRes.json()) as {
    pages: { page_number: number; text: string }[];
    page_count: number;
  };

  // 2. pages -> clauses
  const extractRes = await fetch(`${base}/clauses/extract`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pages }),
  });
  if (!extractRes.ok) {
    return res.status(502).json({ error: "extraction failed", detail: await extractRes.text() });
  }
  const extraction = (await extractRes.json()) as { clauses: any[]; provider: string };

  // 3. persist both in one transaction
  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows: docRows } = await client.query(
      `insert into documents
         (organisation_id, lease_id, document_type, filename, page_count)
       values ($1, $2, $3, $4, $5)
       returning id, filename, page_count, document_type, created_at`,
      [
        lease.organisation_id,
        lease.id,
        req.body.document_type ?? "lease",
        req.file.originalname,
        page_count,
      ]
    );
    const documentId = docRows[0].id;

    for (const c of extraction.clauses) {
      await client.query(
        `insert into clauses
           (organisation_id, document_id, clause_type, clause_reference, page_number,
            char_start, char_end, source_text, extracted_value, confidence,
            method, model_name, prompt_version)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (document_id, clause_type, char_start) do nothing`,
        [
          lease.organisation_id, documentId, c.clause_type, c.clause_reference,
          c.page_number, c.char_start, c.char_end, c.source_text,
          c.extracted_value, c.confidence, c.method, c.model_name, c.prompt_version,
        ]
      );
    }

    await client.query("commit");
    res.status(201).json({
      document: docRows[0],
      clauses: extraction.clauses,
      provider: extraction.provider,
    });
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
});

leasesRouter.post("/:id/ask", async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) return res.status(400).json({ error: "question is required" });

  const { rows: clauses } = await pool.query(
    `select c.clause_type, c.clause_reference, c.page_number,
            c.source_text, c.extracted_value
       from clauses c
       join documents d on d.id = c.document_id
      where d.lease_id = $1
      order by c.page_number, c.char_start`,
    [req.params.id]
  );

  const { rows: pageRows } = await pool.query(
    `select dp.page_number, dp.text
       from document_pages dp
       join documents d on d.id = dp.document_id
      where d.lease_id = $1
      order by d.created_at, dp.page_number`,
    [req.params.id]
  );

  if (clauses.length === 0 && pageRows.length === 0) {
    return res.status(409).json({ error: "no document stored for this lease yet" });
  }

  const r = await fetch(`${env.LEASE_INTELLIGENCE_URL}/clauses/answer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, clauses, pages: pageRows }),
  });
  if (!r.ok) {
    return res.status(502).json({ error: "answer failed", detail: await r.text() });
  }
  res.json(await r.json());
});