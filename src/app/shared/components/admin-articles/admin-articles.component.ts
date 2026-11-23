import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { ArticleContentComponent, ArticleContentData } from '../../../features/articles/article-content.component';
import {
    Article,
    ArticleBodyImage,
    ArticleImage,
    ArticleInput,
    ArticleMedia,
    ArticleService,
    ArticleSummary,
    maxFeaturedArticles,
    orderedFeaturedArticles,
} from '../../services/article.service';
import { articleParagraphs, joinArticleText, splitArticleText, trimArticleText } from '../../utils/article-text';
import { ImageUrlPipe } from '../../utils/image-url.pipe';

@Component({
    selector: 'app-admin-articles',
    imports: [ArticleContentComponent, DatePipe, ImageUrlPipe, ReactiveFormsModule],
    templateUrl: './admin-articles.component.html',
    styleUrl: './admin-articles.component.scss',
})
export class AdminArticlesComponent implements OnInit {
    private readonly api = inject(ArticleService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly forms = inject(FormBuilder).nonNullable;
    readonly bodySections = this.forms.array<FormControl<string>>([]);
    readonly form = this.forms.group({ title: '', summary: '', bodySections: this.bodySections });
    readonly maxFeatured = maxFeaturedArticles;
    readonly maxBodyImages = 10;

    coverImage: ArticleImage | null = null;
    bodyImages: Omit<ArticleBodyImage, 'afterParagraph'>[] = [];
    placementSection: FormControl<string> | null = null;
    placementParagraphs: string[] = [];
    placementPosition: number | null = null;
    previewArticle: ArticleContentData | null = null;
    phonePreview = false;
    uploading = false;
    featuredIds: string[] = [];
    private mediaChanged = false;

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
        return this.saving || this.uploading || (this.editorOpen && this.form.dirty) || this.featuredChanged;
    }

    canLeave(): boolean {
        return !this.saving && !this.uploading && (!this.hasPendingChanges || this.confirmDiscard());
    }

    get featuredChanged(): boolean {
        return this.featuredIds.join(',') !== this.savedFeaturedIds().join(',');
    }

    get publishedArticles(): ArticleSummary[] {
        return (this.articles ?? []).filter(article => !!article.publishedAt);
    }

    get canSelectFeatured(): boolean {
        return this.publishedArticles.some(article => article.featuredPosition !== undefined);
    }

    get canUploadMedia(): boolean {
        if (this.editing && !Array.isArray(this.editing.bodyImages)) return false;
        return (
            !this.articles?.length ||
            this.articles.some(article => article.coverImage !== undefined && article.featuredPosition !== undefined)
        );
    }

    paragraphSnippet(paragraph: string): string {
        return paragraph.replace(/^(.{64}).+/su, '$1…');
    }

    toggleFeatured(id: string): void {
        if (this.saving || this.loadingId) return;
        if (this.featuredIds.includes(id)) {
            this.featuredIds = this.featuredIds.filter(selected => selected !== id);
        } else if (this.featuredIds.length < this.maxFeatured && this.publishedArticles.some(article => article.id === id)) {
            this.featuredIds = [...this.featuredIds, id];
        }
    }

    saveFeatured(): void {
        if (!this.articles || this.saving || this.loadingId || !this.featuredChanged) return;
        this.saving = true;
        this.feedback = '';
        this.error = '';
        this.api
            .setFeatured(this.featuredIds)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: ({ ids }) => {
                    this.featuredIds = ids;
                    this.articles = (this.articles ?? []).map(article => ({
                        ...article,
                        featuredPosition: ids.indexOf(article.id) + 1 || null,
                    }));
                    this.saving = false;
                    this.feedback = 'Подборка сохранена.';
                },
                error: (error: HttpErrorResponse) => {
                    this.saving = false;
                    if (error.status === 400 || error.status === 404) {
                        this.loadArticles();
                        this.error = 'Не удалось сохранить подборку. Выберите статьи из обновлённого списка.';
                    } else {
                        this.error = 'Не удалось сохранить подборку. Попробуйте ещё раз.';
                    }
                },
            });
    }

    loadArticles(): void {
        if (this.loading || this.loadingId || this.editorOpen || this.saving) return;
        this.loading = true;
        this.error = '';
        this.api
            .adminArticles()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: articles => {
                    this.articles = articles;
                    this.featuredIds = this.savedFeaturedIds();
                    this.loading = false;
                },
                error: () => {
                    this.error = 'Не удалось загрузить список статей.';
                    this.loading = false;
                },
            });
    }

    create(): void {
        if (!this.articles || this.loadingId || this.saving) return;
        this.openEditor();
    }

    edit(id: string): void {
        if (this.loadingId || this.editorOpen || this.saving) return;
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
        if (this.saving || this.uploading || (this.form.dirty && !this.confirmDiscard())) return;
        this.editorOpen = false;
        this.editing = undefined;
        this.previewArticle = null;
        this.error = '';
    }

    showPreview(): void {
        if (this.saving || this.uploading) return;
        this.placementSection = null;
        this.previewArticle = { ...this.composeArticle(), publishedAt: this.editing?.publishedAt ?? null };
    }

    uploadCover(input: HTMLInputElement): void {
        this.upload(input, image => {
            this.coverImage = { image, alt: '' };
        });
    }

    removeCover(): void {
        this.coverImage = null;
        this.markMediaChanged();
    }

    togglePlacement(section: FormControl<string>): void {
        this.placementSection = this.placementSection === section ? null : section;
        this.placementParagraphs = articleParagraphs(this.placementSection?.value ?? '');
        this.placementPosition = this.placementParagraphs.length;
    }

    updatePlacement(section: FormControl<string>, text: string): void {
        if (this.placementSection !== section) return;
        const paragraphs = articleParagraphs(text);
        if (paragraphs.length === this.placementParagraphs.length && paragraphs.every((text, i) => text === this.placementParagraphs[i]))
            return;
        this.placementParagraphs = paragraphs;
        this.placementPosition = null;
    }

    uploadBodyImage(input: HTMLInputElement, sectionIndex: number): void {
        const control = this.bodySections.at(sectionIndex);
        const afterParagraph = this.placementPosition;
        if (this.placementSection !== control || afterParagraph === null || this.bodyImages.length >= this.maxBodyImages) return;
        this.upload(input, image => {
            const [before, after] = splitArticleText(control.value, [afterParagraph]);
            control.setValue(before);
            this.bodySections.insert(sectionIndex + 1, this.forms.control(after));
            this.bodyImages.splice(sectionIndex, 0, { image, alt: '' });
            this.placementSection = null;
        });
    }

    removeBodyImage(index: number): void {
        this.placementSection = null;
        const before = this.bodySections.at(index);
        before.setValue(joinArticleText(before.value, this.bodySections.at(index + 1).value));
        this.bodySections.removeAt(index + 1);
        this.bodyImages.splice(index, 1);
        this.markMediaChanged();
    }

    markMediaChanged(): void {
        this.mediaChanged = true;
        this.form.markAsDirty();
    }

    save(isPublished = !!this.editing?.publishedAt): void {
        if (!this.editorOpen || this.saving || this.uploading) return;
        const { title, summary, body, coverImage, bodyImages } = this.composeArticle();
        const input: ArticleInput = { title, summary, body, isPublished };
        if (this.mediaChanged || (this.bodySections.dirty && this.bodyImages.length)) {
            input.media = { coverImage, bodyImages };
        }
        if (!input.title || [...input.title].length > 160) {
            this.error = 'Введите заголовок длиной от 1 до 160 символов.';
        } else if ([...input.summary].length > 350) {
            this.error = 'Краткое описание должно содержать до 350 символов.';
        } else if ([...input.body].length > 30_000) {
            this.error = 'Текст статьи должен содержать до 30 000 символов.';
        } else if (isPublished && !trimArticleText(body)) {
            this.error = 'Добавьте текст, чтобы опубликовать статью.';
        } else if (
            input.media &&
            [input.media.coverImage, ...input.media.bodyImages].some(image => image && (!image.alt || [...image.alt].length > 200))
        ) {
            this.error = 'Для каждой фотографии добавьте описание длиной до 200 символов.';
        } else if (input.media?.bodyImages.some(image => image.caption && [...image.caption].length > 240)) {
            this.error = 'Подпись к фотографии должна содержать до 240 символов.';
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
        if (!this.editing?.publishedAt || this.saving || this.uploading) return;
        if (this.form.dirty && !window.confirm('Снять статью с публикации и выйти без сохранения изменений?')) return;
        const { title, summary, body } = this.editing;
        this.saveArticle({ title, summary, body, isPublished: false }, 'Статья снята с публикации.');
    }

    private openEditor(article?: Article): void {
        const images = article?.bodyImages ?? [];
        this.bodySections.clear();
        for (const section of splitArticleText(
            article?.body ?? '',
            images.map(image => image.afterParagraph),
        )) {
            this.bodySections.push(this.forms.control(section));
        }
        this.form.reset({ title: article?.title ?? '', summary: article?.summary ?? '', bodySections: this.bodySections.getRawValue() });
        this.coverImage = article?.coverImage ? { ...article.coverImage } : null;
        this.bodyImages = images.map(({ image, alt, caption }) => ({ image, alt, caption }));
        this.placementSection = null;
        this.previewArticle = null;
        this.phonePreview = false;
        this.mediaChanged = false;
        this.editing = article;
        this.editorOpen = true;
        this.error = '';
        this.feedback = '';
    }

    private composeArticle(): Pick<Article, 'title' | 'summary' | 'body'> & ArticleMedia {
        const { title, summary, bodySections } = this.form.getRawValue();
        const coverImage = this.coverImage && { ...this.coverImage, alt: this.coverImage.alt.trim() };
        let afterParagraph = 0;
        const bodyImages = this.bodyImages.map(({ image, alt, caption }, index) => {
            afterParagraph += articleParagraphs(bodySections[index]).length;
            return { image, alt: alt.trim(), caption: caption?.trim() || undefined, afterParagraph };
        });
        return { title: title.trim(), summary: summary.trim(), body: bodySections.reduce(joinArticleText), coverImage, bodyImages };
    }

    private saveArticle(input: ArticleInput, message: string): void {
        this.saving = true;
        this.error = '';
        this.api
            .save(input, this.editing?.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: article => {
                    const { id, title, summary, publishedAt, coverImage, featuredPosition } = article;
                    const preserveSelection = this.featuredChanged;
                    this.articles = [
                        { id, title, summary, publishedAt, coverImage, featuredPosition },
                        ...(this.articles ?? []).filter(previous => previous.id !== id),
                    ];
                    this.articles.sort(
                        (left, right) =>
                            (right.publishedAt ? Date.parse(right.publishedAt) : 0) - (left.publishedAt ? Date.parse(left.publishedAt) : 0),
                    );
                    this.featuredIds = preserveSelection
                        ? this.featuredIds.filter(selected => selected !== id || !!publishedAt)
                        : this.savedFeaturedIds();
                    this.saving = false;
                    if (input.media && (coverImage === undefined || !Array.isArray(article.bodyImages))) {
                        this.editing = article;
                        this.error = 'Текст сохранён. Сервер не подтвердил сохранение фотографий.';
                        return;
                    }
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

    private upload(input: HTMLInputElement, apply: (image: string) => void): void {
        const file = input.files?.[0];
        if (!file || this.uploading || this.saving) return;
        input.value = '';
        this.error = '';
        this.uploading = true;
        this.api
            .uploadImage(file)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: image => {
                    apply(image);
                    this.markMediaChanged();
                    this.uploading = false;
                },
                error: () => {
                    this.uploading = false;
                    this.error = 'Не удалось загрузить фотографию. Попробуйте ещё раз.';
                },
            });
    }

    private savedFeaturedIds(): string[] {
        return orderedFeaturedArticles(this.articles ?? []).map(article => article.id);
    }

    private confirmDiscard(): boolean {
        return window.confirm('Есть несохранённые изменения. Выйти без сохранения?');
    }
}
