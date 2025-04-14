import { Component, Input, TemplateRef, ViewChild } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { LoginData } from '../../models/login.interface';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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

    constructor(
        private authService: AuthService,
        private modalService: NgbModal,
    ) {}

    login() {
        const loginData = {
            email: this.email.value,
            password: this.password.value,
        } as LoginData;

        this.authService.login(loginData).subscribe(
            response => {
                // Handle successful login
                console.log('Login successful:', response);
            },
            error => {
                // Handle login error
                console.error('Login failed:', error);
            },
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    onSubmit(event: Event) {
        if (this.loginForm.valid) {
            this.login();
        } else {
            console.error('Form is invalid');
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
}
