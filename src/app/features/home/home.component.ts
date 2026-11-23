import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterModule, UrlTree } from '@angular/router';
import { map } from 'rxjs';
import { IconsModule } from '../../shared/base/icons/icons.module';
import { ProductCarouselComponent } from '../../shared/components/product-carousel/product-carousel.component';
import { ArticleService, orderedFeaturedArticles } from '../../shared/services/article.service';
import { CategoryService } from '../../shared/services/category.service';
import { FeedbackModalService } from '../../shared/services/feedback-modal.service';
import { ImageUrlPipe } from '../../shared/utils/image-url.pipe';
import { ArticleCardsComponent } from '../articles/article-cards.component';
import { AboutMeComponent } from './components/about-me/about-me.component';
import { BenefitsComponent } from './components/benefits/benefits.component';
import { BrandsComponent } from './components/brands/brands.component';
import { CarouselComponent } from './components/carousel/carousel.component';

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss',
    imports: [
        CommonModule,
        RouterModule,
        ImageUrlPipe,
        IconsModule,
        BenefitsComponent,
        AboutMeComponent,
        CarouselComponent,
        BrandsComponent,
        ProductCarouselComponent,
        ArticleCardsComponent,
    ],
})
export class HomeComponent {
    private readonly router = inject(Router);
    private categoryService = inject(CategoryService);
    private feedbackModalService = inject(FeedbackModalService);
    readonly featuredArticles$ = inject(ArticleService).published$.pipe(
        map(result => (result.kind === 'ready' ? orderedFeaturedArticles(result.articles) : [])),
    );
    categories$ = this.categoryService.getCategoriesList().pipe(map(categories => categories.slice(0, 4)));
    catalogLink(link: string): UrlTree | null {
        return /^\/products(?:[?#]|$)/.test(link) ? this.router.parseUrl(link) : null;
    }

    openConsultation(): void {
        this.feedbackModalService.openFeedbackModal();
    }
}
