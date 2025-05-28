import { Injectable, NgZone } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

@Injectable({ providedIn: 'root' })
export class ToastService {
    message = '';
    visible = false;
    type: ToastType = 'info';
    fadeOut = false;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(private ngZone: NgZone) {}

    show(message: string, type: ToastType = 'info', duration = 4000) {
        this.message = message;
        this.type = type;
        this.visible = true;
        this.fadeOut = false;

        clearTimeout(this.timeoutId!);
        this.ngZone.runOutsideAngular(() => {
            this.timeoutId = setTimeout(() => {
                this.ngZone.run(() => {
                    this.hide();
                });
            }, duration);
        });
    }

    hide() {
        this.fadeOut = true;
        setTimeout(() => {
            this.visible = false;
            this.message = '';
            this.fadeOut = false;
        }, 300);
    }
}
