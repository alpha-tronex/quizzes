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
    answer1: string;
    answer2: string;
    answer3: string;
    answer4: string;
    correct: number[];
    selection: number[];
    isCorrect: boolean | null;
}

export enum QuestionType {
    TreuFalse = 'TreuFalse',
    MultipleChoice = 'MultipleChoice',
    SingleAnswer = 'SingleAnswer'
}
