/**
 * k6 stress test for Quiz Master, built against the real routes in
 * server/routes/{authRoutes,quizRoutes,adminUserRoutes,adminCohortRoutes}.js
 * and the accounts created by server/scripts/seed_stress_test.js:
 *
 *   stressadmin1, stressadmin2                    (2 admins)
 *   stressstudent001 .. stressstudent100           (100 students)
 *   Stress Cohort 1..5                             (5 cohorts, overlapping quiz sets)
 *   10 quizzes titled "[Stress] ..."
 *   password for every seeded account: local123
 *
 * Run `npm run seed:stress` (inside the app container, see loadtest/README.md)
 * before running this, and `npm run cleanup:stress` afterward if you want the
 * data gone.
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 * Run:
 *   BASE_URL=https://quizmaster.alphatronex.com k6 run loadtest/stress-test.js
 *
 * Tunable via environment variables (all optional, defaults shown):
 *   BASE_URL              https://quizmaster.alphatronex.com
 *   STUDENT_MAX_VUS       100   (capped at 100 -- there are only 100 seeded students;
 *                                going higher just means multiple VUs share a login,
 *                                which is a valid thing to test but changes what
 *                                you're measuring -- see README.md)
 *   ADMIN_VUS             4     (only 2 seeded admins, so VUs share the 2 logins)
 *   AUTH_CHURN_RATE       20    (logins/sec for the auth_churn scenario)
 *   RAMP_UP               30s
 *   HOLD                  3m
 *   RAMP_DOWN             30s
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// ---- Config -------------------------------------------------------------
const BASE_URL = __ENV.BASE_URL || 'https://quizmaster.alphatronex.com';
const STUDENT_MAX_VUS = Math.min(Number(__ENV.STUDENT_MAX_VUS) || 100, 100);
const ADMIN_VUS = Number(__ENV.ADMIN_VUS) || 4;
const AUTH_CHURN_RATE = Number(__ENV.AUTH_CHURN_RATE) || 20;
const RAMP_UP = __ENV.RAMP_UP || '30s';
const HOLD = __ENV.HOLD || '3m';
const RAMP_DOWN = __ENV.RAMP_DOWN || '30s';
const PASSWORD = 'local123';
const STUDENT_COUNT = 100;
const ADMIN_COUNT = 2;

// ---- Custom metrics -------------------------------------------------------
// http_req_failed (k6's built-in) would count an expected 409 QUIZ_LOCKED as a
// failure, which isn't a real problem -- it's the retake lock working as
// designed. Track real errors separately so thresholds mean something.
const errorRate = new Rate('app_errors');
const quizLocked = new Counter('quiz_locked_409');
const loginDuration = new Trend('login_duration', true);
const quizSubmitDuration = new Trend('quiz_submit_duration', true);
const quizListDuration = new Trend('quiz_list_duration', true);
const adminReadDuration = new Trend('admin_read_duration', true);

function toSeconds(dur) {
    const m = String(dur).match(/^(\d+)(s|m|h)$/);
    if (!m) return 300;
    const n = Number(m[1]);
    return m[2] === 'h' ? n * 3600 : m[2] === 'm' ? n * 60 : n;
}
const TOTAL_DURATION = `${toSeconds(RAMP_UP) + toSeconds(HOLD) + toSeconds(RAMP_DOWN)}s`;

// ---- Scenarios --------------------------------------------------------
export const options = {
    scenarios: {
        student_flow: {
            executor: 'ramping-vus',
            exec: 'studentFlow',
            startVUs: 0,
            stages: [
                { duration: RAMP_UP, target: STUDENT_MAX_VUS },
                { duration: HOLD, target: STUDENT_MAX_VUS },
                { duration: RAMP_DOWN, target: 0 },
            ],
            gracefulRampDown: '10s',
        },
        admin_read: {
            executor: 'constant-vus',
            exec: 'adminFlow',
            vus: ADMIN_VUS,
            duration: TOTAL_DURATION,
            startTime: '5s',
        },
        auth_churn: {
            executor: 'constant-arrival-rate',
            exec: 'authChurn',
            rate: AUTH_CHURN_RATE,
            timeUnit: '1s',
            duration: HOLD,
            preAllocatedVUs: Math.max(AUTH_CHURN_RATE * 2, 10),
            maxVUs: Math.max(AUTH_CHURN_RATE * 4, 20),
            startTime: RAMP_UP,
        },
    },
    thresholds: {
        app_errors: ['rate<0.01'],
        http_req_duration: ['p(95)<800', 'p(99)<2000'],
        login_duration: ['p(95)<600'],
        checks: ['rate>0.99'],
    },
};

// ---- Helpers ------------------------------------------------------------
function pad(n, width) {
    return String(n).padStart(width, '0');
}

function studentUsername(vuId) {
    const idx = ((vuId - 1) % STUDENT_COUNT) + 1;
    return `stressstudent${pad(idx, 3)}`;
}

function adminUsername(vuId) {
    const idx = ((vuId - 1) % ADMIN_COUNT) + 1;
    return `stressadmin${idx}`;
}

function authHeaders(token) {
    return { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } };
}

function login(uname) {
    const res = http.post(
        `${BASE_URL}/api/login`,
        JSON.stringify({ uname, pass: PASSWORD }),
        { headers: { 'Content-Type': 'application/json' }, tags: { name: 'login' } }
    );
    loginDuration.add(res.timings.duration);
    const ok = check(res, {
        'login: 200': (r) => r.status === 200,
        'login: got token': (r) => {
            try { return !!JSON.parse(r.body).token; } catch (e) { return false; }
        },
    });
    errorRate.add(!ok);
    if (!ok) return null;
    return JSON.parse(res.body).token;
}

// ---- Per-VU state (module scope = fresh copy per VU in k6) --------------
let vuToken = null;
let vuUsername = null;
let submittedQuizIds = new Set();

// ---- Scenario: student_flow ---------------------------------------------
// Realistic student session: login once, then repeatedly list quizzes, take
// one that isn't taken/locked yet, submit it, check history. Once a VU has
// worked through every quiz its cohort grants (5-10, depending on cohort),
// it falls back to a read-only loop so it keeps generating realistic GET
// load instead of just hammering a 409.
export function studentFlow() {
    if (!vuToken) {
        vuUsername = studentUsername(__VU);
        vuToken = login(vuUsername);
        if (!vuToken) {
            sleep(1);
            return;
        }
    }

    const listRes = http.get(`${BASE_URL}/api/quizzes`, authHeaders(vuToken));
    quizListDuration.add(listRes.timings.duration);
    const listOk = check(listRes, { 'quizzes: 200': (r) => r.status === 200 });
    errorRate.add(!listOk);

    let candidates = [];
    if (listOk) {
        try {
            candidates = JSON.parse(listRes.body).filter(
                (q) => !q.taken && !q.locked && !submittedQuizIds.has(q.id)
            );
        } catch (e) {
            candidates = [];
        }
    }

    if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];

        const quizRes = http.get(`${BASE_URL}/api/quiz?id=${target.id}`, authHeaders(vuToken));
        const quizOk = check(quizRes, { 'quiz fetch: 200': (r) => r.status === 200 });
        errorRate.add(!quizOk);

        if (quizOk) {
            const quiz = JSON.parse(quizRes.body);
            const quizData = {
                id: quiz.id,
                title: quiz.title,
                questions: (quiz.questions || []).map((q) => ({
                    questionNum: q.questionNum,
                    selection: q.correct || [],
                })),
            };

            const submitRes = http.post(
                `${BASE_URL}/api/quiz`,
                JSON.stringify({ username: vuUsername, quizData }),
                { headers: { Authorization: `Bearer ${vuToken}`, 'Content-Type': 'application/json' }, tags: { name: 'quiz_submit' } }
            );
            quizSubmitDuration.add(submitRes.timings.duration);

            if (submitRes.status === 409) {
                quizLocked.add(1); // expected: another VU/iteration already took it
            } else {
                const submitOk = check(submitRes, { 'quiz submit: 200': (r) => r.status === 200 });
                errorRate.add(!submitOk);
            }
            submittedQuizIds.add(target.id);
        }
    } else {
        // Read-only fallback once this VU has exhausted its accessible quizzes.
        const histRes = http.get(`${BASE_URL}/api/quiz/history/${vuUsername}`, authHeaders(vuToken));
        errorRate.add(!check(histRes, { 'history: 200': (r) => r.status === 200 }));

        const cohortRes = http.get(`${BASE_URL}/api/cohort/mine`, authHeaders(vuToken));
        errorRate.add(!check(cohortRes, { 'cohort/mine: 200': (r) => r.status === 200 }));
    }

    sleep(Math.random() * 2 + 1); // 1-3s think time between actions
}

// ---- Scenario: admin_read ------------------------------------------------
// Admin dashboard usage: user list, cohort list, and the heavier
// all-users-data aggregate endpoint. Read-only on purpose -- write-side admin
// load (create/edit cohorts, reopen quizzes) is deliberately out of scope
// here so this stays safe to run against data you care about; add it back in
// yourself if you want to test that path too.
export function adminFlow() {
    let token = login(adminUsername(__VU));
    if (!token) {
        sleep(1);
        return;
    }

    const usersRes = http.get(`${BASE_URL}/api/admin/users`, authHeaders(token));
    adminReadDuration.add(usersRes.timings.duration);
    errorRate.add(!check(usersRes, { 'admin users: 200': (r) => r.status === 200 }));

    const cohortsRes = http.get(`${BASE_URL}/api/admin/cohorts`, authHeaders(token));
    adminReadDuration.add(cohortsRes.timings.duration);
    errorRate.add(!check(cohortsRes, { 'admin cohorts: 200': (r) => r.status === 200 }));

    const aggRes = http.get(`${BASE_URL}/api/admin/quizzes/all-users-data`, authHeaders(token));
    adminReadDuration.add(aggRes.timings.duration);
    errorRate.add(!check(aggRes, { 'admin all-users-data: 200': (r) => r.status === 200 }));

    sleep(Math.random() * 3 + 2); // admins poll less often than students act
}

// ---- Scenario: auth_churn -------------------------------------------------
// Pure login pressure. bcrypt.compare is deliberately CPU-expensive (10 salt
// rounds), so this is the scenario most likely to expose CPU contention with
// the other tenants (FAIS, personal-assistant, etc.) sharing the 3-vCPU box.
// Mixes valid seeded logins with a few invalid ones so the
// user-not-found/bad-password paths get exercised too, not just the happy path.
export function authChurn() {
    const roll = Math.random();
    let uname;
    if (roll < 0.85) {
        uname = studentUsername(Math.floor(Math.random() * STUDENT_COUNT) + 1);
    } else if (roll < 0.95) {
        uname = adminUsername(Math.floor(Math.random() * ADMIN_COUNT) + 1);
    } else {
        uname = 'nonexistent_stress_user'; // exercises the INVALID_CREDENTIALS / not-found path
    }
    login(uname);
}

export function setup() {
    // Cheap, unauthenticated endpoint -- confirms the app is actually up
    // before spending the run's budget on a dead target.
    const res = http.get(`${BASE_URL}/api/utils/states`);
    if (res.status !== 200) {
        throw new Error(
            `Health check failed: GET /api/utils/states returned ${res.status}. ` +
            `Is BASE_URL (${BASE_URL}) correct and is the app up?`
        );
    }
}
