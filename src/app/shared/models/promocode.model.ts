import { DiscountType } from './promotion.model';

export interface PromocodeModel {
    id: string;
    code: string;
    discountType: DiscountType;
    discountValue: number;
    minOrderAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usageCount: number;
    validFrom: Date;
    validUntil: Date;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
