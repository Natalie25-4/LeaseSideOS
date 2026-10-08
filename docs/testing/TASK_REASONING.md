# Task reasoning verification

The task scan and list endpoints now return a `reason` for each task. Reasons use the existing urgency thresholds and recorded event dates; no model/API key is required. Reasons update on reads and rescans as time passes.

## Reviewed examples

- Rent review in 5 days: Critical because it falls within the next 7 day range; review lease terms and prepare for the review.
- Renewal option date in 30 days: High because it falls within the 15-45 day range; check the lease notice requirements and confirm renewal plans.
- Expiry in 50 days: Medium because it falls within the 31-60 day range; confirm next steps for the tenancy.
- Expiry in 80 days: Low because it is more than 60 days away.
- Expiry today or one day in the past: Critical, with today/overdue wording.

These explain the initial operational policy, not verified legal deadlines. A recorded renewal option date is not described as a proven notice deadline or window opening. Real lease interpretation and team acceptance remain to be reviewed.

## Validation

TypeScript compilation passed using the existing sibling urgency-test-tools compiler. All 24 backend tests passed, including five new reasoning tests and scan/list HTTP assertions. Covered all three event types, priority boundaries, singular days, today/overdue, invalid numeric input and changing dates. No live AI requests were made.

The backend package's default TypeScript 7 installation currently lacks its Windows native compiler dependency on this machine; the existing test-tools compiler was used instead. No dependency manifests were changed.

This change adds backend API output only. It does not add a task display screen or database persistence. The existing task store remains in memory. No changes have been pushed to GitHub.
