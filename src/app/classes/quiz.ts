export class Quiz {
    id: number;
    title: string;
    completedAt: Date;
    questions: Question[];
    score: number;
    totalQuestions: number;
}
export class Question {
    questionNum: number;
    questionType: QuestionType;
    question: string;
    instructions: string;
    answers: string[];
    correct: number[];
    selection: number[];
    isCorrect: boolean | null;
}

export enum QuestionType {
    TrueFalse = 'TrueFalse',
    MultipleChoice = 'MultipleChoice',
    SingleAnswer = 'SingleAnswer'
}
