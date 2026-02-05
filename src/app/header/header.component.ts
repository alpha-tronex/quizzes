import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoginService } from '@core/services/login-service';

@Component({
    selector: 'app-header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.css'],
    standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {
  subscription: any;

  quizSubmenuOpen = false;

  // Modal state for shared alpha-tronex popup
  showPopup = false;
  popupTitle = 'Under Construction';
  popupMessage = '';

  constructor(private router: Router, private loginService: LoginService) { }

  ngOnInit() {}

  getUsername(): string {
    if (localStorage.getItem('currentUser')) {
      return this.loginService.userName;
    }
    return '';
  }

  isAdmin(): boolean {
    if (localStorage.getItem('currentUser')) {
      return this.loginService.isAdmin();
    }
    return false;
  }

  collapseNavbar(): void {
    this.quizSubmenuOpen = false;
    const navbarToggler = document.querySelector('.navbar-toggler') as HTMLElement;
    const navbarCollapse = document.getElementById('navbarResponsive');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      if (navbarToggler) {
        navbarToggler.click();
      }
    }
  }

  toggleQuizSubmenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.quizSubmenuOpen = !this.quizSubmenuOpen;
  }

  logOff() {
    this.collapseNavbar();
    this.loginService.logout();
    this.router.navigate(['home']);
  }

  ngOnDestroy(): void {
    // if (this.subscription) {
    //   this.subscription.unsubscribe();
    // }
  }

  // Show the shared alpha-tronex popup with a custom message
  showUnderConstruction(event: Event, feature: string) {
    event.preventDefault();
    this.popupMessage = `${feature} is under construction.`;
    this.showPopup = true;
  }

  // Hide the shared alpha-tronex popup
  closePopup() {
    this.showPopup = false;
    this.popupMessage = '';
  }

  // Custom links for the dropdown menu
  customLinks = [
    { name: 'Lesson Management', icon: 'fas fa-book', url: '#' },
    { name: 'Enrollment Management', icon: 'fas fa-user-check', url: '#' }
  ];
}
