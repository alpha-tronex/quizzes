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

  constructor(private router: Router, private loginService: LoginService) { }

  ngOnInit() {
    this.student = {
      id: 0,
      uname: '',
      email: '',
      pass: '',
      quizzes: []
    };
  }

  registerStudent(): void {
    this.subscription = this.loginService.register(this.student).subscribe((success) => {
      if (success === 'success') {
        this.loginService.loggedInStudentChange.next(this.student);
        // redirect to home or questions, later dashboard.
        this.router.navigate(['home']);
      } else {
        alert('unable to register');
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
