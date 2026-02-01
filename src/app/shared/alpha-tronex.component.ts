import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'alpha-tronex-modal',
  templateUrl: './alpha-tronex-modal.component.html',
  styleUrls: ['./alpha-tronex-modal.component.css'],
  standalone: false
})
export class AlphaTronexModalComponent {
  @Input() show = false;
  @Input() title = '';
  @Input() type: 'info' | 'warning' | 'danger' | 'success' | 'custom' = 'info';
  @Input() content: string | null = null;
  @Input() disableClose = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onClose() {
    if (!this.disableClose) {
      this.close.emit();
    }
  }

  onConfirm() {
    this.confirm.emit();
  }
}
