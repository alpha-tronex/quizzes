import { Component, OnInit } from '@angular/core';
import { User } from '../classes/users';
import { LoginService } from '../services/login-service';

@Component({
    selector: 'app-account',
    templateUrl: './account.component.html',
    styleUrls: ['./account.component.css'],
    standalone: false
})
export class AccountComponent implements OnInit {
  user: User;
  loading: boolean = false;
  error: string = '';
  editMode: boolean = false;
  saving: boolean = false;
  serverErrors: string[] = [];

  constructor(private loginService: LoginService) { }

  ngOnInit() {
    // Get the current logged-in user from the login service
    this.user = this.loginService.user;
    
    if (!this.user) {
      this.error = 'No user is currently logged in.';
    } else if (!this.user.address) {
      this.user.address = {
        street1: '',
        street2: '',
        street3: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      };
    }
  }

  toggleEditMode(): void {
    this.editMode = !this.editMode;
    this.serverErrors = [];
    this.error = '';
  }

  saveChanges(): void {
    if (!this.user) return;
    
    this.saving = true;
    this.serverErrors = [];
    this.error = '';
    
    this.loginService.updateUser(this.user).subscribe({
      next: (updatedUser) => {
        this.user = updatedUser;
        this.editMode = false;
        this.saving = false;
      },
      error: (err) => {
        this.saving = false;
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
          this.serverErrors = ['An error occurred while updating user information'];
        }
      }
    });
  }

}
