import { Injectable } from '@angular/core';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { Observable, from } from 'rxjs';
import { VerifyEmailModalComponent } from '../components/verify-email-modal/verify-email-modal.component';

@Injectable({
    providedIn: 'root',
})
export class VerifyEmailModalService {
    constructor(private modalService: NgbModal) {}

    openVerifyEmailModal(): Observable<boolean | undefined> {
        const modalRef: NgbModalRef = this.modalService.open(VerifyEmailModalComponent, {
            size: 'md',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });

        return from(modalRef.result.catch(() => undefined));
    }
}
