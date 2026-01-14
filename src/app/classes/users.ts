import { Quiz } from './quiz';

export class Admin {
    id: string;
    uname: string;
    email: string;
    pass: string;
}

export class Student {
    id: string;
    uname: string;
    email: string;
    pass: string;
    quizzes: Quiz[];
}

export class User {
    id: string;
    email: string;
    uname: string;
    pass: string;
    confirmPass: string;
    type: string;
}
