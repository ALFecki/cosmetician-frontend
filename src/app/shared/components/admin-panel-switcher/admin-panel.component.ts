import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-admin-panel',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './admin-panel.component.html',
    styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent implements OnInit {
    @Input() modelTemplate!: Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    @Input() service!: { create: (data: any) => any };
    form!: FormGroup;
    submitted = false;
    error: string | null = null;
    success: string | null = null;

    constructor(private fb: FormBuilder) {}

    ngOnInit() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const group: Record<string, any> = {};
        Object.keys(this.modelTemplate).forEach(key => {
            group[key] = [this.modelTemplate[key]];
        });
        this.form = this.fb.group(group);
    }

    async onSubmit() {
        this.submitted = true;
        this.error = null;
        this.success = null;
        if (this.form.invalid) return;
        try {
            await this.service.create(this.form.value).toPromise();
            this.success = 'Данные успешно сохранены';
            this.form.reset(this.modelTemplate);
        } catch (error) {
            this.error = 'Ошибка при сохранении данных';
            console.error('Ошибка при сохранении данных:', error);
        }
    }

    modelType(key: string) {
        if (this.modelTemplate[key] === null) return 'string';
        if (typeof this.modelTemplate[key] === 'string') return 'string';
        if (typeof this.modelTemplate[key] === 'number') return 'number';
        if (typeof this.modelTemplate[key] === 'boolean') return 'boolean';
        return 'string';
    }
}
