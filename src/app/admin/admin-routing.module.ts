import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserManagementComponent } from './users/user-management/user-management.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { CreateQuizComponent } from './quizzes/create-quiz/create-quiz.component';
import { UploadQuizComponent } from './quizzes/upload-quiz/upload-quiz.component';

const routes: Routes = [
  { path: 'user-management', component: UserManagementComponent },
  { path: 'user-details/:id', component: UserDetailsComponent },
  { path: 'create-quiz', component: CreateQuizComponent },
  { path: 'upload-quiz', component: UploadQuizComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
