import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { SolaceMessageClientModule } from 'solace-message-client';
import { SciSashboxModule } from '@scion/toolkit/sashbox';
import { PublisherComponent } from './publisher/publisher.component';
import { SubscriberComponent } from './subscriber/subscriber.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ConnectComponent } from './connect/connect.component';
import { TryMeComponent } from './try-me/try-me.component';
import { SOLACE_CONNECT_PROPERTIES_SESSION_KEY } from './constants';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS, MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SciViewportModule } from '@scion/toolkit/viewport';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { SessionPropertiesComponent } from './session-properties/session-properties.component';

@NgModule({
  declarations: [
    AppComponent,
    PublisherComponent,
    SubscriberComponent,
    ConnectComponent,
    TryMeComponent,
    SessionPropertiesComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    ReactiveFormsModule,
    SolaceMessageClientModule.forRoot(
      JSON.parse(sessionStorage.getItem(SOLACE_CONNECT_PROPERTIES_SESSION_KEY)),
    ),
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
  ],
  providers: [
    {provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: {floatLabel: 'always', appearance: 'outline'}},
  ],
  bootstrap: [AppComponent],
})
export class AppModule {
}
