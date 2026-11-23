import { DatePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { Article } from '../../shared/services/article.service';
import { articleParagraphs, splitArticleText } from '../../shared/utils/article-text';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';

export type ArticleContentData = Pick<Article, 'title' | 'summary' | 'body' | 'coverImage' | 'bodyImages' | 'publishedAt'>;

@Component({
    selector: 'app-article-content',
    imports: [DatePipe, ImageUrlPipe],
    styleUrl: './article-content.component.scss',
    template: `
        @let story = article();
        <article aria-labelledby="article-heading">
            <header>
                @if (story.publishedAt) {
                    <time [attr.datetime]="story.publishedAt">{{ story.publishedAt | date: 'dd.MM.yyyy' }}</time>
                }
                <h1 id="article-heading">{{ story.title }}</h1>
                @if (story.summary) {
                    <p class="article-summary">{{ story.summary }}</p>
                }
            </header>
            @if (story.coverImage; as cover) {
                <img class="article-cover" [src]="cover.image | imageUrl" [alt]="cover.alt" />
            }
            <div class="article-body">
                @for (section of sections(); track $index) {
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
    `,
})
export class ArticleContentComponent {
    readonly article = input.required<ArticleContentData>();
    readonly sections = computed(() => {
        const article = this.article();
        const images = article.bodyImages ?? [];
        return splitArticleText(
            article.body,
            images.map(image => image.afterParagraph),
        ).map((text, index) => ({ paragraphs: articleParagraphs(text), image: images[index] }));
    });
}
