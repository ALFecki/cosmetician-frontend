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
}
