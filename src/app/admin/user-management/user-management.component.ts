import { Component, OnInit } from '@angular/core';
import { User } from '../../classes/users';
import { AdminService } from '../../services/admin.service';

@Component({
    selector: 'app-user-management',
    templateUrl: './user-management.component.html',
    styleUrls: ['./user-management.component.css'],
    standalone: false
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  loading: boolean = false;
  errorMessage: string = '';

  constructor(private adminService: AdminService) { }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Failed to load users. Please try again.';
        this.loading = false;
      }
    });
  }

  onUserSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const userId = target.value;
    
    if (userId) {
      this.selectedUser = this.users.find(u => u.id === userId) || null;
    } else {
      this.selectedUser = null;
    }
  }

  getUserDisplayName(user: User): string {
    const name = `${user.fname || ''} ${user.lname || ''}`.trim();
    return name ? `${user.uname} (${name})` : user.uname;
  }

}
