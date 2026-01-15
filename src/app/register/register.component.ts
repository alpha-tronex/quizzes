import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../classes/users';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css'],
    standalone: false
})
export class RegisterComponent implements OnInit, OnDestroy {
  user: User;
  subscription: Subscription;
  serverErrors: string[] = [];

  constructor(private router: Router, private loginService: LoginService) { }

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

  registerStudent(): void {
    this.serverErrors = [];
    this.subscription = this.loginService.register(this.user).subscribe(
      (user) => {
        this.user = user;
        this.router.navigate(['home']);
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
