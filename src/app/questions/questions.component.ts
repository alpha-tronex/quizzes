import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Question, QuestionType } from '../classes/quiz';
// tslint:disable-next-line: import-blacklist
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';

@Component({
    selector: 'app-questions',
    templateUrl: './questions.component.html',
    styleUrls: ['./questions.component.css'],
    standalone: false
})
export class QuestionsComponent implements OnInit {
  multichoice: boolean;
  onechoice: boolean;
  truefalse: boolean;
  questionType: string;
  curQuestion: Question;
  questions: Question[] = [];
  http: HttpClient;

  constructor(http?: HttpClient) { this.http = http; }

  ngOnInit() {
    this.getQuestions().subscribe(data => {
      this.questions = data.quizzes;
      this.curQuestion = this.questions[0];
      this.setQuestionType();
    });
    console.log('questions, questions, questions');
  }

  getQuestions(): Observable<any> {
    return this.http.get<any>('/api/quiz', {observe: 'body', responseType: 'json'}).pipe(
      retry(3),
      catchError(this.handleError)
    );
  }

  goPrevious() {
    if (this.curQuestion.questionNum > 0) {
      this.curQuestion = this.questions[this.curQuestion.questionNum - 1];
      this.setQuestionType();
    }
  }

  goNext() {
    if (this.questions.length > this.curQuestion.questionNum) {
      this.curQuestion = this.questions[this.curQuestion.questionNum + 1];
      this.setQuestionType();
    }
  }

  submit() {
    //
  }

  setQuestionType() {
    switch (this.curQuestion.questionType) {
      case QuestionType.MultipleChoice:
        this.multichoice = true;
        this.onechoice = false;
        this.truefalse = false;
        break;
      case QuestionType.SingleAnswer:
        this.onechoice = true;
        this.multichoice = false;
        this.truefalse = false;
        break;
      case QuestionType.TreuFalse:
          this.truefalse = true;
          this.multichoice = false;
          this.onechoice = false;
        break;
      default:
        this.multichoice = false;
    }
  }

  handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      // A client-side or network error occurred. Handle it accordingly.
      console.error('An error occurred:', error.error.message);
    } else {
      // The backend returned an unsuccessful response code.
      // The response body may contain clues as to what went wrong.
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${error.error}`);
    }
    // Return an observable with a user-facing error message.
    return throwError(
      'Something bad happened; please try again later.');
  }
}
