import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';

import { AccountComponent } from './account.component';
import { LoginService } from '@core/services/login-service';

describe('AccountComponent', () => {
  let component: AccountComponent;
  let fixture: ComponentFixture<AccountComponent>;
  let httpMock: HttpTestingController;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule, HttpClientTestingModule],
      declarations: [ AccountComponent ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    // ngOnInit fires getStates()/getCountries(); drain them so they don't
    // leak into other tests' HttpTestingController instances.
    httpMock.match(() => true).forEach((req) => req.flush([]));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('saveChanges error handling', () => {
    beforeEach(() => {
      component.user = {
        id: '1', uname: 'admin', email: 'admin@example.com', pass: '', confirmPass: '',
        type: 'admin', fname: 'Admin', lname: 'User', phone: '',
        address: { street1: '', street2: '', street3: '', city: '', state: '', zipCode: '', country: '' },
        quizzes: [], createdAt: new Date(), updatedAt: new Date()
      } as any;
    });

    it('renders details from a normalized error returned by LoginService', () => {
      const loginService = TestBed.inject(LoginService);
      spyOn(loginService, 'updateUser').and.returnValue(
        throwError(() => ({ message: 'Validation failed', details: ['Invalid phone number'] }))
      );

      component.saveChanges();

      expect(component.serverErrors).toEqual(['Invalid phone number']);
      expect(component.saving).toBeFalse();
    });

    it('falls back to a generic message if the error has no details', () => {
      const loginService = TestBed.inject(LoginService);
      spyOn(loginService, 'updateUser').and.returnValue(throwError(() => ({})));

      component.saveChanges();

      expect(component.serverErrors).toEqual(['An error occurred while updating user information']);
    });

    it('clears serverErrors and updates the user on success', () => {
      const loginService = TestBed.inject(LoginService);
      const updated = { ...component.user, fname: 'Updated' };
      spyOn(loginService, 'updateUser').and.returnValue(of(updated as any));

      component.saveChanges();

      expect(component.serverErrors).toEqual([]);
      expect(component.user.fname).toBe('Updated');
      expect(component.editMode).toBeFalse();
    });
  });
});
