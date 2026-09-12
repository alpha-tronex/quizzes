import { Component, OnDestroy, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { User } from '@models/users';
import { Router } from '@angular/router';
import { LoginService, NormalizedApiError } from '@core/services/login-service';
import { ValidationService } from '@shared/services/validation.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.css'],
    standalone: false
})
export class LoginComponent implements OnInit, OnDestroy, AfterViewInit {
  user: User;
  subscription: Subscription;
  serverErrors: string[] = [];
  showPassword: boolean = false;
  clientErrors: string[] = [];  @ViewChild('usernameInput') usernameInput: ElementRef;
  constructor(
    private router: Router,
    private loginService: LoginService,
    private validationService: ValidationService
  ) {}

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
      quizzes: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Check for logout reason (e.g., inactivity timeout)
    const logoutReason = sessionStorage.getItem('logoutReason');
    if (logoutReason) {
      this.serverErrors = [logoutReason];
      sessionStorage.removeItem('logoutReason');
    }
  }

  ngAfterViewInit() {
    // Focus on username input field after view initializes
    if (this.usernameInput) {
      setTimeout(() => {
        this.usernameInput.nativeElement.focus();
      }, 0);
    }
  }

  login(): void {
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

    // Stop if there are client-side errors
    if (this.clientErrors.length > 0) {
      return;
    }

    this.subscription = this.loginService.login(this.user).subscribe({
      next: (user) => {
        this.user = user;
        this.router.navigate(['home']);
      },
      error: (error: NormalizedApiError) => {
        // LoginService.handleError() always normalizes to { message, details }
        // before this subscriber sees it — see login-service.ts.
        this.serverErrors = error?.details?.length ? error.details : ['Unable to login. Please try again.'];
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
