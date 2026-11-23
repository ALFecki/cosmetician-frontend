import { AsyncPipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { Article, ArticleService } from '../../shared/services/article.service';
import { ArticleContentComponent } from './article-content.component';

type ArticlePage = { kind: 'loading' | 'missing' | 'error' } | { kind: 'ready'; article: Article };

@Component({
    selector: 'app-article',
    imports: [AsyncPipe, RouterLink, ArticleContentComponent],
    styleUrl: './articles.component.scss',
    template: `
        <div class="sf-container articles">
            <div class="article-column">
                @if (hasPublishedArticles$ | async) {
                    <a class="sf-text-link article-back" routerLink="/articles">← Все статьи</a>
                } @else {
                    <a class="sf-text-link article-back" routerLink="/">← На главную</a>
                }
                @if (page$ | async; as page) {
                    @switch (page.kind) {
                        @case ('loading') {
                            <p role="status">Загрузка статьи…</p>
                        }
                        @case ('missing') {
                            <h1>Статья недоступна</h1>
                        }
                        @case ('error') {
                            <h1>Не удалось загрузить статью</h1>
                        }
                        @case ('ready') {
                            <app-article-content [article]="page.article" />
                        }
                    }
                }
            </div>
        </div>
    `,
})
export class ArticleComponent {
    private readonly api = inject(ArticleService);
    private readonly route = inject(ActivatedRoute);

    readonly hasPublishedArticles$ = this.api.hasPublished$;
    readonly page$: Observable<ArticlePage> = isPlatformBrowser(inject(PLATFORM_ID))
        ? this.route.paramMap.pipe(
              map(params => params.get('id') ?? ''),
              distinctUntilChanged(),
              switchMap(id =>
                  this.api.publicArticle(id).pipe(
                      map(article => (article.publishedAt ? ({ kind: 'ready', article } as const) : ({ kind: 'missing' } as const))),
                      startWith({ kind: 'loading' } as const),
                      catchError((error: HttpErrorResponse) => of({ kind: error.status === 404 ? 'missing' : 'error' } as const)),
                  ),
              ),
          )
        : of({ kind: 'loading' });
}
