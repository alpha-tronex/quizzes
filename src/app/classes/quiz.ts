export class Quiz {
    id: number;
    type: QuizType;
    questions: Question[];
    grade: string;
}

export class QuizType {
    id: number;
    type: string;
}
export class Question {
    questionNum: number;
    questionType: string;
    question: string;
    instructions: string;
    answer1: string;
    answer2: string;
    answer3: string;
    answer4: string;
    correct: number[];
    selection: number[];
}
