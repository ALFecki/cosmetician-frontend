import { Component } from '@angular/core';
import { IconsModule } from '../../../../shared/base/icons/icons.module';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-about-me',
    templateUrl: './about-me.component.html',
    styleUrl: './about-me.component.scss',
    imports: [CommonModule, RouterModule, IconsModule],
})
export class AboutMeComponent {
    ownerInfo = {
        name: 'Виктория Скворцова',
        title: 'врач, кандидат медицинских наук, практикующий косметолог',
        mainPhoto: 'assets/images/owner/portrait1.jpg',
        secondaryPhoto: 'assets/images/owner/in_work.jpeg',
    };

    values = [
        {
            icon: 'shield-check',
            title: 'Безопасность',
            description: 'Только проверенные и сертифицированные средства',
        },
        {
            icon: 'graph-up-arrow',
            title: 'Эффективность',
            description: 'Результат, который можно увидеть и почувствовать',
        },
        {
            icon: 'person-heart',
            title: 'Индивидуальный подход',
            description: 'Подбор косметики именно для ваших потребностей',
        },
    ];
}
