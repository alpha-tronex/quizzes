import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Admin, User } from '../classes/users';
import { Router } from '@angular/router';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent implements OnInit, OnDestroy {
  user: User;
  subscription: Subscription;
  serverErrors: string[] = [];

  constructor(private router: Router, private loginService: LoginService) {}

  ngOnInit() {
    this.user = {
      id: '',
      uname: '',
      email: '',
      pass: '',
      confirmPass: '',
      type: '',
      fname: '',
      lname: '',
      phone: '',
      address: null
    };
  }

  login(): void {
    this.serverErrors = [];
    this.subscription = this.loginService.login(this.user).subscribe((user) => {
      this.user = user;
      this.router.navigate(['home']);
    }, (error) => {
      if (error && typeof error === 'object') {
        if (error.error && typeof error.error === 'string') {
          this.serverErrors = [error.error];
        } else if (error.message) {
          this.serverErrors = [error.message];
        } else {
          this.serverErrors = ['Unable to login. Please try again.'];
        }
      } else if (typeof error === 'string') {
        this.serverErrors = [error];
      } else {
        this.serverErrors = ['An error occurred during login.'];
      }
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
