import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { DiscountType, PromotionModel } from '../../models/promotion.model';

@Component({
    selector: 'app-promotion-badge',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './promotion-badge.component.html',
    styleUrl: './promotion-badge.component.scss',
})
export class PromotionBadgeComponent {
    @Input() promotions: PromotionModel[] = [];
    @Input() variant: 'compact' | 'full' = 'compact';

    getDiscountText(promotion: PromotionModel): string {
        if (promotion.discountType === DiscountType.PERCENTAGE) {
            return `-${promotion.discountValue}%`;
        }
        return `-${promotion.discountValue} р.`;
    }

    getPromotionDescription(promotion: PromotionModel): string {
        if (promotion.buyQuantity && promotion.getQuantity) {
            return `${promotion.buyQuantity}+${promotion.getQuantity}`;
        }
        if (promotion.minQuantity) {
            return `От ${promotion.minQuantity} шт.`;
        }
        return this.getDiscountText(promotion);
    }

    getBadgeClass(promotion: PromotionModel): string {
        if (promotion.buyQuantity && promotion.getQuantity) {
            return 'badge-gift';
        }
        if (promotion.discountType === DiscountType.PERCENTAGE) {
            return 'badge-percentage';
        }
        return 'badge-fixed';
    }
}
