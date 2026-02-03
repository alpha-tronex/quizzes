import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AlphaTronexModalComponent } from './components/alpha-tronex-modal/alpha-tronex-modal.component';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [AlphaTronexModalComponent],
  imports: [CommonModule, FormsModule],
  exports: [AlphaTronexModalComponent]
})
export class SharedModule {}
