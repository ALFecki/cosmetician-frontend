import { Component } from '@angular/core';
import { ImageUrlPipe } from '../../../../shared/utils/image-url.pipe';
import { IconsModule } from '../../../../shared/base/icons/icons.module';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-benefits',
    templateUrl: './benefits.component.html',
    styleUrl: './benefits.component.scss',
    imports: [CommonModule, RouterModule, IconsModule, ImageUrlPipe],
})
export class BenefitsComponent {
    benefits = [
        {
            title: 'Профессиональный подбор косметики',
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
