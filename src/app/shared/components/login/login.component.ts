import { CommonModule } from '@angular/common';
import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginData, RegistrationData } from '../../models/login.interface';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-login',
    templateUrl: './login.component.html',
    styleUrl: './login.component.scss',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
})
export class LoginComponent {
    @Input() loginForm: FormGroup = new FormGroup({});
    @ViewChild('loginModal') loginModal!: TemplateRef<unknown>;

    email = new FormControl('');
    password = new FormControl('');
    rememberMe = new FormControl(false);

    // Registration form controls
    registrationForm: FormGroup = new FormGroup({
        firstName: new FormControl('', [Validators.required]),
        secondName: new FormControl('', [Validators.required]),
        surname: new FormControl('', [Validators.required]),
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        confirmPassword: new FormControl('', [Validators.required]),
    });

    @ViewChild('registerModal') registerModal!: TemplateRef<unknown>;

    registrationError: string | null = null;

    constructor(
        private authService: AuthService,
        private modalService: NgbModal,
    ) {}

    login(): boolean {
        const loginData = {
            email: this.email.value,
            password: this.password.value,
        } as LoginData;

        this.authService.login(loginData).subscribe(
            response => {
                console.log('Login successful:', response);
                this.closeLoginModal();
                return true;
            },
            error => {
                console.error('Login failed:', error);
                return false;
            },
        );
        return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSubmit(event: Event) {
        if (this.loginForm.valid) {
            if (this.login()) {
                this.closeLoginModal();
            }
        }
    }

    openLoginModal(content: unknown) {
        this.loginForm.reset();
        this.modalService.open(content, {
            size: 'lg',
            centered: true,
            scrollable: true,
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
        });
    }

    closeRegisterModal() {
        this.modalService.dismissAll();
    }

    register() {
        if (this.registrationForm.invalid) {
            return;
        }
        const registrationData = {
            email: this.registrationForm.get('email')?.value,
            password: this.registrationForm.get('password')?.value,
            firstName: this.registrationForm.get('firstName')?.value,
            secondName: this.registrationForm.get('secondName')?.value,
            surname: this.registrationForm.get('surname')?.value,
            confirmPassword: this.registrationForm.get('confirmPassword')?.value,
        } as RegistrationData;

        if (registrationData.password !== registrationData.confirmPassword) {
            this.registrationError = 'Пароли не совпадают';
            return;
        }

        this.authService.register(registrationData).subscribe(
            response => {
                console.log('Registration successful:', response);
                this.closeRegisterModal();
            },
            error => {
                console.error('Registration failed:', error);
                this.registrationError = 'Ошибка регистрации';
            },
        );
        
        this.registrationError = null;
        this.closeRegisterModal();
    }
}
