import { ProductVariantModel } from '../models/product.model';
import { DiscountType, PromotionModel } from '../models/promotion.model';

/**
 * Interface for price calculation result
 */
export interface PriceInfo {
    originalPrice: number;
    discountedPrice: number | null;
    hasDiscount: boolean;
    activePromotion: PromotionModel | null;
    discountAmount: number;
    discountLabel: string;
}

export function calculatePromotionSavingCents(baseCents: number, discountType: DiscountType, discountValue: number): number {
    if (baseCents <= 0 || !Number.isFinite(discountValue) || discountValue <= 0) return 0;
    const scaledValue = Math.round(discountValue * 100);
    const savingCents = discountType === DiscountType.PERCENTAGE ? Math.round((baseCents * scaledValue) / 10000) : scaledValue;
    return Math.min(baseCents, savingCents);
}

export function getVariantPriceInfo(
    variant: Pick<ProductVariantModel, 'price' | 'promotionPrice'> | null | undefined,
    promotions?: PromotionModel[] | null,
): PriceInfo {
    if (!variant?.promotionPrice) return calculateDiscountedPrice(variant?.price || 0, promotions);

    const { finalCents, savingCents, promotionId } = variant.promotionPrice;
    const originalCents = finalCents + savingCents;
    const hasDiscount = savingCents > 0;
    const discountAmount = savingCents / 100;
    const percentageHundredths = hasDiscount
        ? Math.min(finalCents > 0 ? 9999 : 10000, Math.round((savingCents * 10000) / originalCents))
        : 0;
    const percentage = (percentageHundredths / 100).toLocaleString('ru-BY', { maximumFractionDigits: 2 });
    return {
        originalPrice: originalCents / 100,
        discountedPrice: hasDiscount ? finalCents / 100 : null,
        hasDiscount,
        activePromotion: hasDiscount ? (promotions?.find(promotion => promotion.id === promotionId) ?? null) : null,
        discountAmount,
        discountLabel: hasDiscount ? (percentageHundredths ? `-${percentage}%` : `-${discountAmount.toFixed(2)} р.`) : '',
    };
}

export function getVariantLineTotal(
    variant: Pick<ProductVariantModel, 'price' | 'promotionPrice'>,
    quantity: number,
    promotions?: PromotionModel[] | null,
): number {
    if (variant.promotionPrice) return (variant.promotionPrice.finalCents * quantity) / 100;

    const price = getVariantPriceInfo(variant, promotions);
    return (price.hasDiscount ? price.discountedPrice! : price.originalPrice) * quantity;
}

/**
 * Calculate discounted price based on active promotions
 * @param originalPrice Original product price
 * @param promotions Array of active promotions for the product
 * @returns PriceInfo object with original, discounted price and promotion info
 */
export function calculateDiscountedPrice(originalPrice: number, promotions: PromotionModel[] | null | undefined): PriceInfo {
    if (!promotions || promotions.length === 0) {
        return {
            originalPrice,
            discountedPrice: null,
            hasDiscount: false,
            activePromotion: null,
            discountAmount: 0,
            discountLabel: '',
        };
    }

    // Filter active promotions and sort by priority (higher priority first)
    const activePromotions = promotions
        .filter(p => {
            const now = new Date();
            const validFrom = new Date(p.validFrom);
            const validUntil = new Date(p.validUntil);
            return p.isActive && now >= validFrom && now <= validUntil;
        })
        .sort((a, b) => b.priority - a.priority);

    if (activePromotions.length === 0) {
        return {
            originalPrice,
            discountedPrice: null,
            hasDiscount: false,
            activePromotion: null,
            discountAmount: 0,
            discountLabel: '',
        };
    }

    // Use the highest priority promotion
    const promotion = activePromotions[0];
    let discountedPrice = originalPrice;
    let discountAmount = 0;
    let discountLabel = '';

    if (promotion.discountType === DiscountType.PERCENTAGE) {
        // Calculate percentage discount
        discountAmount = originalPrice * (promotion.discountValue / 100);
        discountedPrice = originalPrice - discountAmount;
        discountLabel = `-${promotion.discountValue}%`;
    } else if (promotion.discountType === DiscountType.FIXED) {
        // Apply fixed discount
        discountAmount = promotion.discountValue;
        discountedPrice = originalPrice - discountAmount;
        // Calculate the nearest whole percentage for display
        const percentageEquivalent = Math.round((discountAmount / originalPrice) * 100);
        discountLabel = `-${percentageEquivalent}%`;
    }

    // Ensure price doesn't go below 0
    discountedPrice = Math.max(0, discountedPrice);
    discountAmount = Math.min(discountAmount, originalPrice);

    return {
        originalPrice,
        discountedPrice: Number(discountedPrice.toFixed(2)),
        hasDiscount: discountedPrice < originalPrice,
        activePromotion: promotion,
        discountAmount: Number(discountAmount.toFixed(2)),
        discountLabel,
    };
}
