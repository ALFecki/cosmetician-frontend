import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleSummary } from '../../shared/services/article.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';

@Component({
    selector: 'app-article-cards',
    imports: [DatePipe, RouterLink, ImageUrlPipe],
    styleUrl: './article-cards.component.scss',
    template: `
        <ul class="article-cards">
            @for (article of articles(); track article.id) {
                <li>
                    <a [routerLink]="['/articles', article.id]">
                        @if (article.coverImage; as cover) {
                            <img [src]="cover.image | imageUrl" [alt]="cover.alt" loading="lazy" />
                        }
                        <div class="card-copy">
                            <time [attr.datetime]="article.publishedAt">{{ article.publishedAt | date: 'dd.MM.yyyy' }}</time>
                            @if (headingLevel() === 3) {
                                <h3 class="card-title">{{ article.title }}</h3>
                            } @else {
                                <h2 class="card-title">{{ article.title }}</h2>
                            }
                            @if (article.summary) {
                                <p>{{ article.summary }}</p>
                            }
                            <span aria-hidden="true">Читать →</span>
                        </div>
                    </a>
                </li>
            }
        </ul>
    `,
})
export class ArticleCardsComponent {
    readonly articles = input.required<readonly ArticleSummary[]>();
    readonly headingLevel = input<2 | 3>(2);
}
