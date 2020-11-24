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

### Contributing
We encourage other developers to join the project and contribute to making this library constantly better and more stable. If you are missing a feature, please create a feature request so we can discuss it and coordinate further development. To report a bug, please check existing issues first, and if found, leave a comment on the issue. Otherwise, file a bug or create a pull request with a proposed fix.

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
