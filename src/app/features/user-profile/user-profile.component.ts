import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ProfileSidebarComponent } from '../../shared/components/profile-sidebar/profile-sidebar.component';
import { PersonModel } from '../../shared/models/person.model';
import { UpdatePersonSchema } from '../../shared/schemas/person.schema';
import { AuthService } from '../../shared/services/auth.service';
import { PersonService } from '../../shared/services/person.service';
import { ToastService } from '../../shared/services/toast.service';
import { VerifyEmailModalService } from '../../shared/services/verify-email-modal.service';

@Component({
    selector: 'app-user-profile',
    templateUrl: './user-profile.component.html',
    styleUrl: './user-profile.component.scss',
    imports: [ReactiveFormsModule, ProfileSidebarComponent],
})
export class UserProfileComponent implements OnInit {
    profileForm!: FormGroup;
    currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);
    loading = false;
    emailVerificationLoading = false;
    error: string | null = null;
    success: string | null = null;

    constructor(
        private authService: AuthService,
        private personService: PersonService,
        private fb: FormBuilder,
        private router: Router,
        private toastService: ToastService,
        private verifyEmailModalService: VerifyEmailModalService,
    ) {}

    ngOnInit(): void {
        this.authService.getCurrentUser().subscribe(
            user => {
                this.currentUser.next(user);
                if (!user) {
                    this.router.navigate(['/']);
                }
            },
            error => {
                this.error = 'Не удалось загрузить информацию о пользователе: ' + (error.message || 'Неизвестная ошибка');
                this.loading = false;
            },
        );

        if (!this.currentUser.value) {
            this.router.navigate(['/']);
            return;
        }

        this.initForm();
    }

    private initForm(): void {
        this.profileForm = this.fb.group({
            firstName: [this.currentUser.value?.firstName, Validators.required],
            secondName: [this.currentUser.value?.secondName, Validators.required],
            surname: [this.currentUser.value?.surname],
            email: [{ value: this.currentUser.value?.email, disabled: true }, [Validators.required, Validators.email]],
            phone: [this.currentUser.value?.phone],
        });
    }

    async onSubmit(): Promise<void> {
        if (this.profileForm.invalid) {
            return;
        }

        this.loading = true;
        this.error = null;
        this.success = null;

        // const updatedUser = {
        //     ...this.currentUser.value,
        //     ...this.profileForm.value,
        //     email: this.currentUser.value?.email, // Keep original email
        // };

        const updatedUser: UpdatePersonSchema = {
            ...this.profileForm.value,
            email: this.currentUser.value?.email, // Keep original email
        };

        const result = await this.personService.update(this.currentUser.value!.id, updatedUser);

        if (!result) {
            this.loading = false;
            this.error = 'Не удалось обновить профиль. Пожалуйста, попробуйте позже.';
            this.toastService.show('Не удалось обновить профиль', 'error');
            return;
        } else if (result.status !== 'success') {
            this.loading = false;
            this.error = 'Ошибка при обновлении профиля: ' + (result.data || 'Неизвестная ошибка');
            this.toastService.show('Ошибка при обновлении профиля', 'error');
            return;
        }
        this.loading = false;
        this.currentUser.next(result.data);
        this.success = 'Профиль успешно обновлен';
        this.toastService.show('Профиль успешно обновлен', 'success');
    }

    async sendEmailVerification(): Promise<void> {
        this.emailVerificationLoading = true;
        this.error = null;
        this.success = null;

        try {
            this.verifyEmailModalService.openVerifyEmailModal().subscribe(verified => {
                if (verified) {
                    this.authService.getCurrentUser().subscribe(user => {
                        this.currentUser.next(user);
                    });
                }
            });
            this.emailVerificationLoading = false;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            this.error = 'Не удалось отправить письмо с подтверждением: ' + errorMessage;
            this.toastService.show('Не удалось отправить письмо с подтверждением', 'error');
            this.emailVerificationLoading = false;
        }
    }

    logout(): void {
        this.authService.logout().subscribe(() => {
            this.router.navigate(['/']);
        });
    }
}
