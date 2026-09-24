# Quiz Master stress test

Runs a k6 load test against the real API using the accounts created by
`server/scripts/seed_stress_test.js` (100 students, 2 admins, 5 cohorts, 10
quizzes, password `local123` for everything). This does **not** run on the
Hetzner box itself -- run it from your own machine (or a separate small VM)
so the load generator isn't competing with the app for the same 3 vCPU / 4 GB
the box actually has.

## 0. One-time: install k6

macOS: `brew install k6`
Other platforms: https://k6.io/docs/get-started/installation/

## 1. Seed the data (on the server, one time)

```bash
ssh <user>@5.161.104.5
cd /path/to/quizzes   # wherever docker-compose.prod.yml lives
docker compose -f docker-compose.prod.yml exec quizmaster-app npm run seed:stress
```

This is idempotent -- safe to re-run. It does **not** reset attempt history on
accounts that already exist (see step 4 if you need a clean slate between
test phases).

You confirmed it's fine for this to write into the current `quizmaster-mongo`
data, so no separate database/container is spun up.

## 2. Run the test (from your own machine)

```bash
cd loadtest
BASE_URL=https://quizmaster.alphatronex.com k6 run stress-test.js
```

Default shape: ~30s ramp up to 100 concurrent "students" (one per seeded
student account), hold for 3 minutes, ~30s ramp down -- while 4 "admin" VUs
poll the admin dashboard endpoints throughout, and a separate login-only
scenario hits `/api/login` at 20 req/s the whole time. Total run: ~4 minutes.

Tune it without touching the script:

```bash
BASE_URL=https://quizmaster.alphatronex.com \
STUDENT_MAX_VUS=100 \
ADMIN_VUS=4 \
AUTH_CHURN_RATE=20 \
RAMP_UP=1m HOLD=5m RAMP_DOWN=1m \
k6 run stress-test.js
```

`STUDENT_MAX_VUS` is capped at 100 in the script because there are only 100
seeded students -- pushing it higher just means multiple virtual users share
a login and JWT, which is a legitimate thing to test (concurrent sessions on
one account) but is a different question than "how many distinct students
can use the app at once," so know which one you're asking.

## 3. Watch the box while it runs

In a second SSH session, while the test is running:

```bash
# CPU/RAM across all containers -- watch for quizmaster-app or
# quizmaster-mongo pinned near their mem_limit (256m / 400m) or the whole
# box's 3 vCPU maxed out and starving FAIS/personal-assistant/etc.
docker stats

# free RAM on the box itself
free -h

# app-side errors/slow queries
docker compose -f docker-compose.prod.yml logs -f --tail=100 quizmaster-app

# did anything actually get OOM-killed
dmesg | grep -i "killed process" || journalctl -k | grep -i oom
```

## 4. Reading the results

k6 prints a summary at the end. What actually matters here:

- **`app_errors` rate** -- custom metric, excludes the expected `409
  QUIZ_LOCKED` responses (a student re-hitting a quiz they already completed
  isn't a bug, it's the retake lock working). Threshold: `<1%`. If this trips,
  something is actually broken, not just "busy."
- **`http_req_duration` p95/p99** -- overall response time. Thresholds here
  (`p95<800ms`, `p99<2000ms`) are starting guesses for a small shared VPS, not
  gospel -- tighten or loosen them based on what you actually consider
  acceptable, then treat future runs as regressions against this baseline.
- **`login_duration` p95** -- isolates bcrypt cost (10 salt rounds is
  deliberately CPU-heavy) from everything else. If this is the slowest thing
  in the run, that's your bcrypt cost showing under concurrency, not a query
  problem.
- **`quiz_locked_409` count** -- informational only, not a failure. Roughly
  `(number of students) x (quizzes per cohort)` once each VU has worked
  through its accessible list once.
- **`checks` rate** -- should be `>99%`. This is the catch-all "did every
  response look like what we expected" number.

A run that finishes with all thresholds green and nothing OOM-killed in
`dmesg` is a pass. A run where `docker stats` shows quizmaster-mongo pinned at
its 400m cap, or the app container restarting, tells you the current
`mem_limit`s (set for the old 2 GB plan) are the actual ceiling -- see
`hetzner-infra/hetzner.md`'s Server plan section, since those caps haven't
been revisited since the box was rescaled to 4 GB / 3 vCPU.

## 5. Resetting between runs

Each seeded student can complete every quiz in their cohort's list exactly
once before hitting the retake lock (see `quiz_locked_409` above). For a
second full write-heavy run, wipe and reseed so nothing starts pre-completed:

```bash
docker compose -f docker-compose.prod.yml exec quizmaster-app npm run cleanup:stress
docker compose -f docker-compose.prod.yml exec quizmaster-app npm run seed:stress
```

Re-running `seed:stress` alone (without cleanup first) updates account
details but does **not** clear `user.quizzes` attempt history, since the seed
script only upserts account/cohort/quiz documents, not attempts.

## 6. Cleaning up for good

```bash
docker compose -f docker-compose.prod.yml exec quizmaster-app npm run cleanup:stress
```

Deletes every `stressadmin*`/`stressstudent*` user, every `Stress Cohort *`,
and every `[Stress] `-titled quiz. Leaves the Guest cohort and any real data
untouched.

## What this does and doesn't cover

This script exercises the main student read/write path (`/api/login` →
`/api/quizzes` → `/api/quiz?id=` → `POST /api/quiz` → `/api/quiz/history`),
`/api/cohort/mine`, and read-only admin endpoints
(`/api/admin/users`, `/api/admin/cohorts`, `/api/admin/quizzes/all-users-data`)
under concurrent load, plus login/bcrypt cost in isolation. It does **not**
cover:

- Admin write paths (create/edit/delete cohort, quiz, or user; reopen-quiz)
  -- left out so the script is safe to run against data you'd rather not
  scramble. Add a scenario for these yourself if you want that path tested.
- The Angular web client or React Native mobile client's own performance --
  this only hits the Express API.
- Sustained multi-hour soak testing -- the default run is ~4 minutes; for a
  longer soak, raise `HOLD` and add a periodic cleanup+reseed cycle so writes
  don't run dry partway through.
- Network-layer stress (nginx, TLS handshake cost, bandwidth) beyond what k6
  naturally exercises by making real HTTPS requests.
- Anything about the box beyond CPU/RAM -- disk I/O under Mongo write load
  isn't separately instrumented here, just visible indirectly via
  `docker stats` and response times.

These, plus the earlier gaps flagged (staging environment, monitoring/APM,
DB backup before a destructive run, rate limiting), are the honest list of
what a *more* complete stress test would still need beyond this script.
