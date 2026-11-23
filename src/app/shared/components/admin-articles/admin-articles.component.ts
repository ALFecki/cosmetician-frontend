import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Article, ArticleInput, ArticleService, ArticleSummary } from '../../services/article.service';

@Component({
    selector: 'app-admin-articles',
    imports: [DatePipe, ReactiveFormsModule],
    templateUrl: './admin-articles.component.html',
    styleUrl: './admin-articles.component.scss',
})
export class AdminArticlesComponent implements OnInit {
    private readonly api = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    readonly form = inject(FormBuilder).nonNullable.group({ title: '', summary: '', body: '' });

    articles: ArticleSummary[] | null = null;
    editing?: Article;
    editorOpen = false;
    loading = false;
    loadingId?: string;
    saving = false;
    error = '';
    feedback = '';

    ngOnInit(): void {
        this.loadArticles();
    }

    get hasPendingChanges(): boolean {
        return this.saving || (this.editorOpen && this.form.dirty);
    }

    canLeave(): boolean {
        return !this.saving && (!this.hasPendingChanges || window.confirm('Есть несохранённые изменения. Выйти без сохранения?'));
    }

    loadArticles(): void {
        if (this.loading || this.loadingId || this.editorOpen) return;
        this.loading = true;
        this.error = '';
        this.api
            .adminArticles()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: articles => {
                    this.articles = articles;
                    this.loading = false;
                },
                error: () => {
                    this.error = 'Не удалось загрузить список статей.';
                    this.loading = false;
                },
            });
    }

    create(): void {
        if (!this.articles || this.loadingId) return;
        this.openEditor();
    }

    edit(id: string): void {
        if (this.loadingId || this.editorOpen) return;
        this.loadingId = id;
        this.error = '';
        this.feedback = '';
        this.api
            .adminArticle(id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: article => {
                    this.loadingId = undefined;
                    this.openEditor(article);
                },
                error: () => {
                    this.error = 'Не удалось открыть статью.';
                    this.loadingId = undefined;
                },
            });
    }

    closeEditor(): void {
        if (!this.canLeave()) return;
        this.editorOpen = false;
        this.editing = undefined;
        this.error = '';
    }

    save(isPublished = !!this.editing?.publishedAt): void {
        if (!this.editorOpen || this.saving) return;
        const { title, summary, body } = this.form.getRawValue();
        const input = { title: title.trim(), summary: summary.trim(), body: body.trim(), isPublished };
        if (!input.title || [...input.title].length > 160) {
            this.error = 'Введите заголовок длиной от 1 до 160 символов.';
        } else if ([...input.summary].length > 350) {
            this.error = 'Краткое описание должно содержать до 350 символов.';
        } else if ([...input.body].length > 30_000) {
            this.error = 'Текст статьи должен содержать до 30 000 символов.';
        } else if (isPublished && !input.body) {
            this.error = 'Добавьте текст, чтобы опубликовать статью.';
        } else {
            const message = this.editing?.publishedAt
                ? 'Изменения сохранены.'
                : isPublished
                  ? 'Статья опубликована.'
                  : 'Черновик сохранён.';
            this.saveArticle(input, message);
        }
    }

    unpublish(): void {
        if (!this.editing?.publishedAt || this.saving) return;
        if (this.form.dirty && !window.confirm('Снять статью с публикации и выйти без сохранения изменений?')) return;
        const { title, summary, body } = this.editing;
        this.saveArticle({ title, summary, body, isPublished: false }, 'Статья снята с публикации.');
    }

    private openEditor(article?: Article): void {
        this.form.reset({ title: article?.title ?? '', summary: article?.summary ?? '', body: article?.body ?? '' });
        this.editing = article;
        this.editorOpen = true;
        this.error = '';
        this.feedback = '';
    }

    private saveArticle(input: ArticleInput, message: string): void {
        this.saving = true;
        this.error = '';
        this.api
            .save(input, this.editing?.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ id, title, summary, publishedAt }) => {
                    this.articles = [{ id, title, summary, publishedAt }, ...(this.articles ?? []).filter(article => article.id !== id)];
                    this.articles.sort(
                        (left, right) =>
                            (right.publishedAt ? Date.parse(right.publishedAt) : 0) - (left.publishedAt ? Date.parse(left.publishedAt) : 0),
                    );
                    this.saving = false;
                    this.feedback = message;
                    this.editorOpen = false;
                    this.editing = undefined;
                },
                error: () => {
                    this.saving = false;
                    this.error = 'Не удалось сохранить статью. Попробуйте ещё раз.';
                },
            });
    }
}
