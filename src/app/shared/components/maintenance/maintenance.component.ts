import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IconsModule } from '../../base/icons/icons.module';
import { LoginData } from '../../models/login.interface';
import { AuthService } from '../../services/auth.service';
import { MaintenanceService } from '../../services/maintenance.service';
import { ToastService } from '../../services/toast.service';
import { firstValueFrom } from 'rxjs';
import { Md5 } from 'ts-md5';

@Component({
    selector: 'app-maintenance',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, IconsModule],
    templateUrl: './maintenance.component.html',
    styleUrl: './maintenance.component.scss',
})
export class MaintenanceComponent implements OnInit {
    loginForm: FormGroup;
    isLoggingIn = false;
    loginError: string | null = null;

    constructor(
        private authService: AuthService,
        private maintenanceService: MaintenanceService,
        private toastService: ToastService,
        private router: Router,
    ) {
        this.loginForm = new FormGroup({
            email: new FormControl('', [Validators.required, Validators.email]),
            password: new FormControl('', [Validators.required, Validators.minLength(6)]),
        });
    }

    async ngOnInit(): Promise<void> {
        await firstValueFrom(this.authService.checkAuth());
    }

    onSubmit(): void {
        if (this.loginForm.invalid) {
            this.loginForm.markAllAsTouched();
            return;
        }

        if (this.isLoggingIn) return;

        this.loginError = null;
        this.isLoggingIn = true;

        const loginData: LoginData = {
            email: this.loginForm.get('email')?.value,
            password: Md5.hashStr(this.loginForm.get('password')?.value),
        };

        this.authService.login(loginData).subscribe({
            next: response => {
                console.log('Login successful:', response);

                if (this.authService.isAdmin()) {
                    this.toastService.show('Успешный вход в систему администратора', 'success');
                    this.router.navigate(['/']);
                } else {
                    this.loginError = 'Доступ разрешен только администраторам во время технических работ';
                    this.authService.logout().subscribe();
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
            },
            complete: () => {
                this.isLoggingIn = false;
            },
        });
    }

    get email() {
        return this.loginForm.get('email');
    }

    get password() {
        return this.loginForm.get('password');
    }
}
