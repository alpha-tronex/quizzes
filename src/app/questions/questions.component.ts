import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Question, QuestionType, Quiz } from '../classes/quiz';
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
  quiz: Quiz;
  curQuestion: Question;
  allAnswered: boolean = false;
  http: HttpClient;

  constructor(http?: HttpClient) { this.http = http; }

  ngOnInit() {
    this.getQuestions().subscribe(
      (data: Quiz) => {
        this.quiz = data as Quiz;
        if (this.quiz && this.quiz.questions.length > 0) {
          this.curQuestion = this.quiz.questions[0];
          this.setQuestionType();
        }
      },
      (error) => console.error('Error fetching questions:', error)
    );
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
      this.curQuestion = this.quiz.questions[this.curQuestion.questionNum - 1];
      this.setQuestionType();
    }
  }

  goNext() {
    if (this.quiz.questions.length > this.curQuestion.questionNum) {
      this.curQuestion = this.quiz.questions[this.curQuestion.questionNum + 1];
      this.setQuestionType();
    }
  }

  recordMultichoiceSelection(): void {
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    const selectedAnswers: number[] = [];

    checkboxes.forEach((checkbox: Element, index: number) => {
      const input = checkbox as HTMLInputElement;
      if (input.checked) {
        selectedAnswers.push(index + 1);
      }
    });

    this.curQuestion.selection = selectedAnswers;
  }

  recordOnechoiceSelection(): void {
    const radios = document.querySelectorAll('input[type="radio"]');
    let selectedAnswer: number | null = null;
    
    radios.forEach((radio: Element, index: number) => {
      const input = radio as HTMLInputElement;
      if (input.checked) {
        selectedAnswer = index + 1;
      }
    });
    this.curQuestion.selection = selectedAnswer !== null ? [selectedAnswer] : [];
  }

  recordTruefalseSelection(value: boolean): void {
    this.curQuestion.selection = value ? [1] : [2];
  }   

  submit() {
    //
  }

  setQuestionType() {
    if (!this.curQuestion) {
      return;
    } 
    this.multichoice = this.curQuestion.questionType === QuestionType.MultipleChoice;
    this.onechoice = this.curQuestion.questionType === QuestionType.SingleAnswer;
    this.truefalse = this.curQuestion.questionType === QuestionType.TreuFalse;
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
