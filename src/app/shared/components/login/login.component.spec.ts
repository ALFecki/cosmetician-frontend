import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { GuestCheckoutService } from '../../services/guest-checkout.service';
import { ToastService } from '../../services/toast.service';
import { VerifyEmailModalService } from '../../services/verify-email-modal.service';
import { LoginComponent } from './login.component';

describe('Account login while SMS is unavailable', () => {
    let fixture: ComponentFixture<LoginComponent>;
    let auth: { phoneCheckoutEnabled: boolean; phoneLoginAvailable: boolean; getCurrentUserSync: () => null };
    beforeEach(() => {
        auth = { phoneCheckoutEnabled: true, phoneLoginAvailable: false, getCurrentUserSync: () => null };
        TestBed.configureTestingModule({
            imports: [LoginComponent],
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: auth },
                { provide: GuestCheckoutService, useValue: { restore: async () => null } },
                { provide: NgbModal, useValue: { open: jasmine.createSpy(), dismissAll: () => undefined } },
                { provide: ToastService, useValue: {} },
                { provide: VerifyEmailModalService, useValue: {} },
            ],
        });
        fixture = TestBed.createComponent(LoginComponent);
    });
    afterEach(() => fixture.destroy());
    it('immediately shows email and password without unavailable SMS controls', () => {
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('input[autocomplete="email"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('input[autocomplete="current-password"]')).not.toBeNull();
        expect(fixture.nativeElement.querySelector('app-phone-auth')).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Войти по телефону');
    });
    it('retains email registration instead of sending it to disabled SMS', () => {
        fixture.detectChanges();
        fixture.componentInstance.openRegisterModal(fixture.componentInstance.registerModal);
        expect(TestBed.inject(NgbModal).open).toHaveBeenCalled();
    });
    it('offers both phone and email entry when SMS becomes available', () => {
        auth.phoneLoginAvailable = true;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('app-phone-auth')).not.toBeNull();
        fixture.componentInstance.emailMode = true;
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('input[autocomplete="email"]')).not.toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Войти по телефону');
    });
});
