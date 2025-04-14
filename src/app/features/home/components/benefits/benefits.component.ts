import { Component } from '@angular/core';

@Component({
    selector: 'app-benefits',
    templateUrl: './benefits.component.html',
    styleUrl: './benefits.component.scss',
})
export class BenefitsComponent {
    benefits = [
        {
            title: 'Широкий ассортимент',
            description: 'Выбор из множества брендов и продуктов, доступных в любое время.',
            icon: 'assets/icons/variety.png',
        },
        {
            title: 'Удобство покупок',
            description: 'Покупайте из дома, не тратя время на поездки в магазины.',
            icon: 'assets/icons/convenience.png',
        },
        {
            title: 'Специальные предложения',
            description: 'Получайте доступ к эксклюзивным скидкам и акциям.',
            icon: 'assets/icons/special-offers.png',
        },
    ];
}
