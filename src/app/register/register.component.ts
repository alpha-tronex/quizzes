import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { Student } from '../classes/student';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'],
    standalone: false
})
export class RegisterComponent implements OnInit, OnDestroy {
  student: Student;
  subscription: Subscription;
  serverErrors: string[] = [];

  constructor(private router: Router, private loginService: LoginService) { }

  ngOnInit() {
    this.student = {
      id: 0,
      uname: '',
      email: '',
      pass: '',
      confirmPass: '',
      quizzes: []
    };
  }

  registerStudent(): void {
    this.serverErrors = [];
    this.subscription = this.loginService.register(this.student).subscribe(
      (success) => {
        if (success === 'success') {
          this.loginService.loggedInStudentChange.next(this.student);
          this.router.navigate(['home']);
        } else {
          alert('unable to register');
        }
      },
      (err) => {
        // err may be an object like { errors: [...] } or a string
        if (err && typeof err === 'object') {
          if (Array.isArray(err.errors)) {
            this.serverErrors = err.errors;
          } else if (err.error && Array.isArray(err.error.errors)) {
            this.serverErrors = err.error.errors;
          } else if (err.message) {
            this.serverErrors = [err.message];
          } else {
            this.serverErrors = [JSON.stringify(err)];
          }
        } else if (typeof err === 'string') {
          this.serverErrors = [err];
        } else {
          this.serverErrors = ['An unknown error occurred'];
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
