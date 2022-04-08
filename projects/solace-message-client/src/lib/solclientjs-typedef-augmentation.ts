import * as solace from 'solclientjs';

/**
 * Patches 'solclientjs' typedef definition via module augmentation.
 *
 * typedef(solclientjs): remove when fixed typedef mismatches in 'solclientjs'
 *
 * Refer to [issue/37](https://github.com/solacecommunity/angular-solace-message-client/issues/37#issuecomment-1094693407) for more information about the `typedef(solclientjs)` comment.
 */
declare module 'solclientjs' {

  export interface SDTMapContainer {
    // typedef(solclientjs): remove when added method `addField` to `SDTMapContainer`
    addField(key: string, type: solace.SDTFieldType, value: any): void;
  }

  export interface Session {
    // typedef(solclientjs): remove when changed `correlationKey` to optional and accept a 'string' value, and changed `requestTimeout` to optional
    subscribe(topic: solace.Destination, requestConfirmation: boolean, correlationKey: object | string | undefined, requestTimeout: number | undefined): void;

    // typedef(solclientjs): remove when changed `correlationKey` to optional and accept a 'string' value, and changed `requestTimeout` to optional
    unsubscribe(topic: solace.Destination, requestConfirmation: boolean, correlationKey: object | string | undefined, requestTimeout: number | undefined): void;
  }

  export interface Message {
    // typedef(solclientjs): remove when changed `getBinaryAttachment` to return 'Uint8Array | string | null'
    getBinaryAttachment(): Uint8Array | string | null;

    // typedef(solclientjs): remove when changed `setBinaryAttachment` to accept following types: 'ArrayBufferLike | DataView | string'
    // @see 'solclient-full.js' method 'anythingToBuffer' that 'solclientjs' already supports those data types
    setBinaryAttachment(value: ArrayBufferLike | DataView | string): void;

    // typedef(solclientjs): remove when changed `setCorrelationKey` to accept following types: 'string | object | undefined | null'
    setCorrelationKey(value: string | object | undefined | null): void;

    // typedef(solclientjs): remove when changed `setCorrelationId` to accept following types: 'string | undefined | null'
    setCorrelationId(value: string | undefined | null): void;

    // typedef(solclientjs): remove when changed `getDestination` to not return 'null'
    getDestination(): solace.Destination;

    // typedef(solclientjs): remove when changed `getPriority` to always return a number
    getPriority(): number;
  }
}
