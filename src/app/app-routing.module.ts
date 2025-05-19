import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuestionsComponent } from './questions/questions.component';
import { HomeComponent } from './home/home.component';
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';
import { AccountComponent } from './account/account.component';


// const routes: Routes = [
//   { path: '', redirectTo: '/login', pathMatch: 'full' },
//   { path: 'home', component: HomeComponent },
//   { path: 'questions', component: QuestionsComponent },
//   { path: 'login', component: LoginComponent },
//   { path: 'register', component: RegisterComponent },
//   { path: 'account', component: AccountComponent },
//   { path: '**', redirectTo: '/login', pathMatch: 'full' }
// ];

const routes: Routes = [
  { path: '', component: HomeComponent }, // Default route
  { path: '**', redirectTo: '' } // Redirect unknown routes to home
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
