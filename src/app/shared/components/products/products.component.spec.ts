import { ProductsComponent } from './products.component';
import { ProductModel } from '../../models/product.model';

describe('Catalog quick view', () => {
    it('opens the quick view with the customer selected variant id', () => {
        const modal = { componentInstance: {} as Record<string, unknown> };
        const component = new ProductsComponent(
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            { dismissAll() {}, open: () => modal } as never,
            {} as never,
            {} as never,
        );
        const product = {
            id: 'care',
            variants: [
                { id: 'small', price: 10, volume: 10 },
                { id: 'large', price: 20, volume: 20 },
            ],
        } as ProductModel;
        spyOnProperty(window, 'innerWidth').and.returnValue(1200);
        component.selectVariant(product, 'large');
        component.openProductDetails(product);
        expect(modal.componentInstance['selectedVariantId']).toBe('large');
    });
});
