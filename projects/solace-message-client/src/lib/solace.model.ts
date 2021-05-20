// tslint:disable:no-redundant-jsdoc

/**
 * NOTE: THE SOLACE TYPE DEFINITIONS CONTAINED IN THIS FILE ARE NOT GENERATED BUT DERIVED MANUALLY BASED ON THE API OF SOLCLIENTJS:10.5.1
 */

/**
 * Represents a session properties object.
 *
 * Passed in to solace.SolclientFactory.createSession when creating a solace.Session instance.
 *
 * @see solace.SessionProperties
 * @see https://docs.solace.com/API-Developer-Online-Ref-Documentation/js/index.html
 */
export abstract class SessionProperties {

  /**
   * The authentication scheme used when establishing the session.
   *
   * @default {@link AuthenticationScheme.BASIC}
   */
  public authenticationScheme?: AuthenticationScheme;

  /**
   * The URL or URLs of the messaging service to connect to.  The URL is typically of the form `<protocol>://<host[:port]>`, where:
   *  * `protocol` is one of `ws`, `wss`, `http`, `https`, `tcp` or `tcps`. Note to developers who also use the browser variant of this SDK: Browsers do not support the `tcp` and `tcps` protocols.
   *  * `host` is a hostname or IP address of the router to connect to.
   *  * `port` is the port on which the messaging service is listening. The default is the
   *     well-known port for the service associated with the given protocol, if any.
   *
   * Additionally, note:
   *  * When an Array is provided, each element is expected to be a string of the above format.
   *    The API will attempt to connect to these URLs in the specified order.
   *  * Cross-domain restrictions should be taken into consideration when deploying web
   *    applications with messaging capabilities. See the API User Guide for more information.
   *  * Numerical IPv6 addresses must be enclosed in square brackets, e.g. ws://[2001:db8::1]
   *
   * @default ""
   */
  public url: string | string[];

  /**
   * The password required for authentication.
   *
   * @default ""
   */
  public password?: string;
  /**
   * The client username required for authentication.
   *
   * @default ""
   */
  public userName?: string;

  /**
   * The client name that is used during login as a unique identifier for the session on the Solace Message Router.
   *  * An empty string causes a unique client name to be generated automatically.
   *  * If specified, it must be a valid Topic name, and a maximum of 160 bytes in length.
   *  * This property is also used to uniquely identify the sender in a message's senderId field if {@link solace.SessionProperties.includeSenderId} is set.
   *
   * @default ""
   */
  public clientName?: string;

  /**
   * A string that uniquely describes the application instance.
   * If left blank, the API will generate a description string using the current user-agent string.
   *
   * @default ""
   */
  public applicationDescription?: string;

  /**
   * The Message VPN name that the client is requesting for this session.
   */
  public vpnName: string;

  /**
   * A read-only session property that indicates which Message VPN the session is connected to. When not connected, or when not in client mode, an empty string is returned.
   */
  public vpnNameInUse?: string;

  /**
   * A read-only property that indicates the connected Solace Message Router's virtual router name.
   */
  public virtualRouterName?: string;

  /**
   * The timeout period (in milliseconds) for a connect operation to a given host.
   * If no value is provided, the default is 8000. The valid range is > 0.
   *
   * @default max(8000, 1000 + webTransportProtocolList.length * transportDowngradeTimeoutInMsecs)
   */
  public connectTimeoutInMsecs?: number;

  /**
   * The number of times to retry connecting during initial connection setup.
   *
   * When using a host list, each traversal of the list is considered a try;
   * therefore, if `connectRetries === 2`, the host list will be traversed up to three times: once
   * for the initial try, and twice more for the retries. Each retry begins with the first host
   * listed. After each unsuccessful attempt to connect to a host, the API waits for the amount
   * of time set for {@link SessionProperties.reconnectRetryWaitInMsecs} before attempting
   * another connection. The next connection attempt may be to the same host,
   * see {@link SessionProperties.connectRetriesPerHost}.
   *
   * If an established connection fails, the reconnection is attempted with
   * {@link SessionProperties.reconnectRetries} retries instead.
   *
   *  * The valid range is connectRetries >= -1.
   *  * -1 means try to connect forever.
   *  * 0 means no automatic connection retries; the API will try once and then give up.
   *  * connectRetries >= 1 means reattempt connection n times.
   *
   * @default 20
   */
  public connectRetries?: number;

  /**
   * When using a host list, this property defines how many times to try to connect to a single host before moving to the next host in the list.
   *
   *  * The valid range is connectRetriesPerHost >= -1.
   *  * -1 means attempt an infinite number of connection retries. The API will only
   *    attempt to connect to the first host in the list.
   *  * 0 means make a single connection attempt per host, with no retries.
   *
   * @default 0
   */
  public connectRetriesPerHost?: number;

  /**
   * How much time to wait (in ms) between each attempt to connect to a host.
   *
   * If a connect attempt is not successful, the API waits for the amount of time
   * specified, and then makes another attempt to connect.
   *
   * {@link SessionProperties.connectRetriesPerHost} sets how many connection
   * attempts will be made before moving on to the next host in the list.
   *
   * The valid range is >= 0 and <= 60000.
   * @default 3000
   */
  public reconnectRetryWaitInMsecs?: number;

  /**
   * The number of times to retry connecting after a connected session goes down.
   *
   * When using a host list, each traversal of the list is considered a try; therefore, if
   * `reconnectRetries === 2`, the host list will be traversed up to three times: once
   * for the initial try, and twice more for the retries. Each retry begins with the first host
   * listed. After each unsuccessful attempt to connect to a host, the API waits for the amount
   * of time set for {@link SessionProperties.reconnectRetryWaitInMsecs} before attempting
   * another connection. The next reconnect attempt may be to the same host,
   * see {@link SessionProperties.connectRetriesPerHost}.
   *
   *  * The valid range is reconnectRetries >= -1.
   *  * -1 means try to reconnect forever.
   *  * 0 means no automatic reconnect retries; the API will try once and then give up.
   *  * reconnectRetries >= 1 means reattempt reconnect n times.
   *
   * @default 20
   */
  public reconnectRetries?: number;

  /**
   * When enabled, a send timestamp is automatically included (if not already present) in the Solace-defined fields for each message sent.
   *
   * @default  false
   */
  public generateSendTimestamps?: boolean;

  /**
   * When enabled, a receive timestamp is recorded for each message and passed to the session's message callback receive handler.
   *
   * @default  false
   */
  public generateReceiveTimestamps?: boolean;
  /**
   * When enabled, a sender ID is automatically included (if not already present) in the Solace-defined fields for each message sent.
   *
   * @default  false
   */
  public includeSenderId?: boolean;

  /**
   * When enabled, a sequence number is automatically included (if not already present) in the Solace-defined fields for each message sent.
   *
   * @default  false
   */
  public generateSequenceNumber?: boolean;

  /**
   * The amount of time (in milliseconds) to wait between sending out keep-alive messages to the Solace Message Router.
   * The valid range is > 0.
   *
   * @default  3000
   */
  public keepAliveIntervalInMsecs?: number;

  /**
   * The maximum number of consecutive Keep-Alive messages that can be sent without receiving a response before the session is declared down and the connection is closed by the API.
   * The valid range is >= 3.
   *
   * @default 3
   */
  public keepAliveIntervalsLimit?: number;

  /**
   * A read-only string that indicates the default reply-to destination used for any request messages sent from this session.
   * See {@link solace.Session.sendRequest}.
   *
   * This parameter is only valid when the session is connected.
   *
   * @default ""
   */
  public p2pInboxInUse?: string;

  /**
   * A read-only string providing information about the application, such as the name of operating system that is running the application.
   *
   * @default  ""
   */
  public userIdentification?: string;

  /**
   * Used to ignore duplicate subscription errors on subscribe.
   *
   * @default  true
   */
  public ignoreDuplicateSubscriptionError?: boolean;

  /**
   * Used to ignore subscription not found errors on unsubscribe.
   *
   * @default  true
   */
  public ignoreSubscriptionNotFoundError?: boolean;

  /**
   * Set to 'true' to have the API remember subscriptions and reapply them upon calling {@link solace.Session.connect} on a disconnected session.
   *
   * @default  false
   */
  public reapplySubscriptions?: boolean;

  /**
   * Sets the guaranteed messaging publisher properties for the session.
   * If the supplied value is not a {@link MessagePublisherProperties},
   * one will be constructed using the supplied value as an argument.
   */
  public publisherProperties?: MessagePublisherProperties;
  /**
   * Set to 'true' to signal the Solace Message Router that messages published on the session should not be received on the same session even if the client has a subscription that
   * matches the published topic. If this restriction is requested, and the Solace Message Router does not have No Local support, the session connect will fail.
   *
   * @default  false
   */
  public noLocal?: boolean;

  /**
   * The timeout period (in milliseconds) for a reply to come back from the Solace Message Router. This timeout serves as the default
   * request timeout for {@link solace.Session.subscribe},  {@link solace.Session.unsubscribe}, {@link solace.Session.updateProperty}.
   * The valid range is >= 0.
   *
   * @default 10000
   */
  public readTimeoutInMsecs?: number;

  /**
   * The maximum buffer size for the transport session. This size must be bigger
   * than the largest message an application intends to send on the session.
   *
   * The session buffer size configured using the sendBufferMaxSize
   * session property controls SolClient buffering of transmit messages. When
   * sending small messages, the session buffer size should be set to multiple times
   * the typical message size to improve the performance. Regardless of the buffer
   * size, SolClient always accepts at least one message to transmit. So even if a
   * single message exceeds sendBufferMaxSize, it is accepted and
   * transmitted as long as the current buffered data is zero. However, no more
   * messages are accepted until the amount of data buffered is reduced
   * enough to allow room below sendBufferMaxSize.
   *
   * The valid range is > 0.
   *
   * @default 65536 (64KB)
   */
  public sendBufferMaxSize?: number;

  /**
   * The maximum payload size (in bytes) when sending data using the Web transport
   * protocol. Large messages may fail to be sent to the Solace Message Router when the maximum web
   * payload is set to a small value. To avoid this, use a large maximum web payload.
   * The valid range is >= 100.
   *
   * @default 1048576 (1MB)
   */
  public maxWebPayload?: number;
}

/**
 * Represents authentication schemes that can be used. The corresponding session
 * property is {@link solace.authenticationScheme}.
 *
 * @see solace.AuthenticationScheme
 */
export enum AuthenticationScheme {
  /**
   * @description Username/Password based authentication scheme.
   * @type {String}
   */
  BASIC = 'AuthenticationScheme_basic',
  /**
   * @name solace.AuthenticationScheme.CLIENT_CERTIFICATE
   * @default AuthenticationScheme_clientCertificate
   * @description Client-side certificate based authentication scheme.
   * @see {@link solace.SessionProperties.sslPfx}
   * @see {@link solace.SessionProperties.sslPfxPassword}
   * @see {@link solace.SessionProperties.sslPrivateKey}
   * @see {@link solace.SessionProperties.sslPrivateKeyPassword}
   * @see {@link solace.SessionProperties.sslCertificate}
   * @type {String}
   * @target node
   */
  /**
   * @description Client-side certificate based authentication scheme.  The certificate and
   *   private key are provided by the browser.
   * @type {String}
   * @target browser
   */
  CLIENT_CERTIFICATE = 'AuthenticationScheme_clientCertificate',
}

/**
 * Properties that define the configuration for a guaranteed message publisher.
 *
 * @see solace.MessagePublisherProperties
 */
export interface MessagePublisherProperties {

  /**
   * When enabled, a Guaranteed Messaging Publisher is automatically created when a session is connected.
   *
   * The default value is the same as the value provided to {@link solace.SolclientFactory.init},
   * in the profile, {@link solace.SolclientFactoryProperties.profile}, in the field {@link solace.FactoryProfile#guaranteedMessagingEnabled}.
   */
  enabled: boolean;

  /**
   * Maximum number of messages that can be published without acknowledgment.
   * The valid range is 1 <= value <= 255
   *
   * @default 50
   */
  windowSize: number;

  /**
   * The time to wait for an acknowledgement, in milliseconds, before retransmitting unacknowledged messages.
   * The valid range is 20 <= value <= 60000.
   *
   * @default 2000
   */
  acknowledgeTimeoutInMsecs: number;

  /**
   * The message-router sends windowed acknowledgements which the API converts to per-message acknowledgement by default. If
   * acknowledgeMode is Windowed, then the API will simply pass through the message-router acknowledgements.
   *
   * @default {@link MessagePublisherAcknowledgeMode.PER_MESSAGE}
   */
  acknowledgeMode: MessagePublisherAcknowledgeMode;
}

/**
 * Represents authentication scheme enumeration.
 *
 * @see solace.MessagePublisherAcknowledgeMode
 */
export enum MessagePublisherAcknowledgeMode {
  /**
   * Applications receive an acknowledgement for every message.
   */
  PER_MESSAGE = 'PER_MESSAGE',
  /**
   * Applications receive a windowed acknowledgement that acknowledges the returned correlation identifier and every message sent prior.
   */
  WINDOWED = 'WINDOWED',
}

/**
 * Represents an enumeration of message delivery modes.
 *
 * @see solace.MessageDeliveryModeType
 */
export enum MessageDeliveryModeType {
  /**
   * This mode provides at-most-once message delivery. Direct messages have
   * the following characteristics:
   *   * They are not retained for clients that are not connected to a Solace Message Router.
   *   * They can be discarded when congestion or system failures are encountered.
   *   * They can be reordered in the event of network topology changes.
   *
   * Direct messages are most appropriate for messaging applications that require very
   * high-rate or very low-latency message transmission. Direct Messaging enables
   * applications to efficiently publish messages to a large number of clients
   * with matching subscriptions.
   */
  DIRECT = 0,
  /**
   * A Persistent delivery mode is used for Guaranteed Messaging, and this delivery mode
   * is most appropriate for applications that require persistent storage of the messages
   * they send or intend to receive. Persistent messages have the following characteristics:
   *
   *  * They cannot be discarded or lost (once they are acknowledged by the Solace Message Router).
   *  * They cannot be reordered in the event of network topology changes.
   *  * They cannot be delivered more than once to a single client (unless the redelivered
   *    message flag is applied).
   *  * When they match subscriptions on durable endpoints, they are retained for a client
   *    when that client is not connected.
   *
   * Persistent messages are most appropriate for applications that require persistent storage
   * of the messages they send or intend to receive.
   */
  PERSISTENT = 1,
  /**
   * This mode is functionally the same as Persistent. It exists to facilitate interaction
   * with JMS applications. In most situations where you want to use Guaranteed Messaging,
   * it is recommended that you use {@link solace.MessageDeliveryModeType.PERSISTENT}.
   */
  NON_PERSISTEN = 2,
}

/**
 * Defines the properties for a solace.MessageConsumer.
 */
export abstract class MessageConsumerProperties {
  /**
   * The Application Acknowledgement mode for the Message Consumer.
   * When the acknowledgement mode is solace.MessageConsumerAcknowledgeMode.CLIENT,
   * a message is Application Acknowledged when the application calls solace.Message#acknowledge on that message.
   *
   * When the acknowledge mode is solace.MessageConsumerAcknowledgeMode.AUTO,
   * a message is Application Acknowledged by the API after all solace.MessageConsumerEventName#event:MESSAGE
   * listeners are called and none throw an exception. If a message handler throws,
   * the message can still be acknowledged by calling solace.Message#acknowledge, but this would not be a recommended practice.
   *
   * When received messages are Application Acknowledged they are removed from the Guaranteed Message storage on the Solace Message Router.
   * Message Consumer Application Acknowledged, only remove messages from the Solace Message Router.
   *
   * In particular, withholding Message Consumer Acknowledgemnts does not stop message delivery.
   * For Message Consumer flow control (aka transport acknowledgemeent) see solace.MessageConsumer.stop/solace.MessageConsumer.start.
   * Message Consumer flow control may also be imlpemented by removing the solace.MessageConsumerEventName#event:MESSAGE listener.
   *
   * Flow control and transport acknowledgements characteristics are defined by
   * solace.MessageConsumerProperties.transportAcknowledgeTimeoutInMsecs
   *
   * @default {MessageConsumerAcknowledgeMode.AUTO}
   */
  public acknowledgeMode?: MessageConsumerAcknowledgeMode;
  /**
   * When enabled, a Guaranteed Messaging Consumer requests Active and Inactive events from the router and emits them to interested listeners.
   * See {solace.MessageConsumerEvent.ACTIVE}
   * See {solace.MessageConsumerEvent.INACTIVE}
   *
   * @default false
   */
  public activeIndicationEnabled?: boolean;
  /**
   * Gets and sets the maximum number of bind attempts when creating a connection to the Solace Message Router.
   * The valid range is >= 1.
   *
   * @default 3
   */
  public connectAttempts?: number;
  /**
   * The bind timeout in milliseconds when creating a connection to the Solace Message Router.
   * The valid range is >= 50.
   *
   * @default 10000
   */
  public connectTimeoutInMsecs?: number;
  /**
   * When enabled, a Guaranteed Messaging Consumer does not receive messages published in the same Session,
   * even if the endpoint contains a subscription that matches the published message.
   *
   * @default false
   */
  public noLocal?: boolean;
  public queueDescriptor: QueueDescriptor;
  public queueProperties: QueueProperties;
  /**
   * When a connected flow receives an unsolicited unbind event with subcode REPLAY_STARTED or GM_UNAVAILABLE,
   * the SDK can reconnect the flow automatically. This property controls the flow auto reconnect feature:
   *   0: Disable flow auto reconnect for this consumer flow.
   *  -1: Enable flow auto reconnect for this consumer flow, infiinite retries (default)
   *
   * <n, positive number>: Enable flow auto reconnect for this consumer flow, n retries.
   *
   * When the flow auto rebind is enabled, DOWN_ERRORs with REPLAY_STARTED and GM_UNAVAILABLE are handled internally,
   * and not (immediately) emitted to the application. A RECONNECTING event (with the same subcode) is emitted instead,
   * ideally followed by a RECONNECTED event when the reconnect succeedes. In case of REPLAY_STARTED,
   * the window of message IDs and acknowledgements are reset to allow replay packets to be passed to the application without marking them as duplicates.
   * In case of GM_UNAVAILABLE, flow state is preserved.
   *
   * If reconnecting fails after exhausting the number of retries, a DOWN_ERROR is emitted with the details of the last retry.
   *
   * @default -1
   */
  public reconnectAttempts?: number;
  /**
   * Time to wait between flow auto reconnect attempts, in milliseconds.
   * See solace.MessageConsumerProperties.reconnectAttempts Defaults to 3 seconds (3000)
   * The valid range is >= 50.
   *
   * @default 3000
   */
  public reconnectIntervalInMsecs?: number;
  /**
   * When a Flow is created, the application may request replay of messages from the replay log,
   * even messages that have been previously delivered and removed the from topic endpoint or queue.
   * The default is undefined, and indicates that no replay is requested.
   *
   * When defined the replay start location must be a {solace.ReplayStartLocation} object as returned by
   * {SolClientFactory.createReplayStartLocationBeginning()} or {SolClientFactory.createReplayStartLocationDate()}.
   *
   * The {solace.ReplayStartLocation} returned by {SolClientFactory.createReplayStartLocationBeginning()}
   * indicate that all messages available should be replayed.
   *
   * The replay start location returned by {SolClientFactory.createReplayStartLocationDate()}
   * indicates that all messages logged since a given date must be retrieved.
   *
   * @default undefined
   */
  public replayStartLocation?: ReplayStartLocation;
  /**
   * The transport acknowledgement timeout for guaranteed messaging.
   * When the solace.MessageConsumerProperties.transportAcknowledgeTimeoutInMsecs is not exceeded,
   * acknowledgements will be returned to the router at intervals not less than this value.
   *
   * The valid range is 20 <= transportAcknowledgeTimeoutInMsecs <= 1500.
   *
   * @default 1000
   */
  public transportAcknowledgeTimeoutInMsecs?: number;
  /**
   * The window size for Guaranteed Message delivery.
   * This is the maximum number of messages that will be prefetched from the
   * Solace Messaging Router and queued internally by the API while waiting for the application to accept delivery of the messages.
   *
   * The valid range is 1 <= windowSize <= 255.
   *
   * @default 255
   */
  public windowSize?: number;
}

export abstract class QueueDescriptor {
  /**
   * The remote name to which this specification refers.
   */
  public name: string;
  /**
   * The type of queue for this specification.
   */
  public type: QueueType;

  /**
   * true if this refers to a durable queue.
   *
   * @default true
   */
  public durable?: boolean;
}

/**
 * Specifies the type of remote resource to which an solace.AbstractQueueDescriptor refers.
 */
export enum QueueType {
  QUEUE = 'QUEUE',
  TOPIC_ENDPOINT = 'TOPIC_ENDPOINT'
}

/**
 * An enumeration of consumer acknowledgement modes.
 * The corresponding MessageConsumer property solace.MessageConsumerProperties#acknowledgeMode
 * configures how acknowledgments are generated for received Guaranteed messages.
 *
 * When received messages are acknowledged they are removed from the Guaranteed Message storage
 * on the Solace Message Router. Message Consumer acknowledgements, only remove messages from the Solace Message Router.
 *
 * In particular, withholding Message Consumer Acknowledgemnts does not stop message delivery.
 * For Message Consumer flow control see solace.MessageConsumer.stop/solace.MessageConsumer.start.
 * Message Consumer flow control may also be imlpemented by removing the solace.MessageConsumerEventName#event:MESSAGE listener.
 */
export enum MessageConsumerAcknowledgeMode {
  /**
   * The API acknowledges a message only when the application calls solace.Message#acknowledge.
   */
  CLIENT = 'CLIENT',
  /**
   * The API automatically acknowledges any message that was delivered to all solace.MessageConsumerEventName#event:MESSAGE listeners with no exception thrown on any of them.
   */
  AUTO = 'AUTO'
}

/**
 * Represents a queue properties object.
 * May be passed in to solace.Session#createMessageConsumer when creating a solace.MessageConsumer object.
 * Upon creation of a queue, undefined queue properties are set to default values chosen by the router.
 */
export abstract class QueueProperties {
  /**
   * Gets/sets the access type for this queue.
   * This parameter must NOT be set when creating a temporary queue via solace.Session#createMessageConsumer.
   * Such a queue has its access type determined by the remote message router.
   *
   * @default undefined
   */
  public accessType?: QueueAccessType;
  /**
   * Gets/sets the discard behavior for this queue.
   *
   * @default {QueueDiscardBehavior.NOTIFY_SENDER_OFF}
   */
  public discardBehavior?: QueueDiscardBehavior;
  /**
   * Gets/sets the maximum number of times to attempt message redelivery for this queue.
   *
   * The valid range is 0 <= maxMessageRedelivery <= 255
   * A value of 0 means retry forever.
   *
   * @default undefined
   */
  public maxMessageRedelivery?: number;
  /**
   * Gets/sets the maximum message size, in bytes, for any single message spooled on this queue.
   *
   * @default undefined
   */
  public maxMessageSize?: number;
  /**
   * Gets/sets permissions for this queue.
   * When creating a temporary queue, these are the permissions that apply to all other users;
   * the user creating the temporary queue is always granted DELETE permissions.
   *
   * @default undefined
   */
  public permissions?: QueuePermissions;
  /**
   * Gets/sets the quota, in megabytes, for this queue.
   *
   * - The allowed values are (0 <= quotaMB) || undefined.
   * - A value of 0 configures the queue to act as a Last-Value-Queue (LVQ),
   *   where the router enforces a Queue depth of one, and only the most current message is spooled by the queue.
   *   When a new message is received, the current queued message is first automatically deleted from the queue,
   *   then the new message is spooled.
   *
   *   @default undefined
   */
  public quotaMB?: number;
  /**
   * Gets/sets whether this queue respects Time To Live on messages.
   *
   * @default false
   */
  public respectsTTL?: boolean;
}

/**
 * Represents the possible endpoint access types. The corresponding endpoint property is solace.QueueProperties#accessType.
 */
export enum QueueAccessType {
  /**
   * An exclusive endpoint. The first client to bind receives the stored messages on the Endpoint.
   */
  EXCLUSIVE = 'EXCLUSIVE',
  /**
   * A non-exclusive (shared) Queue. Each client to bind receives messages in a round robin fashion.
   */
  NONEXCLUSIVE = 'NONEXCLUSIVE'
}

/**
 * Enumerates the behavior options when a message cannot be added to an endpoint
 * (for example, the maximum quota solace.QueueProperties#quotaMB was exceeded).
 */
export enum QueueDiscardBehavior {
  /**
   * Discard the message and acknowledge it.
   */
  NOTIFY_SENDER_OFF = 'NOTIFY_SENDER_OFF',
  /**
   * Send the publisher a message reject notification.
   */
  NOTIFY_SENDER_ON = 'NOTIFY_SENDER_ON'
}

/**
 * Represents the permissions applicable to a queue.
 *
 * The corresponding endpoint property is solace.QueueProperties#permissions.
 *
 * The access controls:
 *
 * the permissions for all other users of the queue, this only applies to non-durable queues solace.QueueProperties#permissions;
 * for the current Message Consumer on a queue or endpoint, solace.MessageConsumer.permissions
 * For example, creating a temporary topic endpoint with MODIFY_TOPIC will allow other users to modify the topic subscribed to that endpoint.
 */
export enum QueuePermissions {
  /**
   * Client may read and consume messages.
   */
  CONSUME = 'CONSUME',
  /**
   * Client may read and consume messages, modify topic(s) associated with the queue, and delete the queue.
   */
  DELETE = 'DELETE',
  /**
   * Client may read and consume messages, and modify topic(s) associated with the queue.
   */
  MODIFY_TOPIC = 'MODIFY_TOPIC',
  /**
   * No client other than the queue's owner may access the endpoint.
   */
  NONE = 'NONE',
  /**
   * Client may read messages but not consume them.
   */
  READ_ONLY = 'READ_ONLY'
}

/**
 * This class is not exposed for construction by API users. Users should obtain an instances from one of the following:
 * solace.SolclientFactory.createReplayStartLocationBeginning
 * solace.SolclientFactory.createReplayStartLocationDate
 * Defines the ReplayStartLocation class.
 * The ReplayStartLocation is set in the corresponding MessageConsumer property solace.MessageConsumerProperties#replayStartLocation
 * The single member variable, _replayStartTime is undefined in ReplayStartLocationBeginning and contains the elapsed time in milliseconds since the epoch in ReplayStartLocationDate
 */
export abstract class ReplayStartLocation {
}

export abstract class QueueBrowserProperties {
  /**
   * Gets and sets the maximum number of bind attempts when creating a connection to the Solace Message Router.
   *
   * The valid range is >= 1.
   * @default 3
   */
  public connectAttempts?: number;
  /**
   * The bind timeout in milliseconds when creating a connection to the Solace Message Router.
   *
   * The valid range is >= 50.
   *
   * @default 10000
   */
  public connectTimeoutInMsecs?: number;
  /**
   * Defines the queue from which to consume.
   *
   * For durable queues and durable topic endpoints, this must be a solace.QueueDescriptor.
   */
  public queueDescriptor: QueueDescriptor;
  /**
   * The threshold for sending an acknowledgement, as a percentage.
   * The API sends a transport acknowledgment every N messages where N is calculated as this percentage of the
   * transport window size if the endpoint's max-delivered-unacked-msgs-per-flow setting at bind time is
   * greater than or equal to the transport window size. Otherwise, N is calculated as this percentage
   * of the endpoint's max-delivered-unacked-msgs-per-flow setting at bind time.
   *
   * The valid range is 1 <= transportAcknowledgeThresholdPercentage <= 75.
   * @default 60
   */
  public transportAcknowledgeThresholdPercentage?: number;
  /**
   * The transport acknowledgement timeout for guaranteed messaging in milliseconds.
   * When the solace.QueueBrowserProperties.transportAcknowledgeTimeoutInMsecs is not exceeded,
   * acknowledgements will be returned to the router at intervals not less than this value.
   *
   * The valid range is 20 <= transportAcknowledgeTimeoutInMsecs <= 1500.
   *
   * @default 1000
   */
  public transportAcknowledgeTimeoutInMsecs?: number;
  /**
   * The window size for Guaranteed Message delivery.
   * This is the maximum number of messages that will be prefetched from the Solace Messaging Router
   * and queued internally by the API while waiting for the application to accept delivery of the messages.
   *
   * The valid range is 1 <= windowSize <= 255.
   *
   * @default 255
   */
  public windowSize?: number;
}

/**
 * This class is not exposed for construction by API users. Users should obtain an instance from solace.SolclientFactory.createMessage
 * A message is a container that can be used to store and send messages to and from the Solace Message Router.
 * Applications manage the lifecycle of a message; a message is created by calling solace.SolclientFactory.createMessage and is freed by dereferencing it.
 * API operations that cache or mutate messages always take a copy. A message may be created, mutated by the API user, and sent multiple times.
 * The Message Object provides methods to manipulate the common Solace message header fields that are optionally sent in the binary metadata
 * portion of the Solace message.
 * Applications can also use the structured data API solace.Message#setSdtContainer to add containers (maps or streams) and
 * their fields to the binary payload or to the User Property map contained within the binary metadata.
 * This does not prevent applications from ignoring these methods and sending payload in the binary payload
 * as an opaque binary field for end-to-end communications
 */
export abstract class Message {
  /**
   * Acknowledges this message.
   *
   * If the solace.MessageConsumer on which this message was received is configured to use solace.MessageConsumerAckMode.CLIENT,
   * then when a message is received by an application, the application must call this method to explicitly acknowledge reception of the message.
   * This frees local and router resources associated with an unacknowledged message.
   * The API does not send acknowledgments immediately. It stores the state for acknowledged messages internally and acknowledges messages,
   * in bulk, when a threshold or timer is reached.
   */
  public abstract acknowledge(): void;

  /**
   * Produces a human-readable dump of the message's properties and contents.
   * Applications must not parse the output, as its format is not a defined part of the API and subject to change.
   *
   * Output can be controlled by the flags parameter. The values are:
   * @param flags
   *    MessageDumpFlag.MSGDUMP_BRIEF Display only the length of the binary attachment, xml attachment, and user property map
   *    MessageDumpFlag.MSGDUMP_FULL Display the entire message.
   */
  public abstract dump(flags: number): string;

  /**
   * Gets the application-provided message ID.
   */
  public abstract getApplicationMessageId(): string;

  /**
   * Gets the application message type. This value is used by applications only, and is passed through the API and Solace Message Router untouched.
   */
  public abstract getApplicationMessageType(): string;

  /**
   * Gets the binary attachment part of the message.
   * Backward compatibility note: Using the version10 factory profile or older,
   * the binary attachment is returned as a 'latin1' String:
   * Each character has a code in the range * 0-255 representing the value of a single received byte at that position.
   */
  public abstract getBinaryAttachment(): Uint8Array;

  /**
   * Given a Message containing a cached message, return the cache Request Id that the application set in the call to solace.CacheSession#sendCacheRequest.
   */
  public abstract getCacheRequestId(): number;

  /**
   * Gets the cache status of this message.
   */
  public abstract getCacheStatus(): any; // MessageCacheStatus;
  /**
   * Gets the correlation ID.
   * The message Correlation Id is carried in the Solace message headers unmodified by the API and the Solace Message Router.
   * This field may be used for peer-to-peer message synchronization and is commonly used for correlating a request to a reply.
   * See solace.Session#sendRequest.
   */
  public abstract getCorrelationId(): string;

  /**
   * Gets the correlation Key.
   * A correlation key is used to correlate a message with its acknowledgement or rejection.
   * The correlation key is an object that is passed back to the client during the router acknowledgement or rejection.
   * The correlation key is a local reference used by applications generating Guaranteed messages.
   * Messages that are sent in either solace.MessageDeliveryModeType.PERSISTENT or solace.MessageDeliveryModeType.NON_PERSISTENT mode may set the correlation key.
   */
  public abstract getCorrelationKey(): any;

  /**
   * Gets the delivery mode of the message.
   */
  public abstract getDeliveryMode(): MessageDeliveryModeType;

  /**
   * Gets the destination to which the message was published.
   */
  public abstract getDestination(): Destination;

  /**
   * The Guaranteed Message expiration value.
   * The expiration time is the UTC time (that is, the number of milliseconds from midnight January 1, 1970 UTC) when the message is to expire.
   */
  public abstract getGMExpiration(): number;

  /**
   * Returns the Guaranteed Message MessageID for this message.
   */
  public abstract getGuaranteedMessageId(): number;

  /**
   * Gets the Message Priority Parameter (JMS Priority) value for the message.
   * Numerical values between 0 and 255 are valid return values, undefined means the parameter is not present.
   * If destination queues and topic endpoints for this message are configured to respect message priority,
   * the values 0 through 9 can be used to affect the priority of delivery to consumers of those queues or topic endpoints.
   * For the purposes of prioritized message delivery, values larger than 9 are treated the same as 9.
   */
  public abstract getPriority(): number;

  /**
   * Gets the receive timestamp (in milliseconds, from midnight, January 1, 1970 UTC).
   */
  public abstract getReceiverTimestamp(): number;

  /**
   * Gets the replyTo destination
   */
  public abstract getReplyTo(): Destination;

  /**
   * Gets the message's structured data container, if this is a structured data message.
   */
  public abstract getSdtContainer(): SDTField | null;

  /**
   * Returns the Sender's ID.
   */
  public abstract getSenderId(): string;

  /**
   * Gets the send timestamp (in milliseconds, from midnight, January 1, 1970 UTC).
   */
  public abstract getSenderTimestamp(): number;

  /**
   * Gets the sequence number.
   * This is an application-defined field, see solace.Message#setSequenceNumber().
   */
  public abstract getSequenceNumber(): number;

  /**
   * The Guaranteed Message TTL, in milliseconds
   */
  public abstract getTimeToLive(): number;

  /**
   * Returns the Topic Sequence Number. If there is no topic sequence number undefined is returned.
   */
  public abstract getTopicSequenceNumber(): number;

  public abstract getType(): MessageType;

  public abstract getUserCos(): MessageUserCosType;

  /**
   * Gets the user data part of the message.
   */
  public abstract getUserData(): string;

  /**
   * Gets the user property map carried in the message binary metadata.
   */
  public abstract getUserPropertyMap(): SDTMapContainer;

  /**
   * Gets the XML content part of the message.
   * Notice that the content is encoded as UTF-8 characters, it needs to be decoded as JavaScript surrogate pair: decodeURIComponent(escape(value))
   */
  public abstract getXmlContent(): string;

  /**
   * Gets the XML content part of the message decoded from UTF-8 encoding of the characters.
   */
  public abstract getXmlContentDecoded(): string;

  /**
   * Gets the message's XML metadata section.
   */
  public abstract getXmlMetadata(): string;

  /**
   * Test if the Acknowledge Immediately message property is set or not.
   * When the Acknowledge Immediately property is set to true on an outgoing Guaranteed Message,
   * it indicates that the Solace Message Router should Acknowledge this message immediately upon receipt.
   * This property, when set by a publisher, may or may not be removed by the Solace Message Router prior to delivery to a consumer,
   * so message consumers must not expect the property value indicates how the message was originally published
   */
  public abstract isAcknowledgeImmediately(): boolean;

  /**
   * Indicates whether one or more messages have been discarded prior to the current message.
   * This indicates congestion discards only and is not affected by message eliding.
   */
  public abstract isDiscardIndication(): boolean;

  /**
   * Whether this message is Guaranteed Message DMQ eligible
   */
  public abstract isDMQEligible(): boolean;

  /**
   * Returns whether the message is eligible for eliding.
   * Message eliding enables filtering of data to avoid transmitting every single update to a subscribing client.
   * This property does not indicate whether the message was elided.
   */
  public abstract isElidingEligible(): boolean;

  /**
   * ndicates whether the message has been marked as redelivered by the Solace Message Router.
   */
  public abstract isRedelivered(): boolean;

  /**
   * Returns whether the message's reply field is set, indicating that this message is a reply to a previous request. See solace.Session#sendRequest.
   */
  public abstract isReplyMessage(): boolean;

  /**
   * Releases all memory associated with this message.
   * All values are reinitialized to defaults.
   * The message is no longer associated with any session or consumer.
   */
  public abstract reset(): void;

  public abstract setAcknowledgeImmediately(value: boolean): void;

  public abstract setApplicationMessageId(value: string): void;

  public abstract setApplicationMessageType(value: string): void;

  public abstract setAsReplyMessage(value: boolean): void;

  public abstract setBinaryAttachment(value: Uint8Array): void;

  public abstract setCorrelationId(value: string): void;

  public abstract setCorrelationKey(value: any): void;

  public abstract setDeliverToOne(value: boolean): void;

  public abstract setDeliveryMode(value: MessageDeliveryModeType): void;

  public abstract setDestination(value: Destination): void;

  public abstract setDMQEligible(value: boolean): void;

  public abstract setElidingEligible(value: boolean): void;

  public abstract setGMExpiration(value: number): void;

  public abstract setPriority(value: number): void;

  public abstract setReplyTo(value: Destination): void;

  public abstract setSdtContainer(container: SDTField): void;

  public abstract setSenderId(value: string): void;

  public abstract setSenderTimestamp(value: number): void;

  public abstract setSequenceNumber(value: number): void;

  public abstract setTimeToLive(value: number): void;

  public abstract setUserCos(value: MessageUserCosType): void;

  public abstract setUserData(value: string): void;

  public abstract setUserPropertyMap(value: SDTMapContainer): void;

  public abstract setXmlContent(value: string): void;

  public abstract setXmlMetadata(value: string): void;
}

/**
 * This class is not exposed for construction by API users. Users should obtain an instances from one of the following:
 * solace.SolclientFactory.createTopicDestination
 * solace.SolclientFactory.createDurableQueueDestination
 * solace.MessageConsumer#getDestination
 * solace.SDTField#getValue when solace.SDTField#getType returns solace.SDTFieldType.DESTINATION.
 * Represents a message destination.
 *
 * Publishers can send messages to topics or queues,
 * to which subscribers can subscribe or bind. A Destination specifies the target of such an operation.
 */
export abstract class Destination {
  /**
   * The destination name specified at creation time.
   */
  public abstract getName(): string;

  public abstract getType(): DestinationType;
}

/**
 * Enumerates destination types for destination objects.
 */
export enum DestinationType {

  /**
   * A queue destination.
   */
  QUEUE = 'queue',
  /**
   * A temporary queue destination.
   */
  TEMPORARY_QUEUE = 'temporary_queue',
  /**
   * A Topic destination.
   */
  TOPIC = 'topic'
}

/**
 * This class is not exposed for construction by API users.
 * Represents a SDT (Structured Data Type) field. To create an instance of an SDTField, call solace.SDTField.create.
 * SDTField objects are used in Solace Containers (solace.SDTMapContainer and solace.SDTStreamContainer).
 * The deprecated usage of solace.SDTMapContainer#addField and solace.SDTStreamContainer#addField take a SDTField object as an argument.
 * The preferred usage is to pass a solace.SDTFieldType and value as arguments.
 * SDTField objectts must be used as an argument to solace.Message#setSdtContainer.
 * The only valid SDTField objects for solace.Message#setSdtContainer are:
 *
 * solace.SDTFieldType.STREAM
 * solace.SDTFieldType.MAP
 * solace.SDTFieldType.STRING
 */
export abstract class SDTField {
  public abstract getType(): any;

  public abstract getValue(): any;
}

/**
 * Represents an enumeration of message payload types (see solace.Message#getBinaryAttachment)
 * A message may contain unstructured byte data, or a structured container.
 */
export enum MessageType {
  /**
   * Binary message (unstructured bytes stored in the binary attachment message part).
   */
  BINARY = 0,
  /**
   * Structured map message.
   */
  MAP = 1,
  /**
   * Structured stream message.
   */
  STREAM = 2,
  /**
   * Structured text message.
   */
  TEXT = 3
}

/**
 * Represents an enumeration of user Class of Service (COS) levels. The COS is set on a Message with solace.Message#setUserCos
 * The Class of Service has different semantics for direct and guaranteed messages.
 * For messages published with solace.MessageDeliveryModeType.DIRECT, the class of service selects the
 * weighted round-robin delivery queue when the message is forwarded to a consumer. solace.MessageUserCosType.COS1
 * are the lowest priority messages and will use the Solace Message Router D-1 delivery queues.
 * For messages published as guaranteed messages (solace.MessageDeliveryModeType.PERSISTENT or solace.MessageDeliveryModeType.NON_PERSISTENT),
 * messages published with solace.MessageUserCosType.COS1 can be rejected by the Solace Message Router if that message would
 * cause any queue or topic-endpoint to exceed its configured low-priority-max-msg-count.
 */
export enum MessageUserCosType {
  /**
   * Direct Messages: Lowest priority, use Solace Message Router client D-1 queues for delivery.
   * Guaranteed Messages: Messages can be rejected if the message would cause any queue or
   * topic-endpoint to exceed it's configured low-prioriity-max-msg-count.
   */
  COS1 = 0,
  /**
   * Direct Messages: Medium priority, use Solace Message Router client D-2 queues for delivery.
   * Guaranteed Messages: N/A (same as COS3)
   */
  COS2 = 1,
  /**
   * Direct Messages: Highest priority, use Solace Message Router client D-3 queues for delivery.
   * Guaranteed Messages: Messages are not rejected for exceeding low-priority-max-msg-count.
   * Messages may still be rejected for other reasons such as Queue 'Spool Over Quota'.
   */
  COS3 = 2
}

/**
 * Defines a Structured Data Type (SDT) map container.
 */
export abstract class SDTMapContainer {
  public abstract addField(key: string, value: SDTField): void;

  public abstract deleteField(key: string): void;

  public abstract getField(key: string): SDTField;

  public abstract getKeys(): string[];
}

/**
 * Represents an enumeration of message dump formats. It controls the output of solace.Message#dump.
 */
export enum MessageDumpFlag {
  /**
   * Display only the length of the binary attachment, XML content and user property maps.
   */
  MSGDUMP_BRIEF = 0,
  /**
   * Display the entire message contents.
   */
  MSGDUMP_FULL = 1
}
