import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
    Observable,
    Subject,
    catchError,
    defer,
    distinctUntilChanged,
    filter,
    map,
    merge,
    of,
    shareReplay,
    startWith,
    switchMap,
    take,
    tap,
} from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListResponse, SingleResponse } from '../base/schemas/base_schema';
import { SKIP_GLOBAL_LOADER } from '../interceptors/loader.interceptor';

export interface ArticleSummary {
    id: string;
    title: string;
    summary: string;
    publishedAt: string | null;
}

export interface Article extends ArticleSummary {
    body: string;
}

export type ArticleInput = Pick<Article, 'title' | 'summary' | 'body'> & { isPublished: boolean };

type PublishedArticles = { kind: 'loading' } | { kind: 'ready'; articles: readonly ArticleSummary[] } | { kind: 'error' };

function articleData<T>(response: SingleResponse<T>): T {
    if (response?.status !== 'success' || !response.data) throw new Error('Invalid article response');
    return response.data;
}

@Injectable({ providedIn: 'root' })
export class ArticleService {
    private readonly http = inject(HttpClient);
    private readonly router = inject(Router);
    private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
    private readonly publicUrl = environment.server_url + '/articles';
    private readonly adminUrl = environment.server_url + '/admin/articles';
    private readonly publicRead = {
        context: new HttpContext().set(SKIP_GLOBAL_LOADER, true),
        transferCache: false,
        timeout: 5000,
    };
    private readonly refreshes = new Subject<void>();

    readonly published$: Observable<PublishedArticles> = defer(() => {
        const navigation = this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            map(event => event.urlAfterRedirects),
            startWith(this.router.navigated ? this.router.url : ''),
            map(url => url.split(/[?#]/, 1)[0]),
            distinctUntilChanged(),
            filter(path => !!path && !/^\/(?:admin|maintenance)(?:\/|$)/.test(path)),
        );
        return merge(navigation, this.refreshes);
    }).pipe(
        filter(() => this.browser),
        switchMap(() =>
            this.http.get<ListResponse<ArticleSummary>>(this.publicUrl, this.publicRead).pipe(
                map(articleData),
                map(articles => ({ kind: 'ready', articles: articles.filter(article => !!article.publishedAt) }) as const),
                catchError((error: HttpErrorResponse) =>
                    error.status === 404 ? of({ kind: 'ready', articles: [] } as const) : of({ kind: 'error' } as const),
                ),
            ),
        ),
        startWith({ kind: 'loading' } as const),
        takeUntilDestroyed(),
        shareReplay({ bufferSize: 1, refCount: false }),
    );

    readonly hasPublished$ = this.published$.pipe(
        map(result => result.kind === 'ready' && result.articles.length > 0),
        distinctUntilChanged(),
    );

    publicArticle(id: string) {
        return this.http
            .get<SingleResponse<Article>>(`${this.publicUrl}/${encodeURIComponent(id)}`, this.publicRead)
            .pipe(map(articleData));
    }

    adminArticles() {
        return this.http.get<ListResponse<ArticleSummary>>(this.adminUrl, { transferCache: false }).pipe(map(articleData));
    }

    adminArticle(id: string) {
        return this.http
            .get<SingleResponse<Article>>(`${this.adminUrl}/${encodeURIComponent(id)}`, { transferCache: false })
            .pipe(map(articleData));
    }

    save(input: ArticleInput, id?: string) {
        const request = id
            ? this.http.put<SingleResponse<Article>>(`${this.adminUrl}/${encodeURIComponent(id)}`, input)
            : this.http.post<SingleResponse<Article>>(this.adminUrl, input);

        return request.pipe(
            map(articleData),
            tap(() => {
                this.published$.pipe(take(1)).subscribe();
                this.refreshes.next();
            }),
        );
    }
}
