import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { IconsModule } from '../../shared/base/icons/icons.module';

type IconName =
    | 'telephone-fill'
    | 'envelope-fill'
    | 'geo-alt-fill'
    | 'chat-dots-fill'
    | 'person-check-fill'
    | 'truck'
    | 'shield-check'
    | 'heart-fill'
    | 'clock-fill'
    | 'star-fill'
    | 'question-circle-fill'
    | 'share-fill'
    | 'instagram'
    | 'telegram'
    | 'facebook'
    | 'whatsapp'
    | 'person-circle'
    | 'clock';

@Component({
    selector: 'app-contacts',
    imports: [CommonModule, IconsModule],
    templateUrl: './contacts.component.html',
    styleUrl: './contacts.component.scss',
})
export class ContactsComponent {
    contacts: {
        icon: IconName;
        title: string;
        value: string;
        subtitle: string;
        link: string;
    }[] = [
        {
            icon: 'telephone-fill',
            title: 'Телефон',
            value: '+375 (29) 598-77-52',
            subtitle: 'Пн-Пт: 9:00-19:00',
            link: 'tel:+375295987752',
        },
        {
            icon: 'envelope-fill',
            title: 'Email',
            value: 'skviderm@gmail.com',
            subtitle: 'Ответим в течение 2 часов',
            link: 'mailto:skviderm@gmail.com',
        },
        {
            icon: 'geo-alt-fill',
            title: 'Адрес',
            value: 'г. Минск, ул. Примерная, 123',
            subtitle: 'Самовывоз по предварительной записи',
            link: 'https://maps.google.com/?q=Минск',
        },
        // {
        //     icon: 'chat-dots-fill',
        //     title: 'Telegram',
        //     value: '@skviderm_bot',
        //     subtitle: 'Быстрые ответы в мессенджере',
        //     link: 'https://t.me/skviderm_bot',
        // },
        {
            icon: 'clock',
            title: 'Запись к косметологу',
            value: 'Записаться',
            subtitle: 'Попасть к Виктории за пару кликов',
            link: 'https://apnt.app/skvorcova_viktoriya3?fbclid=PAQ0xDSwKli-VleHRuA2FlbQIxMAABp6AV960erBxS8DMQpTuLAE_1JXXrza9KJW4KG3BwtMLX3rG2oVmGlWWGIyTH_aem_txkMk0eQ6Zj09wPmjRtNxg',
        },
    ];

    socialLinks: {
        icon: IconName;
        name: string;
        url: string;
        color: string;
    }[] = [
        {
            icon: 'instagram',
            name: 'Instagram',
            url: 'https://instagram.com/skviderm',
            color: '#E4405F',
        },
        {
            icon: 'telegram',
            name: 'Telegram',
            url: 'https://t.me/skviderm',
            color: '#0088cc',
        },
        {
            icon: 'facebook',
            name: 'Facebook',
            url: 'https://facebook.com/skviderm',
            color: '#1877F2',
        },
        {
            icon: 'whatsapp',
            name: 'WhatsApp',
            url: 'https://wa.me/375295987752',
            color: '#25D366',
        },
    ];

    workingHours = [
        { day: 'Понедельник', hours: '9:00 - 19:00' },
        { day: 'Вторник', hours: '9:00 - 19:00' },
        { day: 'Среда', hours: '9:00 - 19:00' },
        { day: 'Четверг', hours: '9:00 - 19:00' },
        { day: 'Пятница', hours: '9:00 - 19:00' },
        { day: 'Суббота', hours: '10:00 - 18:00' },
        { day: 'Воскресенье', hours: 'Выходной' },
    ];

    services: {
        icon: IconName;
        title: string;
        description: string;
    }[] = [
        {
            icon: 'person-check-fill',
            title: 'Персональные консультации',
            description: 'Индивидуальный подбор косметики с учетом ваших потребностей',
        },
        {
            icon: 'truck',
            title: 'Доставка',
            description: 'Быстрая доставка по Минску и всей Беларуси',
        },
        {
            icon: 'shield-check',
            title: 'Гарантия качества',
            description: 'Только оригинальная продукция с гарантией',
        },
        {
            icon: 'heart-fill',
            title: 'Индивидуальный подход',
            description: 'Заботимся о каждом клиенте как о близком человеке',
        },
    ];
}
