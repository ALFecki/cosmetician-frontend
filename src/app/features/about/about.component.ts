import { Component } from '@angular/core';
import { AboutMeComponent } from '../home/components/about-me/about-me.component';

@Component({
    selector: 'app-about',
    imports: [AboutMeComponent],
    template: `
        <header class="sf-container about-heading">
            <p class="sf-eyebrow">История, люди и ценности</p>
            <h1>О SkViDerm</h1>
        </header>
        <app-about-me [fullStory]="true"></app-about-me>
    `,
    styles: `
        .about-heading {
            padding-block: 36px 0;
        }
    `,
})
export class AboutComponent {}
