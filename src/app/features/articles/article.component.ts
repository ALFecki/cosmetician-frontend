import { AsyncPipe, DatePipe, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, PLATFORM_ID, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, distinctUntilChanged, map, of, startWith, switchMap } from 'rxjs';
import { Article, ArticleBodyImage, ArticleService } from '../../shared/services/article.service';
import { articleParagraphs, splitArticleText } from '../../shared/utils/article-text';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';

type ArticlePage =
    | { kind: 'loading' | 'missing' | 'error' }
    | {
          kind: 'ready';
          article: Article;
          sections: { paragraphs: string[]; image?: ArticleBodyImage }[];
      };

@Component({
    selector: 'app-article',
    imports: [AsyncPipe, DatePipe, RouterLink, ImageUrlPipe],
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
                            <article aria-labelledby="article-heading">
                                <header>
                                    <time [attr.datetime]="page.article.publishedAt">
                                        {{ page.article.publishedAt | date: 'dd.MM.yyyy' }}
                                    </time>
                                    <h1 id="article-heading">{{ page.article.title }}</h1>
                                    @if (page.article.summary) {
                                        <p class="article-summary">{{ page.article.summary }}</p>
                                    }
                                </header>
                                @if (page.article.coverImage; as coverImage) {
                                    <img class="article-cover" [src]="coverImage.image | imageUrl" [alt]="coverImage.alt" />
                                }
                                <div class="article-body">
                                    @for (section of page.sections; track $index) {
                                        @for (paragraph of section.paragraphs; track $index) {
                                            <p>{{ paragraph }}</p>
                                        }
                                        @if (section.image; as image) {
                                            <figure>
                                                <img [src]="image.image | imageUrl" [alt]="image.alt" loading="lazy" />
                                                @if (image.caption) {
                                                    <figcaption>{{ image.caption }}</figcaption>
                                                }
                                            </figure>
                                        }
                                    }
                                </div>
                            </article>
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
                      map(article => {
                          if (!article.publishedAt) return { kind: 'missing' } as const;
                          const images = article.bodyImages ?? [];
                          const sections = splitArticleText(
                              article.body,
                              images.map(image => image.afterParagraph),
                          ).map((text, index) => ({ paragraphs: articleParagraphs(text), image: images[index] }));
                          return { kind: 'ready', article, sections } as const;
                      }),
                      startWith({ kind: 'loading' } as const),
                      catchError((error: HttpErrorResponse) => of({ kind: error.status === 404 ? 'missing' : 'error' } as const)),
                  ),
              ),
          )
        : of({ kind: 'loading' });
}
