import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from './login-service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  private idleTimer: any;
  private warningTimer: any;
  private lastActivity: number = Date.now();
  private warningShownAt: number = 0; // Track when warning was shown
  
  // Configuration (in milliseconds) - from environment
  private readonly IDLE_TIMEOUT = environment.idleTimeoutMinutes * 60 * 1000;
  private readonly WARNING_TIME = environment.idleWarningMinutes * 60 * 1000;
  private readonly CHECK_INTERVAL = 1000; // Check every second
  
  private warningShown: boolean = false;
  private isActive: boolean = false;

  // Events to monitor for user activity
  private readonly ACTIVITY_EVENTS = [
    'mousedown',
    'mousemove',
    'keypress',
    'scroll',
    'touchstart',
    'click'
  ];

  constructor(
    private router: Router,
    private loginService: LoginService
  ) {}

  /**
   * Start monitoring user activity
   */
  startWatching(): void {
    if (this.isActive) {
      return; // Already watching
    }

    this.isActive = true;
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.warningShownAt = 0;

    // Add event listeners for user activity
    this.ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, this.resetTimer.bind(this), true);
    });

    // Start the idle check interval
    this.idleTimer = setInterval(() => {
      this.checkIdleStatus();
    }, this.CHECK_INTERVAL);

    console.log('Idle timeout monitoring started');
  }

  /**
   * Stop monitoring user activity
   */
  stopWatching(): void {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // Remove event listeners
    this.ACTIVITY_EVENTS.forEach(event => {
      window.removeEventListener(event, this.resetTimer.bind(this), true);
    });

    // Clear timers
    if (this.idleTimer) {
      clearInterval(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }

    this.warningShownAt = 0;
    this.warningShown = false;
    console.log('Idle timeout monitoring stopped');
  }

  /**
   * Reset the idle timer when user activity is detected
   */
  private resetTimer(): void {
    // Don't reset timer if warning is shown and we're in the final countdown
    if (this.warningShown) {
      return;
    }
    
    this.lastActivity = Date.now();
  }

  /**
   * Check if user has been idle too long
   */
  private checkIdleStatus(): void {
    const now = Date.now();
    const idleTime = now - this.lastActivity;
    const timeUntilLogout = this.IDLE_TIMEOUT - idleTime;

    // Show warning if approaching timeout
    if (!this.warningShown && timeUntilLogout <= this.WARNING_TIME && timeUntilLogout > 0) {
      this.showWarning();
    }

    // Logout if idle timeout exceeded
    if (idleTime >= this.IDLE_TIMEOUT) {
      this.logout();
    }
  }

  /**
   * Show warning to user about impending logout
   */
  private showWarning(): void {
    this.warningShown = true;
    this.warningShownAt = Date.now(); // Record when warning was shown
    const seconds = Math.ceil(this.WARNING_TIME / 1000);
    
    const shouldStayLoggedIn = confirm(
      `You have been inactive for a while.\n\n` +
      `You will be automatically logged out in ${seconds} seconds due to inactivity.\n\n` +
      `Click OK to stay logged in, or Cancel to continue with logout.`
    );

    if (shouldStayLoggedIn) {
      // Check if warning period has already expired
      const now = Date.now();
      const timeSinceWarning = now - this.warningShownAt;
      
      if (timeSinceWarning >= this.WARNING_TIME) {
        // Too late - warning period expired, proceed with logout
        console.log('Warning period expired - logging out despite OK click');
        this.logout();
      } else {
        // Still within warning window - allow user to stay logged in
        this.warningShown = false;
        this.warningShownAt = 0;
        this.lastActivity = Date.now();
        console.log('User chose to stay logged in within warning window - timer reset');
      }
    } else {
      // User clicked Cancel or dismissed - let the timeout continue
      console.log('User dismissed warning - countdown continues');
    }
  }

  /**
   * Logout the user due to inactivity
   */
  private logout(): void {
    console.log('Logging out user due to inactivity');
    this.stopWatching();
    this.loginService.logout();
    
    // Store message for display on login page
    sessionStorage.setItem('logoutReason', 'You have been logged out due to inactivity.');
    
    // Navigate to login page
    this.router.navigate(['/login']);
  }

  /**
   * Get remaining time until logout (for debugging/display)
   */
  getRemainingTime(): number {
    const now = Date.now();
    const idleTime = now - this.lastActivity;
    const remaining = this.IDLE_TIMEOUT - idleTime;
    return Math.max(0, remaining);
  }

  /**
   * Check if idle timeout is currently active
   */
  isWatching(): boolean {
    return this.isActive;
  }

  /**
   * Manually reset the idle timer (e.g., after API calls)
   */
  public reset(): void {
    this.resetTimer();
  }
}
