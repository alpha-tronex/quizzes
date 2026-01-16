import { Component, OnInit } from '@angular/core';
import { QuestionsService } from '../services/questions-service';

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

  constructor(private questionsService: QuestionsService) {}

  ngOnInit() {
    this.username = this.getUsername();
    if (this.username) {
      this.loadQuizHistory();
    } else {
      this.error = 'Please login to view your quiz history';
      this.loading = false;
    }
  }

  loadQuizHistory() {
    this.questionsService.getQuizHistory(this.username).subscribe(
      (data) => {
        this.quizzes = data.quizzes || [];
        this.loading = false;
      },
      (error) => {
        console.error('Error loading quiz history:', error);
        this.error = 'Failed to load quiz history';
        this.loading = false;
      }
    );
  }

  getUsername(): string {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      return user.username || user.uname || '';
    }
    return '';
  }

  formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
  }
}
