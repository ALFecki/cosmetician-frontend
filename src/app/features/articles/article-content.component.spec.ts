import { TestBed } from '@angular/core/testing';
import { ArticleContentComponent } from './article-content.component';

describe('ArticleContentComponent', () => {
    it('renders unsaved article edits in order without a publication date', () => {
        const fixture = TestBed.createComponent(ArticleContentComponent);
        fixture.componentRef.setInput('article', {
            title: 'Черновик статьи',
            summary: 'Краткое описание',
            body: 'Первый абзац\n\nПоследний абзац',
            publishedAt: null,
            bodyImages: [{ image: '/images/sample.jpg', alt: 'Крем', caption: 'Новая подпись', afterParagraph: 1 }],
        });
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.querySelector('h1')?.textContent).toBe('Черновик статьи');
        expect(root.querySelector('time')).toBeNull();
        expect(root.querySelector('figcaption')?.textContent).toBe('Новая подпись');
        expect(root.querySelector<HTMLImageElement>('figure img')?.alt).toBe('Крем');
        expect(Array.from(root.querySelectorAll('.article-body > *'), node => node.tagName)).toEqual(['P', 'FIGURE', 'P']);
    });
});
