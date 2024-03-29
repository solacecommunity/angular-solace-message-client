import {BrowserModule} from '@angular/platform-browser';
import {NgModule} from '@angular/core';

import {AppRoutingModule} from './app-routing.module';
import {AppComponent} from './app.component';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SolaceMessageClientModule} from '@solace-community/angular-solace-message-client';
import {SciSashboxModule} from '@scion/components/sashbox';
import {PublisherComponent} from './publisher/publisher.component';
import {SubscriberComponent} from './subscriber/subscriber.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {LoginComponent} from './login/login.component';
import {TryMeComponent} from './try-me/try-me.component';
import {ClipboardModule} from '@angular/cdk/clipboard';
import {MatButtonModule} from '@angular/material/button';
import {MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule} from '@angular/material/form-field';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {SciViewportModule} from '@scion/components/viewport';
import {MatSnackBarModule} from '@angular/material/snack-bar';
import {MatCardModule} from '@angular/material/card';
import {CommonModule} from '@angular/common';
import {SessionPropertiesComponent} from './session-properties/session-properties.component';
import {StringifyMapPipe} from './stringify-map.pipe';
import {MessageListItemComponent} from './message-list-item/message-list-item.component';
import {MatTabsModule} from '@angular/material/tabs';
import {SubscribersComponent} from './subscribers/subscribers.component';
import {MatDividerModule} from '@angular/material/divider';
import {MatTooltipModule} from '@angular/material/tooltip';
import {AutofocusDirective} from './autofocus.directive';
import {SessionConfigStore} from './session-config-store';
import {EnterAccessTokenComponent} from './enter-access-token/enter-access-token.component';
import {MatDialogModule} from '@angular/material/dialog';
import {A11yModule} from '@angular/cdk/a11y';

@NgModule({
  declarations: [
    AppComponent,
    PublisherComponent,
    SubscriberComponent,
    SubscribersComponent,
    LoginComponent,
    MessageListItemComponent,
    TryMeComponent,
    SessionPropertiesComponent,
    StringifyMapPipe,
    AutofocusDirective,
    EnterAccessTokenComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    SolaceMessageClientModule.forRoot(SessionConfigStore.load()),
    ClipboardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatCardModule,
    SciViewportModule,
    SciSashboxModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    A11yModule,
  ],
  providers: [
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {floatLabel: 'always', appearance: 'outline'}},
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
