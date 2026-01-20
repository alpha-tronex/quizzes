import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { AdminRoutingModule } from './admin-routing.module';
import { UserManagementComponent } from './user-management/user-management.component';
import { CreateQuizComponent } from './create-quiz/create-quiz.component';
import { UploadQuizComponent } from './upload-quiz/upload-quiz.component';
import { UserDetailsComponent } from './user-details/user-details.component';

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
