import { NgModule } from '@angular/core';
import {
    arrowCounterclockwise,
    chevronLeft,
    chevronRight,
    instagram,
    NgxBootstrapIconsModule,
    pencil,
    telegram,
    trash,
    trash2,
    checkCircleFill
} from 'ngx-bootstrap-icons';

const icons = {
    pencil,
    trash,
    trash2,
    instagram,
    telegram,
    arrowCounterclockwise,
    chevronLeft,
    chevronRight,
    checkCircleFill
};

@NgModule({
    imports: [NgxBootstrapIconsModule.pick(icons)],
    exports: [NgxBootstrapIconsModule],
})
export class IconsModule {}
