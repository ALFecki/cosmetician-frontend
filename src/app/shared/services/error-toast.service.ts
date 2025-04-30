import { Injectable, NgZone } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ErrorToastService {
    message = '';
    visible = false;
    private timeoutId: ReturnType<typeof setTimeout> | null = null;

    constructor(private ngZone: NgZone) {}

    show(message: string, duration = 4000) {
        this.message = message;
        this.visible = true;
        
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
        this.visible = false;
        this.message = '';
    }
}
