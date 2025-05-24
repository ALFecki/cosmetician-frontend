import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { catchError, throwError } from 'rxjs';
import { LoginData, RegistrationData } from '../../models/login.interface';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
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
        surname: new FormControl('', [Validators.required]),
        email: new FormControl('', [Validators.required, Validators.email]),
        phone: new FormControl('', [Validators.required]),
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: new FormControl('', [Validators.required]),
    });

    // Verification code form control
    verificationForm: FormGroup = new FormGroup({
        code: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(6)]),
    });

    @ViewChild('registerModal') registerModal!: TemplateRef<unknown>;
    @ViewChild('verificationModal') verificationModal!: TemplateRef<unknown>;

    registrationError: string | null = null;
    loginError: string | null = null;
    verificationError: string | null = null;
    isLoggingIn = false;
    isRegistering = false;
    isVerifying = false;
    registeredEmail: string = '';

    constructor(
        private authService: AuthService,
        private modalService: NgbModal,
        private route: ActivatedRoute,
        private toastService: ToastService,
        private router: Router,
    ) {
        this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    }

    login(): void {
        if (this.isLoggingIn) return;

        this.loginError = null;
        this.isLoggingIn = true;

        const loginData = {
            email: this.email.value,
            password: this.password.value,
        } as LoginData;

        this.authService.login(loginData).subscribe({
            next: response => {
                console.log('Login successful:', response);
                this.toastService.show('Успешный вход в систему', 'success');
                this.closeLoginModal();
                if (this.returnUrl) {
                    this.router.navigate([this.returnUrl]);
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
            // Add windowClass to ensure our styling applies to the modal window
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
            // Add windowClass to ensure our styling applies to the modal window
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

        const registrationData = {
            email: this.registrationForm.get('email')?.value,
            phone: this.registrationForm.get('phone')?.value,
            password: this.registrationForm.get('password')?.value,
            firstName: this.registrationForm.get('firstName')?.value,
            secondName: this.registrationForm.get('secondName')?.value,
            surname: this.registrationForm.get('surname')?.value,
            confirmPassword: this.registrationForm.get('confirmPassword')?.value,
        } as RegistrationData;

        if (registrationData.password !== registrationData.confirmPassword) {
            this.registrationError = 'Пароли не совпадают';
            this.isRegistering = false;
            return;
        }

        this.authService
            .register(registrationData)
            .pipe(
                catchError(error => {
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

                    // Show error toast for any registration failure
                    this.toastService.show(this.registrationError, 'error');
                    this.isRegistering = false;

                    // Return throwError to stop further processing in the pipeline
                    return throwError(() => error);
                }),
            )
            .subscribe({
                next: response => {
                    console.log('Registration successful:', response);
                    this.toastService.show('На ваш email отправлен код подтверждения', 'success');
                    this.isRegistering = false;
                    this.registeredEmail = registrationData.email;
                    this.closeRegisterModal();
                    // Open verification modal
                    this.openVerificationModal(this.verificationModal);
                },
                complete: () => {
                    this.isRegistering = false;
                },
            });
    }

    openVerificationModal(content: unknown) {
        this.verificationForm.reset();
        this.verificationError = null;
        this.modalService.open(content, {
            size: 'md',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
    }

    closeVerificationModal() {
        this.modalService.dismissAll();
    }

    verifyEmail() {
        if (this.verificationForm.invalid) {
            this.verificationForm.markAllAsTouched();
            return;
        }

        if (this.isVerifying) return;

        this.verificationError = null;
        this.isVerifying = true;

        const code = this.verificationForm.get('code')?.value;

        this.authService.verifyEmail(this.registeredEmail, code).subscribe({
            next: response => {
                console.log('Verification successful:', response);
                this.toastService.show('Регистрация успешно завершена!', 'success');
                this.closeVerificationModal();

                // Optional: Automatically log in after verification
                this.email.setValue(this.registeredEmail);
                // You may want to navigate to login page instead of auto-login
                // this.router.navigate(['/login']);
            },
            error: error => {
                console.error('Verification failed:', error);

                if (error.status === 400) {
                    this.verificationError = 'Неверный код подтверждения';
                } else if (error.status === 404) {
                    this.verificationError = 'Код подтверждения не найден или истек срок действия';
                } else if (error.status === 0) {
                    this.verificationError = 'Не удалось подключиться к серверу';
                } else {
                    this.verificationError = `Ошибка верификации: ${error.message || 'Неизвестная ошибка'}`;
                }

                this.isVerifying = false;
            },
            complete: () => {
                this.isVerifying = false;
            },
        });
    }

    resendVerificationCode() {
        if (!this.registeredEmail) {
            this.verificationError = 'Email не найден';
            return;
        }

        this.authService.resendVerificationCode(this.registeredEmail).subscribe({
            next: () => {
                this.toastService.show('Новый код подтверждения отправлен на ваш email', 'success');
            },
            error: error => {
                console.error('Failed to resend code:', error);
                this.verificationError = 'Не удалось отправить код подтверждения';
            },
        });
    }
}
