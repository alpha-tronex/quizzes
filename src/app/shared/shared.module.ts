import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
// import { ConfirmModalComponent } from './confirm-modal.component';
import { AlphaTronexModalComponent } from './alpha-tronex.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AlphaTronexModalComponent],
  imports: [CommonModule, FormsModule],
  exports: [AlphaTronexModalComponent]
})
export class SharedModule {}
