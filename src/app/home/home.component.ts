import { Component, OnDestroy, OnInit } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from '../services/login-service';
import { QuestionsService } from '../services/questions-service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  thanksPhrase: string;
  subscription: any;
  studentLoggedIn: any;
  quizzes: any[] = [];

  constructor(private loginService: LoginService, private questionsService: QuestionsService, private router: Router) { }

  ngOnInit() {
    this.thanksPhrase = 'Thank you for visiting the quiz master.';

    if (!this.loginService.userName) {
      //this.loginService.loggedInStudentChange.next(null);
    }

    // Load available quizzes
    this.questionsService.getAvailableQuizzes().subscribe(
      (data) => {
        this.quizzes = data;
      },
      (error) => {
        console.error('Error loading quizzes:', error);
      }
    );
  }

  startQuiz(quizId: number) {
    this.router.navigate(['/questions'], { queryParams: { id: quizId } });
  }

  userName() {
    return this.loginService.userName;
  }

  ngOnDestroy(): void {
    // if (this.subscription) {
    //   this.subscription.unsubscribe();
    // }
  }
}
