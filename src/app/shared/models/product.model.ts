import { BrandModel } from './brand.model';
import { CategoryModel } from './category.model';
import { CountryModel } from './country.model';

export interface ProductModel {
    id: string;
    title: string;
    fullTitle: string;
    description: string;
    image: string;
    methodOfUse?: string;
    composition?: string;
    brandId: string;
    brand: BrandModel;

    productScopes: ProductScopeModel[];
    productTypeId: string;
    productType: ProductTypeModel;
    countries: CountryModel[];
    categoryId: string;
    categories: CategoryModel[];

    variants: ProductVariantModel[];

    isPriceHidden: boolean;

    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductVariantModel {
    id: string;
    productId: string;
    volume: number;
    costPrice: number;
    price: number;
    isDefault: boolean;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductTypeModel {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductScopeModel {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}
