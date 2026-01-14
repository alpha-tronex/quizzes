import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  subscription: any;

  constructor(private router: Router, private loginService: LoginService) { }

  ngOnInit() {
    // subscribe to this.loginService.loggedInStudent.uname
    // this.subscription = this.loginService.loggedInStudent.subscribe((student => {
    //   this.username = student.uname;
    // });
    // this.loggedIn = this.loginService.loggedInStudent.
  }

  userName() {
    return this.loginService.userName;
  }

  logOff() {
    //this.loginService.loggedInStudentChange.next(null);
    this.loginService.logout();
    alert('Thank you for visiting!');
    // take to home page
    this.router.navigate(['home']);
  }

  ngOnDestroy(): void {
    // if (this.subscription) {
    //   this.subscription.unsubscribe();
    // }
  }
}
