// Tests run against the local Postgres + Mailpit from docker-compose.
// Integration tests truncate all rows at the start and re-seed minimal fixtures.

// Force Berlin TZ so date assertions are stable on contributor machines
process.env.TZ = "Europe/Berlin";
