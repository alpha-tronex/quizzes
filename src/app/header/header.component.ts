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
    const navbarCollapse = document.getElementById('navbarResponsive');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      // Add collapsing class for animation
      navbarCollapse.classList.add('collapsing');
      navbarCollapse.classList.remove('show');
      
      // Set height to current height for transition
      const currentHeight = navbarCollapse.scrollHeight;
      navbarCollapse.style.height = currentHeight + 'px';
      
      // Trigger reflow
      navbarCollapse.offsetHeight;
      
      // Animate to height 0
      navbarCollapse.style.height = '0px';
      
      // After transition completes, remove collapsing class and add collapse
      setTimeout(() => {
        navbarCollapse.classList.remove('collapsing');
        navbarCollapse.classList.add('collapse');
        navbarCollapse.style.height = '';
      }, 500); // 500ms matches Bootstrap's default transition time
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
