import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.css'],
    standalone: false
})
export class FooterComponent implements OnInit {
  currentYear: number = new Date().getFullYear();
  aboutText: string = `Sadaqah Jariyah for my mother and my father and 
                       all mothers and fathers who are no longer with us 
                       who instilled beneficial knowledge in their children.`;
  constructor() { }

  ngOnInit() {
  }

}
