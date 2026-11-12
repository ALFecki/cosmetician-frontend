import { PhoneAuthComponent } from './phone-auth.component';
import { AuthService } from '../../services/auth.service';
import { PhoneChallenge } from '../../models/checkout.model';
import { LoginResponse } from '../../models/login.interface';

describe('Phone authentication steps', () => {
    let component: PhoneAuthComponent;
    let auth: jasmine.SpyObj<AuthService>;
    const challenge = { challengeId: 'challenge', csrfToken: 'csrf', retryAfter: 60, expiresIn: 300 } as PhoneChallenge;
    beforeEach(() => {
        auth = jasmine.createSpyObj<AuthService>('auth', ['startPhone', 'verifyPhone', 'completePhone', 'getCurrentUserSync']);
        auth.startPhone.and.resolveTo(challenge);
        auth.verifyPhone.and.resolveTo({ registrationRequired: true });
        component = new PhoneAuthComponent(auth);
        component.ngOnInit();
    });
    afterEach(() => component.ngOnDestroy());
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
        auth.verifyPhone.and.resolveTo({ registrationRequired: true });
        component.form.controls.code.setValue('12345');
        await component.verifyCode();
        expect(component.step).toBe('details');
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
