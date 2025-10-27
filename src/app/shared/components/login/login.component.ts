import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { throwError } from 'rxjs';
import { Md5 } from 'ts-md5';
import { LoginData, RegistrationData } from '../../models/login.interface';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { VerifyEmailModalService } from '../../services/verify-email-modal.service';
import { IconsModule } from '../../base/icons/icons.module';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
    imports: [ReactiveFormsModule, IconsModule],
})
export class LoginComponent {
    @Input() loginForm: FormGroup = new FormGroup({});

    returnUrl: string | null = null;

    email = new FormControl('');
    password = new FormControl('');
    rememberMe = new FormControl(false);

    // Registration form controls
    registrationForm: FormGroup = new FormGroup({
        firstName: new FormControl('', [Validators.required]),
        secondName: new FormControl('', [Validators.required]),
        surname: new FormControl('', []),
        email: new FormControl('', [Validators.required, Validators.email]),
        phone: new FormControl('', [Validators.required]),
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: new FormControl('', [Validators.required]),
        personalDataConsent: new FormControl(false, [Validators.requiredTrue]),
    });

    forgotPasswordForm: FormGroup = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email]),
    });

    @ViewChild('registerModal') registerModal!: TemplateRef<unknown>;
    @ViewChild('forgotPasswordModal') forgotPasswordModal!: TemplateRef<unknown>;

    registrationError: string | null = null;
    loginError: string | null = null;
    forgotPasswordError: string | null = null;
    forgotPasswordSuccess: string | null = null;
    isLoggingIn = false;
    isRegistering = false;
    isSendingReset = false;

    constructor(
        private authService: AuthService,
        private modalService: NgbModal,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private router: Router,
        private verifyEmailModalService: VerifyEmailModalService,
    ) {
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }

    login(): void {
        if (this.isLoggingIn) return;

        this.loginError = null;
        this.isLoggingIn = true;

        const loginData = {
            email: this.email.value,
            password: Md5.hashStr(this.password.value!),
        } as LoginData;

        this.authService.login(loginData).subscribe({
            next: response => {
                if (!response.user.isEmailVerified) {
                    this.closeLoginModal();
                    this.verifyEmailModalService.openVerifyEmailModal().subscribe(verified => {
                        if (verified) {
                            this.toastService.show('Успешный вход в систему', 'success');
                        }
                    });
                    return;
                }

                this.toastService.show('Успешный вход в систему', 'success');
                this.closeLoginModal();
                if (this.returnUrl && this.returnUrl !== '/') {
                    this.router.navigate([this.returnUrl]);
                } else {
                    this.router.navigate(['/']);
                }
            },
            error: error => {
                console.error('Login failed:', error);
                if (error.status === 401) {
                    this.loginError = 'Неверный email или пароль';
                } else if (error.status === 0) {
                    this.loginError = 'Не удалось подключиться к серверу';
                } else {
                    this.loginError = `Ошибка входа: ${error.message || 'Неизвестная ошибка'}`;
                }
                this.isLoggingIn = false;
            },
            complete: () => {
                this.isLoggingIn = false;
            },
        });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSubmit(event: Event) {
        if (this.loginForm.valid) {
            this.login();
        } else {
            this.loginForm.markAllAsTouched();
        }
    }

    openLoginModal(content: unknown) {
        this.loginForm.reset();
        this.loginError = null;
        this.modalService.open(content, {
            size: 'lg',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
    }

    closeLoginModal() {
        this.modalService.dismissAll();
    }

    openRegisterModal(content: unknown) {
        this.registrationForm.reset();
        this.registrationError = null;
        this.modalService.open(content, {
            size: 'lg',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
    }

    closeRegisterModal() {
        this.modalService.dismissAll();
    }

    register() {
        if (this.registrationForm.invalid) {
            this.registrationForm.markAllAsTouched();
            return;
        }

        if (this.isRegistering) return;

        this.registrationError = null;
        this.isRegistering = true;

        if (this.registrationForm.get('confirmPassword')?.value !== this.registrationForm.get('password')?.value) {
            this.registrationError = 'Пароли не совпадают';
            this.isRegistering = false;
            return;
        }

        const registrationData = {
            email: this.registrationForm.get('email')?.value,
            phone: this.registrationForm.get('phone')?.value,
            password: Md5.hashStr(this.registrationForm.get('password')?.value),
            firstName: this.registrationForm.get('firstName')?.value,
            secondName: this.registrationForm.get('secondName')?.value,
            surname: this.registrationForm.get('surname')?.value,
        } as RegistrationData;

        this.authService.register(registrationData).subscribe({
            next: () => {
                this.toastService.show('Регистрация успешно завершена!', 'success');
                this.closeRegisterModal();
            },
            error: error => {
                console.error('Registration failed:', error);

                if (error.status === 409) {
                    this.registrationError = 'Пользователь с таким email уже существует';
                } else if (error.status === 400) {
                    this.registrationError = 'Некорректные данные для регистрации';
                } else if (error.status === 0) {
                    this.registrationError = 'Не удалось подключиться к серверу';
                } else {
                    this.registrationError = `Ошибка регистрации: ${error.message || 'Неизвестная ошибка'}`;
                }

                this.toastService.show(this.registrationError, 'error');
                this.isRegistering = false;

                return throwError(() => error);
            },
        });
    }

    openForgotPasswordModal(content: unknown) {
        this.forgotPasswordForm.reset();
        this.forgotPasswordError = null;
        this.forgotPasswordSuccess = null;
        this.modalService.open(content, {
            size: 'md',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
    }

    closeForgotPasswordModal() {
        this.modalService.dismissAll();
    }

    sendPasswordReset() {
        if (this.forgotPasswordForm.invalid || this.isSendingReset) {
            this.forgotPasswordForm.markAllAsTouched();
            return;
        }

        this.forgotPasswordError = null;
        this.forgotPasswordSuccess = null;
        this.isSendingReset = true;

        const email = this.forgotPasswordForm.get('email')?.value;

        this.authService.forgotPassword(email).subscribe({
            next: () => {
                this.forgotPasswordSuccess = 'Ссылка для восстановления пароля отправлена на ваш email. Проверьте почту.';
                this.toastService.show('Ссылка для восстановления отправлена', 'success');
                this.isSendingReset = false;
            },
            error: error => {
                console.error('Password reset failed:', error);
                if (error.status === 404) {
                    this.forgotPasswordError = 'Пользователь с таким email не найден';
                } else if (error.status === 0) {
                    this.forgotPasswordError = 'Не удалось подключиться к серверу';
                } else {
                    this.forgotPasswordError = `Ошибка: ${error.message || 'Неизвестная ошибка'}`;
                }
                this.isSendingReset = false;
            },
        });
    }

    getPersonalDataUrl(): string {
        return '/personal-data';
    }
}
