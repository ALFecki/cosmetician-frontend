import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import { environment } from './environments/environment';
import { enableProdMode } from '@angular/core';

if (environment.production) {
    enableProdMode();
}
const bootstrap = () => {
    return bootstrapApplication(AppComponent, config).then(appRef => {
        return appRef;
    });
};

export default bootstrap;
