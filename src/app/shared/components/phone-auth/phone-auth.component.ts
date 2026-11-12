import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PhoneChallenge } from '../../models/checkout.model';
import { LoginResponse } from '../../models/login.interface';
import { AuthService } from '../../services/auth.service';
import { apiMessage } from '../../utils/api-message';

@Component({
    selector: 'app-phone-auth',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './phone-auth.component.html',
    styleUrl: './phone-auth.component.scss',
})
export class PhoneAuthComponent implements OnInit, OnDestroy {
    @Input() purpose: 'login' | 'link' = 'login';
    @Output() authenticated = new EventEmitter<LoginResponse>();
    @Output() emailLogin = new EventEmitter<void>();
    @ViewChild('codeInput') codeInput?: ElementRef<HTMLInputElement>;
    step: 'phone' | 'code' | 'details' = 'phone';
    busy = false;
    error: string | null = null;
    remaining = 0;
    private retryAt = 0;
    private timer?: ReturnType<typeof setInterval>;
    private challenge?: PhoneChallenge;
    private alive = true;
    form = new FormGroup({
        phone: new FormControl('+375', { nonNullable: true }),
        code: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{5}$/)] }),
        firstName: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
        }),
        secondName: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
        }),
        email: new FormControl('', { nonNullable: true, validators: [Validators.email, Validators.maxLength(254)] }),
        consent: new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    });

    constructor(public authService: AuthService) {}
    ngOnInit(): void {
        if (this.purpose === 'link') this.form.controls.phone.setValue(this.authService.getCurrentUserSync()?.phone || '+375');
        this.timer = setInterval(() => {
            this.remaining = Math.max(0, Math.ceil((this.retryAt - Date.now()) / 1000));
        }, 1000);
    }
    ngOnDestroy(): void {
        this.alive = false;
        if (this.timer) clearInterval(this.timer);
    }

    async sendCode(): Promise<void> {
        if (this.busy || this.remaining) return;
        const raw = this.form.controls.phone.value.trim();
        const phone = `+${raw.replace(/\D/g, '')}`;
        if (!/^[+\d\s()-]+$/.test(raw) || !/^\+375\d{9}$/.test(phone)) {
            this.error = 'Введите номер в формате +375 29 123-45-67';
            return;
        }
        this.busy = true;
        this.error = null;
        try {
            const challenge = await this.authService.startPhone(phone, this.purpose);
            if (!this.alive) return;
            this.challenge = challenge;
            this.form.controls.phone.setValue(phone);
            this.form.controls.code.reset();
            this.setCooldown(challenge.retryAfter);
            this.step = 'code';
            setTimeout(() => this.codeInput?.nativeElement.focus(), 0);
        } catch (error) {
            this.error = apiMessage(error, 'Не удалось отправить код. Попробуйте через минуту');
            if ([429, 503, 0].includes((error as { status: number }).status)) this.setCooldown(60);
        } finally {
            this.busy = false;
        }
    }

    private setCooldown(seconds: number): void {
        this.remaining = seconds;
        this.retryAt = Date.now() + seconds * 1000;
    }

    async verifyCode(): Promise<void> {
        if (this.busy || !this.challenge) return;
        this.form.controls.code.markAsTouched();
        if (this.form.controls.code.invalid) {
            this.error = 'Введите 5 цифр из SMS';
            return;
        }
        this.busy = true;
        this.error = null;
        try {
            const response = await this.authService.verifyPhone(this.challenge, this.form.controls.code.value);
            if (!this.alive) return;
            if ('registrationRequired' in response) {
                this.step = 'details';
                this.form.controls.code.reset();
            } else this.authenticated.emit(response);
        } catch (error) {
            this.error = apiMessage(error, 'Не удалось проверить код. Попробуйте ещё раз');
        } finally {
            this.busy = false;
        }
    }

    async complete(): Promise<void> {
        if (this.busy || !this.challenge) return;
        for (const control of [
            this.form.controls.firstName,
            this.form.controls.secondName,
            this.form.controls.email,
            this.form.controls.consent,
        ])
            control.markAsTouched();
        if (
            [this.form.controls.firstName, this.form.controls.secondName, this.form.controls.email, this.form.controls.consent].some(
                control => control.invalid,
            )
        ) {
            this.error = 'Укажите имя и фамилию, проверьте почту и согласие на обработку данных';
            return;
        }
        this.busy = true;
        this.error = null;
        try {
            const value = this.form.getRawValue();
            const response = await this.authService.completePhone(
                this.challenge,
                value.firstName.trim(),
                value.secondName.trim(),
                value.email.trim() || null,
            );
            if (this.alive) this.authenticated.emit(response);
        } catch (error) {
            this.error = apiMessage(error);
        } finally {
            this.busy = false;
        }
    }

    editPhone(): void {
        if (this.busy) return;
        this.step = 'phone';
        this.challenge = undefined;
        this.error = null;
        this.form.controls.code.reset();
    }
    codeChanged(event: Event): void {
        const input = event.target as HTMLInputElement;
        const value = input.value.replace(/\D/g, '').slice(0, 5);
        this.form.controls.code.setValue(value);
        input.value = value;
    }
}
