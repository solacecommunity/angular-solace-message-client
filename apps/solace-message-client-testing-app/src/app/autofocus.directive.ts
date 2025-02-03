import {Directive, ElementRef, inject} from '@angular/core';
import {asyncScheduler} from 'rxjs';

/**
 * Use this directive to set the focus to the host element.
 */
@Directive({selector: '[appAutoFocus]'})
export class AutofocusDirective {

  constructor() {
    const host = inject(ElementRef).nativeElement as HTMLElement;
    asyncScheduler.schedule(() => host.focus());
  }
}
