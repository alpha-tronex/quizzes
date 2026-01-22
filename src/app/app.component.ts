import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LoginService } from './services/login-service';
import { IdleTimeoutService } from './services/idle-timeout.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
    standalone: false
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'app';
  private routerSubscription: any;

  constructor(
    private router: Router,
    private loginService: LoginService,
    private idleTimeoutService: IdleTimeoutService
  ) {}

  ngOnInit(): void {
    // Check if user is already logged in (from localStorage)
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const user = JSON.parse(currentUser);
        this.loginService.user = user;
        this.loginService.loggedIn = true;
        // Start idle monitoring for already logged in user
        this.idleTimeoutService.startWatching();
      } catch (e) {
        console.error('Error parsing stored user:', e);
        localStorage.removeItem('currentUser');
      }
    }

    // Monitor route changes and login state
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      if (this.loginService.loggedIn && !this.idleTimeoutService.isWatching()) {
        // User logged in, start idle monitoring
        this.idleTimeoutService.startWatching();
      } else if (!this.loginService.loggedIn && this.idleTimeoutService.isWatching()) {
        // User logged out, stop idle monitoring
        this.idleTimeoutService.stopWatching();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    this.idleTimeoutService.stopWatching();
  }
}
