import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PrivacyPolicyComponent } from './privacy-policy.component';

describe('Server-rendered information pages', () => {
    beforeEach(() => TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] }));
    it('does not access browser scroll on the server', () => {
        const scroll = spyOn(window, 'scrollTo');
        TestBed.runInInjectionContext(() => new PrivacyPolicyComponent()).ngOnInit();
        expect(scroll).not.toHaveBeenCalled();
    });
});
