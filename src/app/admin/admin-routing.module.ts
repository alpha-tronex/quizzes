import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserManagementComponent } from './user-management/user-management.component';
import { CreateQuizComponent } from './create-quiz/create-quiz.component';
import { UploadQuizComponent } from './upload-quiz/upload-quiz.component';

const routes: Routes = [
  { path: 'user-management', component: UserManagementComponent },
  { path: 'create-quiz', component: CreateQuizComponent },
  { path: 'upload-quiz', component: UploadQuizComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
