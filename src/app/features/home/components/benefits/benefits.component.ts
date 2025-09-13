import { Component } from '@angular/core';

@Component({
    selector: 'app-benefits',
    templateUrl: './benefits.component.html',
    styleUrl: './benefits.component.scss',
})
export class BenefitsComponent {
    benefits = [
        {
            title: 'Проефссиональный подбор косметики',
            description: 'Консультация врача, кандидата медицинских наук, практикующего косметолога Виктории Скворцовой.',
            icon: 'assets/icons/variety.png',
        },
        {
            title: 'Удобство покупок',
            description: 'Дружелюбный интерфейс, широкий ассортимент, оперативная доставка.',
            icon: 'assets/icons/convenience.png',
        },
        {
            title: 'Индивидуальные скидки',
            description: 'Специальные предложения именно для Вас. Эксклюзивные наборы.',
            icon: 'assets/icons/special-offers.png',
        },
    ];
}
