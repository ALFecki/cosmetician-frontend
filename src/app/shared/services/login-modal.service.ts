import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoginComponent } from '../components/login/login.component';

@Injectable({
    providedIn: 'root',
})
export class LoginModalService {
    constructor(private modalService: NgbModal) {}

    openLoginModal(): void {
        this.modalService.open(LoginComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
    }
}
