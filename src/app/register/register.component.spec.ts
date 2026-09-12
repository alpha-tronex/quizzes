import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { throwError } from 'rxjs';

import { RegisterComponent } from './register.component';
import { LoginService } from '@core/services/login-service';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule, FormsModule],
      declarations: [ RegisterComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('registerStudent error handling', () => {
    beforeEach(() => {
      // Valid enough to clear client-side validation and reach LoginService.
      component.user.uname = 'newstudent';
      component.user.pass = 'password123';
      component.user.confirmPass = 'password123';
      component.user.fname = 'New';
      component.user.lname = 'Student';
      component.user.email = 'new@example.com';
      component.user.phone = '';
    });

    it('renders details from a normalized error returned by LoginService', () => {
      const loginService = TestBed.inject(LoginService);
      spyOn(loginService, 'register').and.returnValue(
        throwError(() => ({ message: 'Validation failed', details: ['Username or email already in use'] }))
      );

      component.registerStudent();

      expect(component.serverErrors).toEqual(['Username or email already in use']);
    });

    it('falls back to a generic message if the error has no details', () => {
      const loginService = TestBed.inject(LoginService);
      spyOn(loginService, 'register').and.returnValue(throwError(() => ({})));

      component.registerStudent();

      expect(component.serverErrors).toEqual(['An error occurred during registration']);
    });
  });
});
