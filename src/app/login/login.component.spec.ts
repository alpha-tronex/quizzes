import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { throwError } from 'rxjs';

import { LoginComponent } from './login.component';
import { LoginService } from '@core/services/login-service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, FormsModule],
      declarations: [ LoginComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('login error handling', () => {
    beforeEach(() => {
      component.user.uname = 'admin';
      component.user.pass = 'wrong-password';
    });

    it('renders details from a normalized error returned by LoginService', () => {
      const loginService = TestBed.inject(LoginService);
      spyOn(loginService, 'login').and.returnValue(
        throwError(() => ({ message: 'Invalid username or password', details: ['Invalid username or password'] }))
      );

      component.login();

      expect(component.serverErrors).toEqual(['Invalid username or password']);
    });

    it('falls back to a generic message if the error has no details', () => {
      const loginService = TestBed.inject(LoginService);
      spyOn(loginService, 'login').and.returnValue(throwError(() => ({})));

      component.login();

      expect(component.serverErrors).toEqual(['Unable to login. Please try again.']);
    });
  });
});
