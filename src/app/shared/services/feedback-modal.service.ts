import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FeedbackModalComponent } from '../components/feedback-modal/feedback-modal.component';

@Injectable({
    providedIn: 'root',
})
export class FeedbackModalService {
    constructor(private modalService: NgbModal) {}

    openFeedbackModal(): void {
        this.modalService.open(FeedbackModalComponent, {
            size: 'lg',
            centered: true,
            scrollable: true,
            windowClass: 'cosmetician-modal',
        });
    }
}
