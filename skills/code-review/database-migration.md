# Database Migration Review — Specialty Steps

Applies to work type: `database_migration`.

Apply these steps after completing the universal review process.

## Rollback Script Verification

- Confirm that a **down migration** (rollback) exists alongside the up
  migration. For systems that use numbered migration files, verify a matching
  down file or a `down()` function in the same file.
- Absent rollback on a destructive migration (column drop, table drop, data
  transform) is a blocking issue.

## Idempotency Check

- Can the migration be run twice without error?
- Look for safe creation patterns: `CREATE TABLE IF NOT EXISTS`,
  `DROP TABLE IF EXISTS`, `CREATE INDEX IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`.
- Migrations that fail on re-run are a blocking issue in environments where
  idempotency is required (check project conventions).

## Data Impact Assessment

Flag the following for production data risk:

- **Row modification**: `UPDATE` or `DELETE` statements that touch existing
  rows. Flag with an estimated scope note if determinable from the diff.
- **NOT NULL without default**: Adding a NOT NULL column to a populated table
  without a `DEFAULT` value will block migration. Flag as blocking.
- **Column drop or rename**: Dropping or renaming a column breaks existing
  readers until they are also deployed. Flag for backward-compatibility review.
- **Table drop**: Flag unconditionally — confirm it is intentional and that
  all consumers have been removed.

## Performance Risk

- **Table-level locks**: `ALTER TABLE` on large tables acquires a lock that
  blocks reads and writes. Flag if table is known to be high-traffic or large.
- **Concurrent index creation**: Prefer `CREATE INDEX CONCURRENTLY` (Postgres)
  or equivalent for large tables. Flag if a blocking index creation is used.
- **Full-table rewrites**: Column type changes that require a table rewrite
  should be flagged on tables with significant row counts.
