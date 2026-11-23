import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArticleService } from '../../shared/services/article.service';

@Component({
    selector: 'app-articles',
    imports: [AsyncPipe, DatePipe, RouterLink],
    styleUrl: './articles.component.scss',
    template: `
        <div class="sf-container articles">
            <section class="article-column" aria-labelledby="articles-heading">
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
                            <ul class="article-list">
                                @for (article of published.articles; track article.id) {
                                    <li>
                                        <a [routerLink]="['/articles', article.id]">
                                            <time [attr.datetime]="article.publishedAt">{{
                                                article.publishedAt | date: 'dd.MM.yyyy'
                                            }}</time>
                                            <h2>{{ article.title }}</h2>
                                            @if (article.summary) {
                                                <p>{{ article.summary }}</p>
                                            }
                                        </a>
                                    </li>
                                } @empty {
                                    <li>
                                        <p>Статей пока нет.</p>
                                        <a class="sf-text-link" routerLink="/">На главную</a>
                                    </li>
                                }
                            </ul>
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
