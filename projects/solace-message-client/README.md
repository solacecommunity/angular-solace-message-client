# Solace Message Client

Provides a message client to communicate with a Solace messaging broker for sending and receiving messages using the native SMF protocol (Solace Message Format) over web socket. The library is designed to be used in Angular applications.

See https://docs.solace.com/API-Developer-Online-Ref-Documentation/js/index.html for more information about the Solace Web API.

### USAGE
This section explains how to use this library.

#### Installation from NPM
`npm install solace-message-client solclientjs @scion/toolkit --save`

This library requires some peer dependencies to be installed. By using the above commands, those are installed as well.

#### Import Solace Message Client module in your app module

```
@NgModule({
  imports: [
    ...
    SolaceMessageClientModule.forRoot({
      url:      'wss://xxx.messaging.solace.cloud:443',
      vpnName:  'xxx',
      userName: 'xxx',
      password: 'xxx',
    });
  ],
  ...
})
export class AppModule { }
```

#### Receiving messages sent to a topic:

```
public class TemperatureReceiver {

  constructor(solaceMessageClient: SolaceMessageClient) {
    solaceMessageClient.observe$('myhome/livingroom/temperature').subscribe(envelope => {

    });
  }
}
```

#### Publishing a message to a topic:
```
@Injectable()
public class TemperaturePublisher {

 constructor(private solaceMessageClient: SolaceMessageClient) {
 }

  public publish(temperature: number): void {
    this.solaceMessageClient.publish('myhome/kitchen/temperature', '20°C');
  }
}
```

#### Extract topic parts:

```
public class TemperatureReceiver {

  constructor(solaceMessageClient: SolaceMessageClient) {
    solaceMessageClient.observe$('myhome/:room/temperature').subscribe(envelope => {
        // The solace subscription will be "myhome/*/temperature"
        console.log(
          envelope.message,
          envelope.params.room
        );
    });
  }
}
```

### Commands for working on the toolkit.internal library

- `npm run solace-message-client:lint`\
  Lints the `solace-message-client` library.
  
- `npm run solace-message-client:build`\
  Builds the `solace-message-client` library.
  
- `npm run solace-message-client:test`\
  Runs unit tests of the `solace-message-client` library.

### Commands for working on the testing application  
  
- `npm run solace-message-client-testing-app:serve`\
  Serves the testing app on [http://localhost:4200](http://localhost:4200).\
  Uncomment the section `PATH-OVERRIDE-FOR-DEVELOPMENT` in `tsconfig.json` to have hot module reloading support. 
  
- `npm run solace-message-client-testing-app:build`\
  Builds the testing app into `dist` folder using the productive config.
  
- `npm run solace-message-client-testing-app:lint`\
  Lints the testing app.
