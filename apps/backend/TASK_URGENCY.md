# Task urgency classification

Extends Yash's key-date detection in the backend. Every generated task carries
`urgency`: `critical`, `high`, `medium`, or `low`. Both `POST /tasks/scan` and
`GET /tasks` return tasks sorted by urgency, then days remaining.

## Initial thresholds (team review required)

| Event | Critical | High | Medium | Low |
| --- | --- | --- | --- | --- |
| Rent review | <=7 days | 8–30 | 31–60 | >60 |
| Renewal option | <=14 days | 15–45 | 46–75 | >75 |
| Lease expiry | <=14 days | 15–30 | 31–60 | >60 |

These are provisional workflow defaults, not legal notice periods. Renewal
options get earlier escalation to allow preparation. Tune the exported
`URGENCY_THRESHOLDS` after agreement with the team/client.

The existing 90-day detection window still controls new task discovery. Dates
are calendar dates in the server's timezone. Set the deployment timezone to
Pacific/Auckland for NZ operations. Invalid dates are skipped during scans.

Urgency is recalculated on every task read and by the existing daily scan.
Previously detected events that pass their date remain Critical rather than
silently disappearing. They are removed when their lease disappears or the
event date changes. Historical events are not discovered on a fresh startup.
The existing store is in memory: restart persistence and task completion are
outside this card. The UI's existing badge can consume the field, but UI wiring
is not part of this backend change.

## Validation

From apps/backend, install dependencies for your OS and run `npm test`.
The repository currently tracks dependencies including platform-specific files;
the copied macOS TypeScript installation may require reinstalling on Windows.

Eight automated tests cover all three event types, every inclusive cutoff,
today/overdue dates, calendar/DST and leap-year behavior, invalid dates, empty
portfolios, cross-day escalation, overdue retention, changed dates, and HTTP
scan/list responses and sorting. Carsten's acceptance testing is still pending.

This work is on `zelong-dev`, with Yash's published branch merged locally first.
The dependency merge includes his existing accounting/maintenance work. When
reviewing this task, distinguish that merge from the new urgency changes.
