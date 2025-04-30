import { Component } from '@angular/core';
import { ErrorToastService } from '../../services/error-toast.service';
import { CommonModule } from '@angular/common';


@Component({
    selector: 'app-error-toast',
    templateUrl: './error-toast.component.html',
    styleUrl: './error-toast.component.scss',
    standalone: true,
    imports: [CommonModule],
})
export class ErrorToastComponent {
    constructor(public errorToastService: ErrorToastService) {}
}
