import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Student } from '../classes/Student';
import { Router } from '@angular/router';
import { LoginService } from '../services/login-service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit, OnDestroy {
  student: Student;
  subscription: Subscription;

  constructor(private router: Router, private loginService: LoginService) {}

  ngOnInit() {
    this.student = {
      id: 0,
      uname: '',
      email: '',
      pass: '',
      quizzes: [],
    };
  }

  loginStudent(): void {
    this.subscription = this.loginService.login(this.student).subscribe((foundStudent) => {
      if (foundStudent) {
        // first, map foundStudent to this.student

        // --
        this.loginService.loggedInStudentChange.next(this.student);
        this.router.navigate(['home']);
      } else {
        alert('unable to login');
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
