// icons.module.ts
import { NgModule } from '@angular/core';
import { instagram, NgxBootstrapIconsModule, pencil, telegram, trash } from 'ngx-bootstrap-icons';

const icons = {
  pencil,
  trash,
  instagram,
  telegram
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