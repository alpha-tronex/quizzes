import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Breadcrumb {
  label: string;
  url: string;
}

@Component({
    selector: 'app-breadcrumb',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.css'],
    standalone: false
})
export class BreadcrumbComponent implements OnInit {
  breadcrumbs: Breadcrumb[] = [];

  private routeLabels: { [key: string]: string } = {
    'home': 'Home',
    'account': 'My Account',
    'history': 'Quiz History',
    'login': 'Login',
    'register': 'Register',
    'questions': 'Take Quiz',
    'admin': 'Admin'
  };

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

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
    
    // Don't show breadcrumbs on home page
    if (url === '/' || url === '/home') {
      this.breadcrumbs = [];
      return;
    }
    
    // Remove query parameters and split path
    const path = url.split('?')[0];
    const segments = path.split('/').filter(segment => segment);
    
    this.breadcrumbs = [
      { label: 'Home', url: '/home' }
    ];

    let currentPath = '';
    segments.forEach(segment => {
      currentPath += `/${segment}`;
      
      // Get label from routeLabels or use segment as fallback
      const label = this.routeLabels[segment] || this.formatSegment(segment);
      
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
