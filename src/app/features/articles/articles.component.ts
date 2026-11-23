import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleService } from '../../shared/services/article.service';
import { ArticleCardsComponent } from './article-cards.component';

@Component({
    selector: 'app-articles',
    imports: [AsyncPipe, RouterLink, ArticleCardsComponent],
    styleUrl: './articles.component.scss',
    template: `
        <div class="sf-container articles">
            <section aria-labelledby="articles-heading">
                <h1 id="articles-heading">Статьи</h1>
                @if (published$ | async; as published) {
                    @switch (published.kind) {
                        @case ('loading') {
                            <p role="status">Загрузка статей…</p>
                        }
                        @case ('error') {
                            <p role="status">Не удалось загрузить статьи.</p>
                            <a class="sf-text-link" routerLink="/">На главную</a>
                        }
                        @case ('ready') {
                            @if (published.articles.length) {
                                <app-article-cards [articles]="published.articles" />
                            } @else {
                                <p>Статей пока нет.</p>
                                <a class="sf-text-link" routerLink="/">На главную</a>
                            }
                        }
                    }
                }
            </section>
        </div>
    `,
})
export class ArticlesComponent {
    readonly published$ = inject(ArticleService).published$;
}
