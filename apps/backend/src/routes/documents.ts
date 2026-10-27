import { Router } from "express";
import multer from "multer";
import { pool } from "../db.js";
import { env } from "../config/env.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

export const documentsRouter = Router();

/** Everything is organisation-scoped. Single-tenant for now, so take the first. */
async function ensureOrganisation(): Promise<string> {
  const existing = await pool.query("select id from organisations limit 1");
  if (existing.rows[0]) return existing.rows[0].id;
  const created = await pool.query(
    "insert into organisations (name) values ($1) returning id",
    ["Demo Organisation"]
  );
  return created.rows[0].id;
}

documentsRouter.get("/", async (_req, res) => {
  const { rows } = await pool.query(`
    select d.id, d.filename, d.document_type, d.page_count, d.created_at,
           d.lease_id, count(c.id)::int as clause_count
      from documents d
      left join clauses c on c.document_id = d.id
     group by d.id
     order by d.created_at desc
  `);
  res.json(rows);
});

documentsRouter.get("/:id/clauses", async (req, res) => {
  const { rows } = await pool.query(
    `select * from clauses where document_id = $1 order by page_number, char_start`,
    [req.params.id]
  );
  res.json(rows);
});

documentsRouter.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "file is required" });

  const organisationId = await ensureOrganisation();
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

  // 3. create the lease (if needed), the document and its clauses, atomically
  const client = await pool.connect();
  try {
    await client.query("begin");

    let leaseId: string | null = req.body.lease_id || null;

    if (!leaseId) {
      // Dates come from the term clause when the pipeline found one.
      const term = extraction.clauses.find((c) => c.clause_type === "term");
      let commencement: string | null = term?.extracted_value?.commencement ?? null;
      let expiry: string | null = term?.extracted_value?.expiry ?? null;
      if (commencement && expiry && expiry <= commencement) {
        commencement = null;
        expiry = null; // would violate leases_dates_ordered
      }

      const { rows: propRows } = await client.query(
        `insert into properties (organisation_id, name)
         values ($1, $2) returning id`,
        [organisationId, `Unassigned — ${req.file.originalname}`]
      );

      const { rows: leaseRows } = await client.query(
        `insert into leases
           (organisation_id, property_id, status, commencement_date, expiry_date)
         values ($1, $2, 'draft', $3, $4)
         returning id`,
        [organisationId, propRows[0].id, commencement, expiry]
      );
      leaseId = leaseRows[0].id;
    }

    const { rows: docRows } = await client.query(
      `insert into documents
         (organisation_id, lease_id, document_type, filename, page_count)
       values ($1, $2, $3, $4, $5)
       returning id, filename, document_type, page_count, lease_id, created_at`,
      [organisationId, leaseId, req.body.document_type || "lease", req.file.originalname, page_count]
    );
    const documentId = docRows[0].id;

    for (const p of pages) {
      await client.query(
        `insert into document_pages (document_id, page_number, text)
         values ($1, $2, $3)
         on conflict (document_id, page_number) do nothing`,
        [documentId, p.page_number, p.text]
      );
    }

    for (const c of extraction.clauses) {
      await client.query(
        `insert into clauses
           (organisation_id, document_id, clause_type, clause_reference, page_number,
            char_start, char_end, source_text, extracted_value, confidence,
            method, model_name, prompt_version)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (document_id, clause_type, char_start) do nothing`,
        [
          organisationId, documentId, c.clause_type, c.clause_reference,
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

documentsRouter.post("/:id/ask", async (req, res) => {
  const question = String(req.body?.question ?? "").trim();
  if (!question) return res.status(400).json({ error: "question is required" });

  const { rows: clauses } = await pool.query(
    `select clause_type, clause_reference, page_number, source_text, extracted_value
       from clauses where document_id = $1
      order by page_number, char_start`,
    [req.params.id]
  );
  if (clauses.length === 0) {
    return res.status(409).json({ error: "no clauses stored for this document" });
  }

  const r = await fetch(`${env.LEASE_INTELLIGENCE_URL}/clauses/answer`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ question, clauses }),
  });
  if (!r.ok) return res.status(502).json({ error: "answer failed", detail: await r.text() });
  res.json(await r.json());
});