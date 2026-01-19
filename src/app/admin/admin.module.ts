import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AdminRoutingModule } from './admin-routing.module';
import { UserManagementComponent } from './user-management/user-management.component';
import { CreateQuizComponent } from './create-quiz/create-quiz.component';
import { UploadQuizComponent } from './upload-quiz/upload-quiz.component';

@NgModule({
  declarations: [
    UserManagementComponent,
    CreateQuizComponent,
    UploadQuizComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AdminRoutingModule
  ],
  providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AdminModule { }
