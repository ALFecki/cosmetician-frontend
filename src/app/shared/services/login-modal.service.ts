import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginComponent } from '../components/login/login.component';

@Injectable({
    providedIn: 'root',
})
export class LoginModalService {
    constructor(private modalService: NgbModal) {}

    openLoginModal(emailMode = false): void {
        const modal = this.modalService.open(LoginComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
        modal.componentInstance.emailMode = emailMode;
    }
}
