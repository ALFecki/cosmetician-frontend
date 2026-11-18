import { DiscountType, PromotionModel } from '../models/promotion.model';
import { calculatePromotionSavingCents, getVariantLineTotal, getVariantPriceInfo } from './promotion.utils';

describe('automatic promotion prices', () => {
    const legacyPromotion = {
        id: 'legacy',
        discountType: DiscountType.PERCENTAGE,
        discountValue: 10,
        priority: 100,
        validFrom: new Date('2000-01-01'),
        validUntil: new Date('2999-01-01'),
        isActive: true,
    } as PromotionModel;

    it('uses legacy priority when no variant pricing is provided', () => {
        const lowerPriority = { ...legacyPromotion, discountValue: 50, priority: 1 };
        const price = getVariantPriceInfo({ price: 10 }, [lowerPriority, legacyPromotion]);
        expect(price.discountedPrice).toBe(9);
        expect(price.discountLabel).toBe('-10%');
    });

    it('uses quoted unit cents for a free item and the matching promotion label', () => {
        const winner = { ...legacyPromotion, id: 'winner' };
        const variant = { price: 0.11, promotionPrice: { finalCents: 0, savingCents: 11, promotionId: winner.id } };
        expect(getVariantPriceInfo(variant, [legacyPromotion, winner])).toEqual({
            originalPrice: 0.11,
            discountedPrice: 0,
            hasDiscount: true,
            discountAmount: 0.11,
            discountLabel: '-100%',
            activePromotion: winner,
        });
        expect(getVariantLineTotal(variant, 3, [legacyPromotion])).toBe(0);
    });

    it('multiplies cents before converting the row total to BYN', () => {
        const variant = { price: 0.2, promotionPrice: { finalCents: 10, savingCents: 10, promotionId: 'winner' } };
        expect(getVariantLineTotal(variant, 3)).toBe(0.3);
    });

    for (const [baseCents, type, value, expected] of [
        [10, DiscountType.PERCENTAGE, 25, 3],
        [10000, DiscountType.PERCENTAGE, 12.345, 1235],
        [500, DiscountType.FIXED, 2.55, 255],
        [99, DiscountType.FIXED, 1.5, 99],
        [25, DiscountType.PERCENTAGE, 120, 25],
        [300, DiscountType.FIXED, 0, 0],
    ] as const) {
        it(`quotes ${value} ${type} on ${baseCents} cents as a saving of ${expected} cents`, () => {
            expect(calculatePromotionSavingCents(baseCents, type, value)).toBe(expected);
        });
    }
});
