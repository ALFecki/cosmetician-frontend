import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Observable, of } from 'rxjs';
import { ProductModel } from '../../models/product.model';
import { ProductService } from '../../services/product.service';
import { CommonModule } from '@angular/common';
import { OrderService } from '../../services/order.service';

@Component({
    selector: 'app-products',
    providers: [],
    standalone: true,
    imports: [CommonModule],
    templateUrl: './products.component.html',
    styleUrl: './products.component.scss',
})
export class ProductsComponent implements OnInit {
    products$!: Observable<ProductModel[]>;
    @Input() categoryId: string | undefined;
    @Input() brandId: string | undefined;
    selectedProduct: ProductModel | null = null;

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private productService: ProductService,
        private orderService: OrderService,
        private modalService: NgbModal,
    ) {}

    ngOnInit(): void {
        this.productService.getByFilterSchema({ categoryId: this.categoryId, brandId: this.brandId }).subscribe(data => {
            this.products$ = of(this.productService.transformList(data).data);
        });
    }

    openProductDetails(product: ProductModel, content: unknown) {
        this.selectedProduct = product;
        this.modalService.open(content, {
            size: 'lg',
            centered: true,
            scrollable: true,
        });
    }

    moreInfo() {
        this.modalService.dismissAll();
        this.router.navigate(['/product', this.selectedProduct?.id]);
    }

    addToCart(product: ProductModel | null) {
        if (product) {
            console.log('Добавление в корзину:', product);
            this.orderService.addProductToOrder(product.id).subscribe(order => {
                if (order) {
                    console.log('Текущий заказ:', order);
                } else {
                    console.error('Ошибка при добавлении товара в корзину');
                }
            });
        }
    }
}
