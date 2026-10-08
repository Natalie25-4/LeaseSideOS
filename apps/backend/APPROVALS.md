# Approval gate (Sprint 11)

Maintenance assignment and status changes now create immutable pending actions.
They return HTTP 202 and do not modify the maintenance record. A configured PM
can review the original record and proposed change at `/approvals`, then reject
or approve and apply it. `/maintenance` links to that page.

## Setup

Set these server environment variables before starting the backend:

- `PM_APPROVAL_TOKEN`: a randomly generated secret of at least 32 characters.
- `PM_APPROVER_ID`: the name/identifier of the PM who holds that secret.
- `APPROVAL_STORE_PATH`: optional absolute JSON file path on persistent local disk.
  Default: `data/maintenance-approvals.json` relative to the backend's working directory.

Do not commit the secret or put it in a NEXT_PUBLIC variable. Enter it in the
approval page; it stays in component memory and Lock clears it. Missing server
configuration disables approval access. Use HTTPS outside localhost.

## Scope and action classification

- Logging a request only records information; it does not authorize work.
- Assignment could authorize a contractor; status changes could represent completion.
  Both conservatively require approval, including reassignment.
- Payment, contract signing, notices, emails and external work orders have no executor
  in this implementation. Approval here only changes the local maintenance record.
  Future consequential executors must be integrated into an authenticated approval
  workflow before enabling them. This is not a claim that future integrations are protected.

## API and persistence

- PATCH `/maintenance/:id/assign` or `/status`: 202 `{action,message}`.
- GET `/approvals`: Bearer PM key required; returns actions and audit.
- POST `/approvals/:id/decision`: same key, `{decision:"approve"|"reject",reason?:string}`.
- Only the stored proposal can execute. Request payload cannot alter the change or PM identity.
- Repeated decisions and stale record snapshots return 409. Reject stale proposals
  and submit a fresh one. Identical pending proposals are reused.
- Request, approval and audit persist together through a lock and atomic file replacement.
  Busy locks return 503; invalid data is never silently reset. Back up the data file.
  After a process crash, remove a leftover `.lock` only after confirming no writer is running.

This is a single-server, single-PM prototype, not multi-user RBAC or a tamper-proof
external audit service. Public maintenance endpoints retain the existing application's
access model. A production deployment needs authenticated users, authorization per property,
rate limits, a database and durable external-effect delivery before real financial/legal use.

## Validation

`npm test` builds the backend and runs urgency and approval tests. Approval tests
use isolated temporary stores and cover unauthorized access, forged approval fields,
approve/reject, duplicates, stale changes, persistence and failure handling.

Tester acceptance: start both apps, log a request, propose assignment/status,
confirm the record stays unchanged, approve with the PM key, refresh maintenance,
then reject another proposal and inspect audit history. Actual team acceptance
remains for Natalie; automated checks do not replace it.
