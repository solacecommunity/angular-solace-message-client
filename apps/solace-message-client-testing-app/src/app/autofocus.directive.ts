import {Directive, ElementRef} from '@angular/core';
import {asyncScheduler} from 'rxjs';

/**
 * Use this directive to set the focus to the host element.
 */
@Directive({
  selector: '[appAutoFocus]',
})
export class AutofocusDirective {

  constructor(private _host: ElementRef<HTMLElement>) {
    asyncScheduler.schedule(() => this._host.nativeElement.focus());
  }
}
