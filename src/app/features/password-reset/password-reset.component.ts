import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
    selector: 'app-password-reset',
    templateUrl: './password-reset.component.html',
    styleUrl: './password-reset.component.scss',
    imports: [ReactiveFormsModule],
})
export class PasswordResetComponent implements OnInit {
    resetForm: FormGroup = new FormGroup({
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: new FormControl('', [Validators.required]),
    });

    token: string | null = null;
    email: string | null = null;
    isLoading = false;
    isTokenValid = false;
    isResetting = false;
    error: string | null = null;
    success: string | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private toastService: ToastService,
    ) {}

    ngOnInit(): void {
        this.token = this.route.snapshot.queryParamMap.get('token');
        this.email = this.route.snapshot.queryParamMap.get('email');

        if (!this.token) {
            this.error = 'Недействительная ссылка для восстановления пароля';
            return;
        }

        this.verifyToken();
    }

    verifyToken(): void {
        if (!this.token || !this.email) return;

        this.isLoading = true;
        this.authService.verifyResetToken(this.token, this.email).subscribe({
            next: response => {
                console.log('Token verification successful:', response);
                this.isTokenValid = true;
                this.isLoading = false;
            },
            error: error => {
                console.error('Token verification failed:', error);
                this.isLoading = false;
                if (error.status === 400) {
                    this.error = 'Ссылка для восстановления пароля недействительна или истекла';
                } else if (error.status === 404) {
                    this.error = 'Ссылка для восстановления пароля не найдена';
                } else {
                    this.error = 'Ошибка при проверке ссылки';
                }
            },
        });
    }

    onSubmit(): void {
        if (this.resetForm.invalid || this.isResetting) {
            this.resetForm.markAllAsTouched();
            return;
        }

        const password = this.resetForm.get('password')?.value;
        const confirmPassword = this.resetForm.get('confirmPassword')?.value;

        if (password !== confirmPassword) {
            this.error = 'Пароли не совпадают';
            return;
        }

        if (!this.token) {
            this.error = 'Недействительный токен';
            return;
        }

        if (!this.email) {
            this.error = 'Недействительный email';
            return;
        }

        this.isResetting = true;
        this.error = null;

        this.authService.resetPassword(this.email, this.token, password).subscribe({
            next: response => {
                console.log('Password reset successful:', response);
                this.success = 'Пароль успешно изменен. Теперь вы можете войти с новым паролем.';
                this.toastService.show('Пароль успешно изменен', 'success');
                this.isResetting = false;

                setTimeout(() => {
                    this.router.navigate(['/']);
                }, 3000);
            },
            error: error => {
                console.error('Password reset failed:', error);
                this.isResetting = false;
                if (error.status === 400) {
                    this.error = 'Недействительный или истекший токен';
                } else if (error.status === 404) {
                    this.error = 'Пользователь не найден';
                } else {
                    this.error = `Ошибка при смене пароля: ${error.message || 'Неизвестная ошибка'}`;
                }
            },
        });
    }

    goToHome(): void {
        this.router.navigate(['/']);
    }
}
