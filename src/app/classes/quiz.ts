export class Quiz {
    id: number;
    questions: Question[];
    grade: string;
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
