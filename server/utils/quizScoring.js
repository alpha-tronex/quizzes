/**
 * Server-side authoritative quiz scoring.
 *
 * Historically, POST /api/quiz trusted whatever `score`/`isCorrect` values
 * the client computed and submitted verbatim (see git history on
 * routes/quizRoutes.js). That was both a data-integrity gap (a malicious or
 * buggy client could report any score it liked) and the direct cause of a
 * severe production bug: the web and mobile clients recorded `selection` as
 * 1-based while `Quiz.questions[].correct` is stored 0-based, so comparing
 * them directly marked every correctly-answered question incorrect (and
 * made a question whose correct answer was index 0 unscorable as correct at
 * all). See questions.component.ts / TakeQuizScreen.tsx for the client-side
 * fix — this module closes the same bug class server-side, permanently:
 * scoring is now recomputed here from the canonical `Quiz` document,
 * ignoring whatever the client submitted for `correct`/`isCorrect`/`score`.
 *
 * `submittedQuestions` is only trusted for `selection` (what the student
 * actually picked) plus cosmetic fields (`questionNum`, `question`,
 * `answers`) which are just carried through for the saved-attempt record.
 */
function computeAuthoritativeScore(quiz, submittedQuestions) {
    const correctByQuestionNum = new Map(
        (quiz.questions || []).map((q) => [q.questionNum, [...(q.correct || [])].sort((a, b) => a - b)])
    );

    let score = 0;
    const questions = (submittedQuestions || []).map((submitted) => {
        const canonicalCorrect = correctByQuestionNum.get(submitted.questionNum) || [];
        const selection = Array.isArray(submitted.selection) ? submitted.selection : [];
        const sortedSelection = [...selection].sort((a, b) => a - b);

        const isCorrect = sortedSelection.length === canonicalCorrect.length &&
            sortedSelection.every((value, index) => value === canonicalCorrect[index]);

        if (isCorrect) {
            score++;
        }

        return {
            ...submitted,
            correct: canonicalCorrect,
            isCorrect
        };
    });

    return { questions, score, totalQuestions: questions.length };
}

module.exports = { computeAuthoritativeScore };
