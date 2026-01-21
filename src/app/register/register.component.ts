import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { User } from '../classes/users';
import { LoginService } from '../services/login-service';
import { ValidationService } from '../services/validation.service';

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
  showPassword: boolean = false;
  showConfirmPassword: boolean = false;
  clientErrors: string[] = [];

  constructor(
    private router: Router,
    private loginService: LoginService,
    private validationService: ValidationService
  ) { }

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
      address: null,
      quizzes: []
    };
  }

  registerStudent(): void {
    this.serverErrors = [];
    this.clientErrors = [];

    // Client-side validation
    const usernameValidation = this.validationService.validateUsername(this.user.uname);
    if (!usernameValidation.valid && usernameValidation.error) {
      this.clientErrors.push(usernameValidation.error);
    }

    const passwordValidation = this.validationService.validatePassword(this.user.pass);
    if (!passwordValidation.valid && passwordValidation.error) {
      this.clientErrors.push(passwordValidation.error);
    }

    // Check password confirmation
    if (this.user.pass !== this.user.confirmPass) {
      this.clientErrors.push('Passwords do not match');
    }

    // Stop if there are client-side errors
    if (this.clientErrors.length > 0) {
      return;
    }

    this.subscription = this.loginService.register(this.user).subscribe({
      next: (user) => {
        this.user = user;
        this.router.navigate(['home']);
      },
      error: (err) => {
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
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
