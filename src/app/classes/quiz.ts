export class Quiz {
    id: number;
    title: string;
    questions: Question[];
    grade: string;
}

export enum QuestionType {
    TreuFalse = 'TreuFalse',
    MultipleChoice = 'MultipleChoice',
    SingleAnswer = 'SingleAnswer'
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
}
