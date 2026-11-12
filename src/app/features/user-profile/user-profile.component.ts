import { PhoneAuthComponent } from '../../shared/components/phone-auth/phone-auth.component';
import { OrderService } from '../../shared/services/order.service';
import { apiMessage } from '../../shared/utils/api-message';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
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
    imports: [ReactiveFormsModule, ProfileSidebarComponent, PhoneAuthComponent],
})
export class UserProfileComponent implements OnInit {
    profileForm!: FormGroup;
    currentUser: BehaviorSubject<PersonModel | null> = new BehaviorSubject<PersonModel | null>(null);
    loading = false;
    initialLoading = true;
    emailVerificationLoading = false;
    error: string | null = null;
    success: string | null = null;

    constructor(
        public authService: AuthService,
        private personService: PersonService,
        private fb: FormBuilder,
        private router: Router,
        private toastService: ToastService,
        private verifyEmailModalService: VerifyEmailModalService,
        private orderService: OrderService,
    ) {}

    async ngOnInit(): Promise<void> {
        try {
            await this.authService.ready;
            await firstValueFrom(this.authService.checkAuth());
        } catch (error) {
            this.error = apiMessage(error, 'Не удалось загрузить профиль. Обновите страницу.');
            this.initialLoading = false;
            return;
        }
        this.authService.getCurrentUser().subscribe(
            user => {
                this.currentUser.next(user);
                if (!user) {
                    this.router.navigate(['/']);
                } else {
                    this.initForm();
                }
                this.initialLoading = false;
            },
            error => {
                this.error = 'Не удалось загрузить информацию о пользователе: ' + (error.message || 'Неизвестная ошибка');
                this.initialLoading = false;
            },
        );
    }

    private initForm(): void {
        this.profileForm = this.fb.group({
            firstName: [this.currentUser.value?.firstName, [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
            secondName: [this.currentUser.value?.secondName, [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)]],
            email: [
                this.currentUser.value?.verifiedPhone ? this.currentUser.value?.contactEmail || '' : this.currentUser.value?.email || '',
                this.currentUser.value?.verifiedPhone ? [Validators.email] : [Validators.required, Validators.email],
            ],
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

        if (this.currentUser.value?.verifiedPhone) {
            try {
                const value = this.profileForm.getRawValue();
                const user = await this.orderService.updateContactProfile(
                    value.firstName.trim(),
                    value.secondName.trim(),
                    value.email?.trim() || null,
                );
                this.authService.updateCurrentUser(user);
                this.success = 'Профиль обновлён';
            } catch (error) {
                this.error = apiMessage(error);
            } finally {
                this.loading = false;
            }
            return;
        }
        const updatedUser: UpdatePersonSchema = {
            firstName: this.profileForm.value.firstName,
            secondName: this.profileForm.value.secondName,
            email: this.profileForm.value.email,
            phone: this.profileForm.value.phone,
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
