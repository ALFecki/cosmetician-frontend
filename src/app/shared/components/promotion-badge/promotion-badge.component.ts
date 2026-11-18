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
    @Input() basePrice?: number;
    @Input() discountLabel?: string;

    getDiscountText(promotion: PromotionModel): string {
        if (this.discountLabel !== undefined) return this.discountLabel;
        if (promotion.discountValue == 0) {
            return '';
        }
        if (promotion.discountType === DiscountType.PERCENTAGE) {
            return `-${promotion.discountValue}%`;
        }
        // For fixed discount, calculate percentage equivalent if basePrice is provided
        if (this.basePrice && this.basePrice > 0) {
            const percentageEquivalent = Math.round((promotion.discountValue / this.basePrice) * 100);
            return `-${percentageEquivalent}%`;
        }
        return `-${promotion.discountValue} р.`;
    }

    getPromotionDescription(promotion: PromotionModel): string {
        if (this.discountLabel === undefined && promotion.buyQuantity && promotion.getQuantity) {
            return `${promotion.buyQuantity}+${promotion.getQuantity}`;
        }
        if (this.discountLabel === undefined && promotion.minQuantity) {
            return `От ${promotion.minQuantity} шт.`;
        }
        return this.getDiscountText(promotion);
    }

    getBadgeClass(promotion: PromotionModel): string {
        if (this.discountLabel === undefined && promotion.buyQuantity && promotion.getQuantity) {
            return 'badge-gift';
        }
        if (promotion.discountType === DiscountType.PERCENTAGE) {
            return 'badge-percentage';
        }
        return 'badge-fixed';
    }
}
