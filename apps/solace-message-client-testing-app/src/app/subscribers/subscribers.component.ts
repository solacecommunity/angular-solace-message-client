import {Component} from '@angular/core';
import {Arrays} from '@scion/toolkit/util';
import {MatCard, MatCardContent, MatCardHeader} from '@angular/material/card';
import {MatDivider} from '@angular/material/divider';
import {MatIcon} from '@angular/material/icon';
import {MatTab, MatTabGroup, MatTabLabel} from '@angular/material/tabs';
import {SciViewportComponent} from '@scion/components/viewport';
import {SubscriberComponent} from '../subscriber/subscriber.component';
import {MatFabButton, MatIconButton} from '@angular/material/button';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-subscribers',
  templateUrl: './subscribers.component.html',
  styleUrls: ['./subscribers.component.scss'],
  imports: [
    SciViewportComponent,
    SubscriberComponent,
    MatCardContent,
    MatTabGroup,
    MatTab,
    MatIcon,
    MatCard,
    MatCardHeader,
    MatDivider,
    MatTabLabel,
    MatIconButton,
    MatFabButton,
    MatTooltip,
  ],
})
export class SubscribersComponent {

  public subscriptions: Subscription[] = [];
  public selectedTabIndex: number | undefined;

  public onSubscriptionAdd(): void {
    const defaultNameCount = this.subscriptions.filter(subscriber => subscriber.name.startsWith('Subscription')).length;
    const subscriptionName = defaultNameCount === 0 ? 'Subscription' : `Subscription (${defaultNameCount + 1})`;
    this.subscriptions.push({name: subscriptionName});
    this.selectedTabIndex = this.subscriptions.length - 1;
  }

  public onSubscriptionDelete(subscription: Subscription): void {
    this.deleteSubscription(subscription);
  }

  public onSubscriptionNameChange(name: string, subscription: Subscription): void {
    subscription.name = name;
  }

  public onTabMouseDown(event: MouseEvent, subscription: Subscription): void {
    if (event.button === 1) {
      this.deleteSubscription(subscription);
      event.preventDefault();
    }
  }

  private deleteSubscription(subscription: Subscription): void {
    Arrays.remove(this.subscriptions, subscription);
  }
}

export interface Subscription {
  name: string;
}
