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

  changeUserType(user: User): void {
    if (!user || !user.id) {
      return;
    }

    const currentType = user.type || 'student';
    const newType = currentType === 'admin' ? 'student' : 'admin';
    const action = newType === 'admin' ? 'promote to administrator' : 'demote to student';
    
    const confirmed = confirm(`Are you sure you want to ${action} user "${user.uname}"?`);
    
    if (confirmed) {
      this.adminService.updateUserType(user.id, newType).subscribe({
        next: (updatedUser) => {
          // Update the selected user
          if (this.selectedUser && this.selectedUser.id === user.id) {
            this.selectedUser.type = newType;
          }
          
          // Update the user in the users array
          const userIndex = this.users.findIndex(u => u.id === user.id);
          if (userIndex !== -1) {
            this.users[userIndex].type = newType;
          }
          
          console.log('User type updated successfully');
        },
        error: (error) => {
          console.error('Error updating user type:', error);
          alert('Failed to update user type: ' + error);
        }
      });
    }
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getScoreBadgeClass(score: number, total: number): string {
    if (!total) return 'bg-secondary';
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'bg-success';
    if (percentage >= 60) return 'bg-warning';
    return 'bg-danger';
  }

}
