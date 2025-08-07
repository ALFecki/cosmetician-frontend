import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import { MaintenanceService } from './app/shared/services/maintenance.service';
import { environment } from './environments/environment.prod';
import { enableProdMode } from '@angular/core';

if (environment.production) {
    enableProdMode();
}
const bootstrap = () => {
    return bootstrapApplication(AppComponent, config).then(appRef => {
        const maintenanceService = appRef.injector.get(MaintenanceService);
        maintenanceService.getMaintenanceStatus().subscribe();
        return appRef;
    });
};

export default bootstrap;
