import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PhoneAuthComponent } from './phone-auth.component';
import { AuthService } from '../../services/auth.service';
import { PhoneChallenge } from '../../models/checkout.model';
import { LoginResponse } from '../../models/login.interface';
import { PersonModel } from '../../models/person.model';
import { GuestCheckoutService } from '../../services/guest-checkout.service';

describe('Phone authentication steps', () => {
    let fixture: ComponentFixture<PhoneAuthComponent>;
    let component: PhoneAuthComponent;
    let auth: jasmine.SpyObj<AuthService>;
    let guest: jasmine.SpyObj<GuestCheckoutService>;
    const challenge = { challengeId: 'challenge', csrfToken: 'csrf', retryAfter: 60, expiresIn: 300 } as PhoneChallenge;
    const orderCustomer = {
        phone: '+375290000001',
        checkoutDetails: {
            phone: '+375290000001',
            firstName: 'Анна',
            secondName: 'Иванова',
            email: 'anna@example.invalid',
            deliveryMethod: 'self',
            paymentMethod: 'cash',
            isCourierDelivery: false,
            address: null,
            postPlacementId: null,
            deliveryPostAddress: null,
            comment: null,
            offerConsent: true,
        },
    } as PersonModel;
    const guestSession = { csrfToken: 'guest-csrf', expiresAt: Math.floor(Date.now() / 1000) + 3600, customer: orderCustomer };
    beforeEach(() => {
        auth = jasmine.createSpyObj<AuthService>('auth', ['startPhone', 'verifyPhone', 'completePhone', 'getCurrentUserSync']);
        auth.startPhone.and.resolveTo(challenge);
        auth.verifyPhone.and.resolveTo({ registrationRequired: true });
        guest = jasmine.createSpyObj<GuestCheckoutService>('guest', ['restore']);
        guest.restore.and.resolveTo(null);
        TestBed.configureTestingModule({
            imports: [PhoneAuthComponent],
            providers: [provideRouter([]), { provide: AuthService, useValue: auth }, { provide: GuestCheckoutService, useValue: guest }],
        });
        fixture = TestBed.createComponent(PhoneAuthComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('normalizes the phone and prevents duplicate sends during cooldown', async () => {
        component.form.controls.phone.setValue('+375 (29) 000-00-01');
        await component.sendCode();
        await component.sendCode();
        expect(auth.startPhone).toHaveBeenCalledOnceWith('+375290000001', 'login');
        expect(component.step).toBe('code');
        expect(component.remaining).toBe(60);
    });
    it('keeps the code step after a rejected code and then opens customer details', async () => {
        component.form.controls.phone.setValue('+375290000001');
        await component.sendCode();
        auth.verifyPhone.and.callFake(async () => {
            throw { status: 400, error: 'Неверный код' };
        });
        component.form.controls.code.setValue('99999');
        await component.verifyCode();
        expect(component.step).toBe('code');
        expect(component.error).toContain('Неверный код');
        expect(guest.restore).not.toHaveBeenCalled();
        auth.verifyPhone.and.resolveTo({ registrationRequired: true });
        component.form.controls.code.setValue('12345');
        await component.verifyCode();
        expect(component.step).toBe('details');
    });
    it('reuses the contact saved by a matching guest order after SMS and asks only for consent', async () => {
        guest.restore.and.resolveTo(guestSession);
        auth.completePhone.and.resolveTo({} as LoginResponse);
        component.form.controls.phone.setValue('+375290000001');
        await component.sendCode();
        component.form.controls.code.setValue('12345');
        await component.verifyCode();

        expect(component.reusesOrderContact).toBeTrue();
        fixture.detectChanges();
        const host: HTMLElement = fixture.nativeElement;
        expect(host.querySelector('#phone-first-name, #phone-last-name, #phone-email')).toBeNull();
        expect(host.querySelector('input[type="checkbox"]')).not.toBeNull();
        await component.complete();
        expect(auth.completePhone).not.toHaveBeenCalled();
        component.form.controls.consent.setValue(true);
        await component.complete();
        expect(auth.completePhone).toHaveBeenCalledOnceWith(challenge, 'Анна', 'Иванова', 'anna@example.invalid');

        component.editPhone();
        expect(component.reusesOrderContact).toBeFalse();
        expect(component.form.controls.firstName.value).toBe('');
    });
    for (const customer of [
        { ...orderCustomer, checkoutDetails: { ...orderCustomer.checkoutDetails!, phone: '+375290000002' } },
        { ...orderCustomer, checkoutDetails: null },
    ]) {
        it(`keeps contact fields when the guest ${customer.checkoutDetails ? 'used a different number' : 'has no saved order'}`, async () => {
            guest.restore.and.resolveTo({ ...guestSession, customer });
            component.form.controls.phone.setValue('+375290000001');
            await component.sendCode();
            component.form.controls.code.setValue('12345');
            await component.verifyCode();

            expect(component.step).toBe('details');
            expect(component.reusesOrderContact).toBeFalse();
            expect(component.form.controls.firstName.value).toBe('');
        });
    }
    it('switches from contact details to the existing email account and prefills its phone for linking', async () => {
        component.form.controls.phone.setValue('+375290000001');
        await component.sendCode();
        component.form.controls.code.setValue('12345');
        await component.verifyCode();
        fixture.detectChanges();

        const emailLogin = spyOn(component.emailLogin, 'emit');
        const host: HTMLElement = fixture.nativeElement;
        host.querySelector<HTMLButtonElement>('.phone-actions .phone-link')?.click();
        expect(emailLogin).toHaveBeenCalledOnceWith();
        expect(component.step).toBe('phone');

        auth.getCurrentUserSync.and.returnValue({ phone: '+375290000002' } as PersonModel);
        fixture.componentRef.setInput('purpose', 'link');
        fixture.detectChanges();
        expect(host.querySelector<HTMLInputElement>('#checkout-phone')?.value).toBe('+375290000002');
    });
    it('ignores an earlier SMS response when the buyer signs in to an email account during verification', async () => {
        let acceptCode!: (response: { registrationRequired: true }) => void;
        auth.verifyPhone.and.returnValue(
            new Promise(resolve => {
                acceptCode = resolve;
            }),
        );
        component.form.controls.phone.setValue('+375290000002');
        await component.sendCode();
        component.form.controls.code.setValue('12345');
        const pending = component.verifyCode();

        guest.restore.and.resolveTo(guestSession);
        auth.getCurrentUserSync.and.returnValue(orderCustomer);
        fixture.componentRef.setInput('purpose', 'link');
        fixture.detectChanges();
        acceptCode({ registrationRequired: true });
        await pending;

        expect(guest.restore).not.toHaveBeenCalled();
        expect(component.step).toBe('phone');
        expect(component.form.controls.phone.value).toBe(orderCustomer.phone);
    });
    it('accepts names and consent without email, and can restart an expired challenge without losing names', async () => {
        component.form.controls.phone.setValue('+375290000001');
        await component.sendCode();
        component.form.controls.code.setValue('12345');
        await component.verifyCode();
        component.form.patchValue({ firstName: '  Анна ', secondName: ' Иванова ', consent: true });
        auth.completePhone.and.resolveTo({} as LoginResponse);
        const done = spyOn(component.authenticated, 'emit');
        await component.complete();
        expect(auth.completePhone).toHaveBeenCalledOnceWith(challenge, 'Анна', 'Иванова', null);
        expect(done).toHaveBeenCalled();
        component.editPhone();
        expect(component.step).toBe('phone');
        expect(component.form.controls.firstName.value).toBe('  Анна ');
    });
    for (const name of ['', '   ']) {
        it(`rejects a missing or blank required name (${JSON.stringify(name)})`, async () => {
            component.form.controls.phone.setValue('+375290000001');
            await component.sendCode();
            component.form.controls.code.setValue('12345');
            await component.verifyCode();
            component.form.patchValue({ firstName: name, secondName: 'Иванова', consent: true });
            await component.complete();
            expect(auth.completePhone).not.toHaveBeenCalled();
        });
    }
});
