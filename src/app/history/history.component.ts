import { Component, OnInit } from '@angular/core';
import { QuestionsService } from '../services/questions-service';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-history',
    templateUrl: './history.component.html',
    styleUrls: ['./history.component.css'],
    standalone: false
})
export class HistoryComponent implements OnInit {
  quizzes: any[] = [];
  username: string = '';
  loading: boolean = true;
  error: string = '';

  constructor(private questionsService: QuestionsService, private loginService: LoginService) {}

  ngOnInit() {
    // Check if user is logged in using localStorage
    if (localStorage.getItem('currentUser')) {
      this.username = this.loginService.userName;
      if (this.username) {
        this.loadQuizHistory();
      } else {
        this.error = 'Unable to retrieve user information';
        this.loading = false;
      }
    } else {
      this.error = 'Please login to view your quiz history';
      this.loading = false;
    }
  }

  loadQuizHistory() {
    this.questionsService.getQuizHistory(this.username).subscribe({
      next: (data) => {
        this.quizzes = data.quizzes || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading quiz history:', error);
        this.error = 'Failed to load quiz history';
        this.loading = false;
      }
    });
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}
