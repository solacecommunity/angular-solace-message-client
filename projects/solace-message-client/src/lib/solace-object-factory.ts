// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import * as solace from 'solclientjs/lib-browser/solclient';
import {Destination, Message, ReplayStartLocation, SDTField, SDTFieldType, SDTMapContainer, SDTStreamContainer, Session, SessionProperties} from './solace.model';

/**
 * Facilitates the creation of objects of the Solace namespace.
 */
export namespace SolaceObjectFactory {

  /**
   * Creates a session properties object from given properties.
   */
  export function createSessionProperties(sessionProperties: Partial<SessionProperties>): SessionProperties {
    return new solace.SessionProperties(sessionProperties);
  }

  /**
   * Creates a session instance.
   *
   * @throws {OperationError} if the parameters have an invalid type or value.
   *         Subcode: {@link ErrorSubcode.PARAMETER_INVALID_TYPE}.
   */
  export function createSession(sessionProperties: SessionProperties): Session {
    return solace.SolclientFactory.createSession(sessionProperties);
  }

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

  /**
   * Creates a {@link ReplayStartLocation} instance that when set in {@link MessageConsumerProperties}
   * indicates that all messages available in the replay log should be retrieved.
   */
  export function createReplayStartLocationBeginning(queueName: string): ReplayStartLocation {
    return solace.SolclientFactory.createReplayStartLocationBeginning(queueName);
  }

  /**
   * Creates a {@link ReplayStartLocation} instance that when set in {@link MessageConsumerProperties}
   * indicates that only messages spooled in the replay log since the given Date should be retrieved.
   *
   * @param dateTime The Date object representing the date and time of the replay start location;
   *                 is always converted to UTC time if not already a UTC time.
   */
  export function createReplayStartLocationDate(dateTime: Date): ReplayStartLocation {
    return solace.SolclientFactory.createReplayStartLocationDate(dateTime);
  }
}

