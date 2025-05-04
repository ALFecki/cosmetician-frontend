// icons.module.ts
import { NgModule } from '@angular/core';
import { arrowCounterclockwise, instagram, NgxBootstrapIconsModule, pencil, telegram, trash, trash2 } from 'ngx-bootstrap-icons';

const icons = {
  pencil,
  trash,
  trash2,
  instagram,
  telegram,
  arrowCounterclockwise
};

@NgModule({
  imports: [
    NgxBootstrapIconsModule.pick(icons)
  ],
  exports: [
    NgxBootstrapIconsModule
  ]
})
export class IconsModule { }