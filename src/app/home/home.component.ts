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
  subscription: any;
  studentLoggedIn: any;
  quizzes: any[] = [];
  selectedQuizId: number | null = null;
  selectedQuizTitle: string = '';
  inputWidth: string = '300px';

  constructor(private loginService: LoginService, private questionsService: QuestionsService, private router: Router) { }

  ngOnInit() {
    if (!this.loginService.userName) {
      //this.loginService.loggedInStudentChange.next(null);
    }

    // Load available quizzes
    this.questionsService.getAvailableQuizzes().subscribe({
      next: (data) => {
        this.quizzes = data;
      },
      error: (error) => {
        console.error('Error loading quizzes:', error);
      }
    });
  }

  startQuiz(quizId: number) {
    try {
      this.router.navigate(['/questions'], { queryParams: { id: quizId } });
    } catch (error) {
      console.error('Error starting quiz:', error);
    }
  }

  onQuizSelect() {
    // Optional: Could add logic here when selection changes
  }

  onQuizInput() {
    // Find quiz by title as user types
    const quiz = this.quizzes.find(q => q.title === this.selectedQuizTitle);
    if (quiz) {
      this.selectedQuizId = quiz.id;
    } else {
      this.selectedQuizId = null;
    }
    // Calculate width based on text length
    this.calculateInputWidth();
  }

  calculateInputWidth() {
    if (!this.selectedQuizTitle) {
      this.inputWidth = '300px';
      return;
    }
    // Estimate width: roughly 8-10px per character for typical fonts
    // Add padding and some extra space
    const charWidth = 9;
    const padding = 40; // Account for padding and borders
    const minWidth = 300;
    const maxWidth = 800;
    
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, this.selectedQuizTitle.length * charWidth + padding));
    this.inputWidth = calculatedWidth + 'px';
  }

  isValidQuizSelected(): boolean {
    return this.selectedQuizId !== null;
  }

  startSelectedQuiz() {
    if (this.selectedQuizId !== null) {
      this.startQuiz(this.selectedQuizId);
    }
  }

  getUsername(): string {
    // Check if user is logged in using localStorage
    if (localStorage.getItem('currentUser')) {
      return this.loginService.userName;
    }
    return '';
  }

  ngOnDestroy(): void {
    // if (this.subscription) {
    //   this.subscription.unsubscribe();
    // }
  }
}
