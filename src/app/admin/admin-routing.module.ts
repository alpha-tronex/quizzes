import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { UserManagementComponent } from './users/user-management/user-management.component';
import { UserDetailsComponent } from './users/user-details/user-details.component';
import { CreateQuizComponent } from './quizzes/create-quiz/create-quiz.component';
import { UploadQuizComponent } from './quizzes/upload-quiz/upload-quiz.component';
import { QuizManagementComponent } from './quizzes/quiz-management/quiz-management.component';

const routes: Routes = [
  { path: '', component: AdminDashboardComponent },
  { path: 'user-management', component: UserManagementComponent },
  { path: 'user-details/:id', component: UserDetailsComponent },
  { path: 'create-quiz', component: CreateQuizComponent },
  { path: 'upload-quiz', component: UploadQuizComponent },
  { path: 'quiz-management', component: QuizManagementComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }
