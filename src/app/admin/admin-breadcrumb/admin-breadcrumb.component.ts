import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
    selector: 'app-admin-breadcrumb',
    templateUrl: './admin-breadcrumb.component.html',
    styleUrls: ['./admin-breadcrumb.component.css'],
    standalone: false
})
export class AdminBreadcrumbComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [];

  private routeLabels: { [key: string]: string } = {
    'admin': 'Admin',
    'user-management': 'User Management',
    'user-details': 'User Details',
    'create-quiz': 'Create Quiz',
    'upload-quiz': 'Upload Quiz',
    'quiz-management': 'Quiz Management'
  };

  constructor(private router: Router) { }

  ngOnInit() {
    this.updateBreadcrumbs();
    
    // Update breadcrumbs on navigation
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateBreadcrumbs();
    });
  }

  private updateBreadcrumbs(): void {
    const url = this.router.url;
    const segments = url.split('/').filter(segment => segment && segment !== 'admin');
    
    this.breadcrumbs = [
      { label: 'Dashboard', url: '/admin' }
    ];

    let currentPath = '/admin';
    segments.forEach(segment => {
      // Remove query parameters if any
      const cleanSegment = segment.split('?')[0];
      currentPath += `/${cleanSegment}`;
      
      // Get label from routeLabels or use segment as fallback
      const label = this.routeLabels[cleanSegment] || this.formatSegment(cleanSegment);
      
      this.breadcrumbs.push({
        label: label,
        url: currentPath
      });
    });
  }

  private formatSegment(segment: string): string {
    // Convert kebab-case to Title Case
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
