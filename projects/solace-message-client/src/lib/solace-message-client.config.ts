import {MessagePublisherProperties, SessionProperties} from 'solclientjs';

// Merge class and interface declarations so that it can be used as DI token as well as object literal to configure the library.
// See https://www.typescriptlang.org/docs/handbook/declaration-merging.html for more information.

/**
 * Configures the {@link SolaceMessageClient} to connect to the Solace message broker.
 */
export abstract class SolaceMessageClientConfig implements Omit<SessionProperties, 'publisherProperties'> {
  // typedef(solclientjs): remove 'publisherProperties' and 'Omit' when changed 'publisherProperties' to optional
  public publisherProperties?: MessagePublisherProperties;
}

/**
 * Configures the {@link SolaceMessageClient} to connect to the Solace message broker.
 */
export interface SolaceMessageClientConfig extends Omit<SessionProperties, 'publisherProperties'> {
  // typedef(solclientjs): remove 'publisherProperties' and 'Omit' when changed 'publisherProperties' to optional
  publisherProperties?: MessagePublisherProperties;
}
