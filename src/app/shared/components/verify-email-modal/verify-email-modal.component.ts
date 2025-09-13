import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-verify-email-modal',
    templateUrl: './verify-email-modal.component.html',
    styleUrl: './verify-email-modal.component.scss',
    imports: [ReactiveFormsModule],
})
export class VerifyEmailModalComponent {
    verifyEmailForm: FormGroup;
    verifyEmailError: string | null = null;
    verifyEmailSuccess: string | null = null;
    isVerifyingEmail = false;
    showVerifyEmailPrompt = true;

    @Output() emailVerified = new EventEmitter<void>();

    constructor(
        private activeModal: NgbActiveModal,
        private authService: AuthService,
        private toastService: ToastService,
        private fb: FormBuilder,
    ) {
        this.verifyEmailForm = this.fb.group({
            code: ['', Validators.required],
        });
    }

    close(): void {
        this.activeModal.dismiss();
    }

    sendVerificationCode(): void {
        this.showVerifyEmailPrompt = false;
        this.verifyEmailError = null;

        this.authService.sendEmailVerification().subscribe({
            next: response => {
                console.log('Verification code sent:', response);
                this.toastService.show('Код подтверждения отправлен на ваш email', 'success');
            },
            error: error => {
                console.error('Sending verification code failed:', error);
                this.verifyEmailError = 'Не удалось отправить код подтверждения. Попробуйте позже.';
                this.toastService.show('Не удалось отправить код подтверждения', 'error');
            },
        });
    }

    verifyEmail(): void {
        if (this.verifyEmailForm.invalid || this.isVerifyingEmail) {
            this.verifyEmailForm.markAllAsTouched();
            return;
        }

        this.verifyEmailError = null;
        this.verifyEmailSuccess = null;
        this.isVerifyingEmail = true;

        const code = this.verifyEmailForm.get('code')?.value;

        this.authService.verifyEmail(code).subscribe({
            next: response => {
                console.log('Email verification successful:', response);
                this.verifyEmailSuccess = 'Ваш email успешно подтверждён!';
                this.toastService.show('Email подтверждён', 'success');
                this.emailVerified.emit();

                setTimeout(() => {
                    this.activeModal.close(true);
                }, 2000);
            },
            error: error => {
                console.error('Email verification failed:', error);
                if (error.status === 400) {
                    this.verifyEmailError = 'Некорректный код подтверждения';
                } else if (error.status === 0) {
                    this.verifyEmailError = 'Не удалось подключиться к серверу';
                } else {
                    this.verifyEmailError = `Ошибка подтверждения: ${error.message || 'Неизвестная ошибка'}`;
                }
                this.isVerifyingEmail = false;
            },
            complete: () => {
                this.isVerifyingEmail = false;
            },
        });
    }
}
