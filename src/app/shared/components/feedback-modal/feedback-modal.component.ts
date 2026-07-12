import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../services/toast.service';
import { IconsModule } from '../../base/icons/icons.module';

const FEEDBACK_EMAIL = 'skviderm@gmail.com';

@Component({
    selector: 'app-feedback-modal',
    templateUrl: './feedback-modal.component.html',
    styleUrl: './feedback-modal.component.scss',
    imports: [ReactiveFormsModule, RouterModule, IconsModule],
})
export class FeedbackModalComponent {
    feedbackForm: FormGroup;
    isSubmitting = false;
    submitted = false;

    readonly feedbackEmail = FEEDBACK_EMAIL;
    mailtoLink = '';

    constructor(
        private activeModal: NgbActiveModal,
        private toastService: ToastService,
        private fb: FormBuilder,
    ) {
        this.feedbackForm = this.fb.group({
            name: ['', [Validators.required]],
            email: ['', [Validators.required, Validators.email]],
            phone: [''],
            subject: [''],
            message: ['', [Validators.required, Validators.minLength(10)]],
            personalDataConsent: [false, [Validators.requiredTrue]],
        });
    }

    close(): void {
        this.activeModal.dismiss();
    }

    submit(): void {
        if (this.feedbackForm.invalid || this.isSubmitting) {
            this.feedbackForm.markAllAsTouched();
            return;
        }

        this.isSubmitting = true;

        const { name, email, phone, subject, message } = this.feedbackForm.value;

        const mailSubject = subject?.trim() ? subject.trim() : 'Обращение с сайта SkViDerm';

        const bodyLines: string[] = [`Имя: ${name}`, `Email для ответа: ${email}`];
        if (phone?.trim()) {
            bodyLines.push(`Телефон: ${phone.trim()}`);
        }
        bodyLines.push('', 'Текст обращения:', message);

        this.mailtoLink = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(
            bodyLines.join('\n'),
        )}`;

        window.location.href = this.mailtoLink;

        this.submitted = true;
        this.isSubmitting = false;
        this.toastService.show('Открываем ваш почтовый клиент для отправки обращения', 'success');
    }
}
