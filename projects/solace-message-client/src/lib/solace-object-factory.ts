import { Destination, Message, SDTField, SDTFieldType, SDTMapContainer, SDTStreamContainer } from './solace.model';
import * as solace from 'solclientjs/lib-browser/solclient-full';

/**
 * Facilitates the creation of objects of the Solace namespace.
 */
export namespace SolaceObjectFactory {

  /**
   * Create a new SDTField instance representing a value of a given Type.
   *
   * SDTs are structured, language-independent, and architecture-independent data types.
   * SDTs can be used in messages to facilitate the exchange of binary data in a heterogeneous network
   * that has clients that use different hardware architectures and programming languages.
   */
  export function createSDTField(type: SDTFieldType, value: any): SDTField {
    return solace.SDTField.create(type, value);
  }

  /**
   * Creates a Structured Data Type (SDT) map container. A map is a collection of {@link SDTField}s.
   */
  export function createSDTMapContainer(): SDTMapContainer {
    return new solace.SDTMapContainer();
  }

  /**
   * Creates a Structured Data Type (SDT) stream container. A stream is an iterable collection of {@link SDTField}s.
   */
  export function createSDTStreamContainer(): SDTStreamContainer {
    return new solace.SDTStreamContainer();
  }

  /**
   * Creates a {@link Message} instance.
   *
   * A message is a container that can be used to store and send messages to and from the Solace Message Router.
   */
  export function createMessage(): Message {
    return solace.SolclientFactory.createMessage();
  }

  /**
   * Creates a topic {@link Destination} instance. When the returned Destination is set as
   * the destination of a message via {@link Message#setDestination}, the message will be
   * delivered to direct subscribers or topic endpoints subscribed to the given topic.
   */
  export function createTopicDestination(topicName: string): Destination {
    return solace.SolclientFactory.createTopicDestination(topicName);
  }

  /**
   * Creates a durable queue {@link Destination} instance. When the returned Destination is
   * set as the destination of a message via {@link Message#setDestination}, the message will
   * be delivered to the Guaranteed Message queue on the Solace Message Router of the same name.
   */
  export function createDurableQueueDestination(queueName: string): Destination {
    return solace.SolclientFactory.createDurableQueueDestination(queueName);
  }
}
