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

  constructor(private router: Router, private loginService: LoginService) {}

  ngOnInit() {
    this.user = {
      id: '',
      uname: '',
      email: '',
      pass: '',
      confirmPass: '',
      type: ''
    };
  }

  login(): void {
    this.subscription = this.loginService.login(this.user).subscribe((user) => {
      this.user = user;
      this.router.navigate(['home']);
    }, (error) => {
      alert('unable to login: ' + error);
    });
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }
}
