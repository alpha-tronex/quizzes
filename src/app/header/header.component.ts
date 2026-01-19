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

  getUsername(): string {
    // Check if user is logged in using localStorage
    if (localStorage.getItem('currentUser')) {
      return this.loginService.userName;
    }
    return '';
  }

  collapseNavbar(): void {
    const navbarToggler = document.querySelector('.navbar-toggler') as HTMLElement;
    const navbarCollapse = document.getElementById('navbarResponsive');
    
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      // Simulate clicking the toggle button to use Bootstrap's built-in collapse animation
      if (navbarToggler) {
        navbarToggler.click();
      }
    }
  }

  logOff() {
    //this.loginService.loggedInStudentChange.next(null);
    this.collapseNavbar();
    this.loginService.logout();
    // take to home page
    this.router.navigate(['home']);
  }

  ngOnDestroy(): void {
    // if (this.subscription) {
    //   this.subscription.unsubscribe();
    // }
  }
}
