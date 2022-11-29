import {Component} from '@angular/core';
import {Arrays} from '@scion/toolkit/util';

@Component({
  selector: 'app-subscribers',
  templateUrl: './subscribers.component.html',
  styleUrls: ['./subscribers.component.scss'],
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
