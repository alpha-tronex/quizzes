import { Component, OnDestroy, OnInit } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    standalone: false
})
export class HomeComponent implements OnInit, OnDestroy {
  thanksPhrase: string;
  subscription: any;
  studentLoggedIn: any;

  constructor(private loginService: LoginService) { }

  ngOnInit() {
    this.thanksPhrase = 'Thank you for visiting the quiz master.';

    if (!this.loginService.userName) {
      this.loginService.loggedInStudentChange.next(null);
    }
  }

  userName() {
    return this.loginService.userName;
  }

  ngOnDestroy(): void {
    // if (this.subscription) {
    //   this.subscription.unsubscribe();
    // }
  }
}
