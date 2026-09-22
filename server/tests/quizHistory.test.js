const { withLiveTitles } = require('../utils/quizHistory');

describe('withLiveTitles', () => {
    test('overrides a stale stored title with the live quiz title', () => {
        const attempts = [{ id: 5, title: 'Islam 101.2', score: 1 }];
        const titleByQuizId = new Map([[5, 'Basic Algebra']]);

        const result = withLiveTitles(attempts, titleByQuizId);

        expect(result[0].title).toBe('Basic Algebra');
    });

    test('falls back to the stored title when there is no live quiz for that id (deleted quiz)', () => {
        const attempts = [{ id: 99, title: 'Retired Quiz', score: 1 }];
        const titleByQuizId = new Map();

        const result = withLiveTitles(attempts, titleByQuizId);

        expect(result[0].title).toBe('Retired Quiz');
    });

    test('leaves every other field on the attempt untouched', () => {
        const attempts = [{ id: 5, title: 'Old Name', score: 3, totalQuestions: 4, duration: 90 }];
        const titleByQuizId = new Map([[5, 'New Name']]);

        const result = withLiveTitles(attempts, titleByQuizId);

        expect(result[0]).toEqual({ id: 5, title: 'New Name', score: 3, totalQuestions: 4, duration: 90 });
    });

    test('handles multiple attempts, each resolved independently', () => {
        const attempts = [
            { id: 5, title: 'Old Algebra Name' },
            { id: 9, title: 'Deleted Quiz Title' }
        ];
        const titleByQuizId = new Map([[5, 'Basic Algebra']]);

        const result = withLiveTitles(attempts, titleByQuizId);

        expect(result[0].title).toBe('Basic Algebra');
        expect(result[1].title).toBe('Deleted Quiz Title');
    });

    test('returns an empty array for empty/missing input', () => {
        expect(withLiveTitles([], new Map())).toEqual([]);
        expect(withLiveTitles(undefined, new Map())).toEqual([]);
    });
});
