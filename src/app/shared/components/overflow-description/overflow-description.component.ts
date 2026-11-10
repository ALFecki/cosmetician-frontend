import { isPlatformBrowser } from '@angular/common';
import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    PLATFORM_ID,
    ViewChild,
} from '@angular/core';
let descriptionId = 0;

@Component({
    selector: 'app-overflow-description',
    standalone: true,
    template: `
        <div #description class="description" [class.expanded]="expanded" [id]="contentId">{{ text }}</div>
        @if (overflows) {
            <button type="button" [attr.aria-expanded]="expanded" [attr.aria-controls]="contentId" (click)="expanded = !expanded">
                {{ expanded ? 'Свернуть' : 'Подробнее' }} <span aria-hidden="true">{{ expanded ? '−' : '+' }}</span>
            </button>
        }
    `,
    styles: [
        `
            :host {
                display: block;
                color: var(--sf-muted, #7d7065);
            }
            .description {
                line-height: 1.8;
                max-height: 5.4em;
                overflow: hidden;
                white-space: pre-line;
            }
            .description.expanded {
                max-height: none;
            }
            button {
                display: inline-flex;
                align-items: center;
                gap: 18px;
                min-height: 44px;
                margin-top: 8px;
                padding: 6px 0;
                background: none;
                color: var(--sf-rose, #8e4659);
                border: 0;
                border-bottom: 1px solid var(--sf-line, #ded5ca);
                font: inherit;
            }
        `,
    ],
})
export class OverflowDescriptionComponent implements AfterViewInit, OnChanges, OnDestroy {
    @Input() text = '';
    @ViewChild('description') description?: ElementRef<HTMLElement>;
    readonly contentId = `sf-description-${++descriptionId}`;
    expanded = false;
    overflows = false;
    private observer?: ResizeObserver;
    private destroyed = false;
    private platformId = inject(PLATFORM_ID);
    private cdr = inject(ChangeDetectorRef);

    ngOnChanges() {
        this.expanded = false;
        if (this.description)
            queueMicrotask(() => {
                if (!this.destroyed) {
                    this.measureOverflow();
                    this.cdr.markForCheck();
                }
            });
    }
    ngAfterViewInit() {
        if (!isPlatformBrowser(this.platformId)) return;
        this.measureOverflow();
        this.cdr.detectChanges();
        this.observer = new ResizeObserver(() => {
            this.measureOverflow();
            this.cdr.markForCheck();
        });
        this.observer.observe(this.description!.nativeElement);
        document.fonts?.ready.then(() => {
            if (!this.destroyed) {
                this.measureOverflow();
                this.cdr.markForCheck();
            }
        });
    }
    @HostListener('window:resize')
    measureOverflow() {
        if (!this.description || !isPlatformBrowser(this.platformId)) return;
        const element = this.description.nativeElement;
        const lineHeight = parseFloat(getComputedStyle(element).lineHeight);
        this.overflows = element.scrollHeight > lineHeight * 3 + 1;
        if (!this.overflows) this.expanded = false;
    }
    ngOnDestroy() {
        this.destroyed = true;
        this.observer?.disconnect();
    }
}
