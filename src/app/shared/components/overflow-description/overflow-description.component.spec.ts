import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverflowDescriptionComponent } from './overflow-description.component';

describe('Description disclosure', () => {
    let fixture: ComponentFixture<OverflowDescriptionComponent>;
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [OverflowDescriptionComponent] }).compileComponents();
        fixture = TestBed.createComponent(OverflowDescriptionComponent);
        fixture.nativeElement.style.cssText = 'display:block;width:280px';
    });
    function render(text: string) {
        fixture.componentRef.setInput('text', text);
        fixture.detectChanges();
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
    }
    it('leaves short laid-out text without a redundant toggle', () => {
        render('Короткое описание.');
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
    });
    it('reveals the complete overflowing description and can collapse it', () => {
        const text = 'Описание профессионального ухода за кожей. '.repeat(30);
        render(text);
        const button = fixture.nativeElement.querySelector('button');
        expect(button).not.toBeNull();
        button?.click();
        fixture.detectChanges();
        expect(button?.getAttribute('aria-expanded')).toBe('true');
        const content = fixture.nativeElement.querySelector('.description');
        expect(content.textContent).toContain(text.trim());
        expect(content.scrollHeight).toBeLessThanOrEqual(content.clientHeight + 1);
        button?.click();
        fixture.detectChanges();
        expect(button?.getAttribute('aria-expanded')).toBe('false');
    });
    it('remeasures when the viewport or content changes', () => {
        render('Описание ухода за кожей. '.repeat(9));
        expect(fixture.nativeElement.querySelector('button')).not.toBeNull();
        fixture.nativeElement.style.width = '3000px';
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
        render('Короткое описание');
        fixture.nativeElement.style.width = '200px';
        window.dispatchEvent(new Event('resize'));
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('button')).toBeNull();
    });
});
