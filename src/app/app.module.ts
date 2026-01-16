import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { QuestionsComponent } from './questions/questions.component';
import { AppRoutingModule } from './/app-routing.module';
import { HomeComponent } from './home/home.component';
import { HeaderComponent } from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { LoginComponent } from './login/login.component';
import { AccountComponent } from './account/account.component';
import { RegisterComponent } from './register/register.component';
import { HistoryComponent } from './history/history.component';
import { LoginService } from './services/login-service';
import { QuestionsService } from './services/questions-service';


@NgModule({ declarations: [
        AppComponent,
        QuestionsComponent,
        HomeComponent,
        HeaderComponent,
        FooterComponent,
        LoginComponent,
        AccountComponent,
        RegisterComponent,
        HistoryComponent
    ],
    bootstrap: [AppComponent], imports: [BrowserModule,
        AppRoutingModule,
        FormsModule], providers: [LoginService, QuestionsService, provideHttpClient(withInterceptorsFromDi())] })
export class AppModule { }
