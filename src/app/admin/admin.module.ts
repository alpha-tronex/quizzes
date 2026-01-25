import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AdminRoutingModule } from './admin-routing.module';
import { UserManagementComponent } from './users/user-management/user-management.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { CreateQuizComponent } from './quizzes/create-quiz/create-quiz.component';
import { UploadQuizComponent } from './quizzes/upload-quiz/upload-quiz.component';

@NgModule({
  declarations: [
    UserManagementComponent,
    CreateQuizComponent,
    UploadQuizComponent,
    UserDetailsComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    AdminRoutingModule
  ],
  providers: [provideHttpClient(withInterceptorsFromDi())]
})
export class AdminModule { }
