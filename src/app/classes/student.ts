import { Quiz } from './quiz';

export class Student {
    id: number;
    email: string;
    uname: string;
    pass: string;
    quizzes: Quiz[];
}
