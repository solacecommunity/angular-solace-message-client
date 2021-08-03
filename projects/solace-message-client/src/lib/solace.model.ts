// tslint:disable:no-redundant-jsdoc
// tslint:disable:member-ordering

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
export interface SessionProperties {

  /**
   * The authentication scheme used when establishing the session.
   *
   * @default {@link AuthenticationScheme.BASIC}
   */
  authenticationScheme?: AuthenticationScheme;

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
  url: string | string[];

  /**
   * The password required for authentication.
   *
   * @default ""
   */
  password?: string;
  /**
   * The client username required for authentication.
   *
   * @default ""
   */
  userName?: string;

  /**
   * The client name that is used during login as a unique identifier for the session on the Solace Message Router.
   *  * An empty string causes a unique client name to be generated automatically.
   *  * If specified, it must be a valid Topic name, and a maximum of 160 bytes in length.
   *  * This property is also used to uniquely identify the sender in a message's senderId field if {@link SessionProperties.includeSenderId} is set.
   *
   * @default ""
   */
  clientName?: string;

  /**
   * A string that uniquely describes the application instance.
   * If left blank, the API will generate a description string using the current user-agent string.
   *
   * @default ""
   */
  applicationDescription?: string;

  /**
   * The Message VPN name that the client is requesting for this session.
   */
  vpnName: string;

  /**
   * A read-only session property that indicates which Message VPN the session is connected to. When not connected, or when not in client mode, an empty string is returned.
   */
  vpnNameInUse?: string;

  /**
   * A read-only property that indicates the connected Solace Message Router's virtual router name.
   */
  virtualRouterName?: string;

  /**
   * The timeout period (in milliseconds) for a connect operation to a given host.
   * If no value is provided, the default is 8000. The valid range is > 0.
   *
   * @default max(8000, 1000 + webTransportProtocolList.length * transportDowngradeTimeoutInMsecs)
   */
  connectTimeoutInMsecs?: number;

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
  connectRetries?: number;

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
  connectRetriesPerHost?: number;

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
  reconnectRetryWaitInMsecs?: number;

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
  reconnectRetries?: number;

  /**
   * When enabled, a send timestamp is automatically included (if not already present) in the Solace-defined fields for each message sent.
   *
   * @default  false
   */
  generateSendTimestamps?: boolean;

  /**
   * When enabled, a receive timestamp is recorded for each message and passed to the session's message callback receive handler.
   *
   * @default  false
   */
  generateReceiveTimestamps?: boolean;
  /**
   * When enabled, a sender ID is automatically included (if not already present) in the Solace-defined fields for each message sent.
   *
   * @default  false
   */
  includeSenderId?: boolean;

  /**
   * When enabled, a sequence number is automatically included (if not already present) in the Solace-defined fields for each message sent.
   *
   * @default  false
   */
  generateSequenceNumber?: boolean;

  /**
   * The amount of time (in milliseconds) to wait between sending out keep-alive messages to the Solace Message Router.
   * The valid range is > 0.
   *
   * @default  3000
   */
  keepAliveIntervalInMsecs?: number;

  /**
   * The maximum number of consecutive Keep-Alive messages that can be sent without receiving a response before the session is declared down and the connection is closed by the API.
   * The valid range is >= 3.
   *
   * @default 3
   */
  keepAliveIntervalsLimit?: number;

  /**
   * A read-only string that indicates the default reply-to destination used for any request messages sent from this session.
   * See {@link solace.Session.sendRequest}.
   *
   * This parameter is only valid when the session is connected.
   *
   * @default ""
   */
  p2pInboxInUse?: string;

  /**
   * A read-only string providing information about the application, such as the name of operating system that is running the application.
   *
   * @default  ""
   */
  userIdentification?: string;

  /**
   * Used to ignore duplicate subscription errors on subscribe.
   *
   * @default  true
   */
  ignoreDuplicateSubscriptionError?: boolean;

  /**
   * Used to ignore subscription not found errors on unsubscribe.
   *
   * @default  true
   */
  ignoreSubscriptionNotFoundError?: boolean;

  /**
   * Set to 'true' to have the API remember subscriptions and reapply them upon calling {@link solace.Session.connect} on a disconnected session.
   *
   * @default  false
   */
  reapplySubscriptions?: boolean;

  /**
   * Sets the guaranteed messaging publisher properties for the session.
   * If the supplied value is not a {@link MessagePublisherProperties},
   * one will be constructed using the supplied value as an argument.
   */
  publisherProperties?: MessagePublisherProperties;
  /**
   * Set to 'true' to signal the Solace Message Router that messages published on the session should not be received on the same session even if the client has a subscription that
   * matches the published topic. If this restriction is requested, and the Solace Message Router does not have No Local support, the session connect will fail.
   *
   * @default  false
   */
  noLocal?: boolean;

  /**
   * The timeout period (in milliseconds) for a reply to come back from the Solace Message Router. This timeout serves as the default
   * request timeout for {@link solace.Session.subscribe},  {@link solace.Session.unsubscribe}, {@link solace.Session.updateProperty}.
   * The valid range is >= 0.
   *
   * @default 10000
   */
  readTimeoutInMsecs?: number;

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
  sendBufferMaxSize?: number;

  /**
   * The maximum payload size (in bytes) when sending data using the Web transport
   * protocol. Large messages may fail to be sent to the Solace Message Router when the maximum web
   * payload is set to a small value. To avoid this, use a large maximum web payload.
   * The valid range is >= 100.
   *
   * @default 1048576 (1MB)
   */
  maxWebPayload?: number;

  /**
   * Allow additional properties, e.g., properties contained in new `solclientjs` versions.
   */
  [key: string]: any;
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
   * @see {@link SessionProperties.sslPfx}
   * @see {@link SessionProperties.sslPfxPassword}
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
   * it is recommended that you use {@link MessageDeliveryModeType.PERSISTENT}.
   */
  NON_PERSISTENT = 2,
}

/**
 * A message is a container that can be used to store and send messages to and from the Solace Message Router.
 *
 * Applications manage the lifecycle of a message; a message is created by calling {@link SolaceObjectFactory.createMessage}
 * and is freed by dereferencing it. API operations that cache or mutate messages always take a copy. A message may be
 * created, mutated by the API user, and sent multiple times. The Message Object provides methods to manipulate the common
 * Solace message header fields that are optionally sent in the binary metadata portion of the Solace message.
 *
 * Applications can also use the structured data API {@link Message#setSdtContainer} to add containers (maps or streams) and
 * their fields to the binary payload or to the User Property map contained within the binary metadata.
 *
 * This does not prevent applications from ignoring these methods and sending payload in the binary payload
 * as an opaque binary field for end-to-end communications
 *
 * @see solace.Message
 */
export interface Message {

  /**
   * Gets the payload type ({@link MessageType}) of the message. A message has a
   * structured payload if one was attached via {@link Message#setSdtContainer} otherwise
   * if the payload is attached via {@link Message#setBinaryAttachment} then it
   * is unstructured {@link MessageType#BINARY}.
   *
   * @default MessageType.BINARY
   */
  getType(): MessageType;

  /**
   * Sets the application-provided message ID.
   */
  setApplicationMessageId(value: string): void;

  /**
   * Gets the application-provided message ID.
   */
  getApplicationMessageId(): string;

  /**
   * Sets the application message type. This value is used by applications only, and is passed through the API and Solace Message Router untouched.
   */
  setApplicationMessageType(value: string): void;

  /**
   * Gets the application message type. This value is used by applications only, and is passed through the API and Solace Message Router untouched.
   */
  getApplicationMessageType(): string;

  /**
   * Gets the binary attachment part of the message.
   *
   * Backward compatibility note: Using the version10 factory profile or older, the binary attachment is returned as a 'latin1' String:
   * Each character has a code in the range * 0-255 representing the value of a single received byte at that position.
   */
  getBinaryAttachment(): Uint8Array | string;

  /**
   * Sets the binary attachment part of the message.
   *
   * The binary attachment is conceptually an array of bytes.
   * When this method is used, the message payload type is {@link MessageType#BINARY}
   * See {@link Message#getType}.
   *
   * Applications may set the binary attachment to NULL or undefined to
   * remove the binary attachment and create a message with no payload.
   *
   * The following types are accepted:
   * - ArrayBuffer
   * - any DataView or TypedArray
   * - 'latin1' String for backwards compatibility:
   *   Each character has a code in the range 0-255 representing exactly one byte in the attachment.
   */
  setBinaryAttachment(value: ArrayBufferLike | DataView | string): void;

  /**
   * Given a Message containing a cached message, return the cache Request Id that the application set in the call to {@link solace.CacheSession#sendCacheRequest}.
   *
   * The request ID of the cache request associated with this message.
   */
  getCacheRequestId(): number;

  /**
   * Gets the correlation ID.
   *
   * The message Correlation Id is carried in the Solace message headers unmodified by the API and
   * the Solace Message Router. This field may be used for peer-to-peer message synchronization and
   * is commonly used for correlating a request to a reply. See {@link solace.Session#sendRequest}.
   */
  getCorrelationId(): string;

  /**
   * Sets the correlation ID.
   *
   * The message Correlation Id is carried in the Solace message headers unmodified by the API and
   * the Solace Message Router. This field may be used for peer-to-peer message synchronization and
   * is commonly used for correlating a request to a reply. See {@link solace.session#sendRequest}.
   */
  setCorrelationId(value: string): void;

  /**
   * Gets the correlation Key.
   *
   * A correlation key is used to correlate a message with its acknowledgement or rejection.
   * The correlation key is an object that is passed back to the client during the router
   * acknowledgement or rejection.
   *
   * The correlation key is a local reference used by applications generating Guaranteed messages.
   * Messages that are sent in either {@link MessageDeliveryModeType.PERSISTENT} or
   * {@link MessageDeliveryModeType.NON_PERSISTENT} mode may set the correlation key.
   */
  getCorrelationKey(): any | null;

  /**
   * Sets the correlation Key. A correlation key is used to correlate
   * a message with its acknowledgement or rejection. The correlation key is an object that is
   * passed back to the client during the router acknowledgement or rejection.
   *
   * The correlation key is a local reference used by applications generating Guaranteed Messages.
   * Messages that are sent in either {@link MessageDeliveryModeType.PERSISTENT} or
   * {@link MessageDeliveryModeType.NON_PERSISTENT} mode may set the correlation key. If this
   * method is used, the correlation information is returned when the
   * {@link solace.SessionEventCode#event:ACKNOWLEDGED_MESSAGE} event is later received for an
   * acknowledged message or when the {@link solace.SessionEventCode#event:REJECTED_MESSAGE_ERROR}
   * is received for a rejected message.
   *
   * The API only maintains a reference to the passed object. If the application requires the
   * contents are unmodified for proper correlation, then it is the application's responsibility
   * to ensure the contents of the object are not modified.
   *
   * Important: <b>The Correlation Key is not included in the transmitted message and is only used
   * with the local API</b>
   */
  setCorrelationKey(value: any): void;

  /**
   * Gets the delivery mode of the message.
   */
  getDeliveryMode(): MessageDeliveryModeType;

  /**
   * Sets the delivery mode of the message.
   */
  setDeliveryMode(value: MessageDeliveryModeType): void;

  /**
   * Gets the destination to which the message was published.
   */
  getDestination(): Destination;

  /**
   * Sets the destination ({@link DestinationType.TOPIC} or {@link DestinationType.QUEUE}) to publish the message to.
   */
  setDestination(value: Destination): void;

  /**
   * Indicates whether one or more messages have been discarded prior to the current message.
   * This indicates congestion discards only and is not affected by message eliding.
   */
  isDiscardIndication(): boolean;

  /**
   * Returns whether the message is eligible for eliding.
   *
   * Message eliding enables filtering of data to avoid transmitting
   * every single update to a subscribing client.
   *
   * This property does not indicate whether the message was elided.
   */
  isElidingEligible(): boolean;

  /**
   * Sets whether the message is eligible for eliding.
   *
   * Message eliding enables filtering of data to avoid transmitting
   * every single update to a subscribing client.
   *
   * This property does not indicate whether the message was elided.
   */
  setElidingEligible(value: boolean): void;

  /**
   * The Guaranteed Message TTL, in milliseconds.
   */
  getTimeToLive(): number;

  /**
   * Sets the Guaranteed Message TTL to set, in milliseconds.
   *
   * The time to live is the number of milliseconds the message may be stored on the
   * Solace Message Router before the message is discarded or moved to a Dead Message
   * Queue. See {@link setDMQEligible}.
   *
   * Setting the Time To Live to zero disables TTL for the message.
   *
   * This property is only valid for Guaranteed messages (Persistent and Non-Persistent).
   * It has no effect when used in conjunction with other message types unless the message
   * is promoted by the appliance to a Guaranteed message.
   *
   * The maxium allowed time to live is 3.1536E11 (315360000000) which is
   * approximately 10 years.
   */
  setTimeToLive(value: number): void;

  /**
   * Returns the Guaranteed Message expiration value.
   * The expiration time is the UTC time
   * (that is, the number of milliseconds from midnight January 1, 1970 UTC) when the
   * message is to expire.
   */
  getGMExpiration(): number;

  /**
   * Sets the expiration time field. The expiration time is the UTC time
   * (that is, the number of milliseconds from midnight January 1, 1970 UTC) when the
   * message is to expire. The expiration time is carried in the message when set to
   * a non-zero value. Expiration time is not included when this value is set to zero or
   * undefined
   *
   * The message expiration time is carried to clients that receive the message
   * unmodified and does not effect the life cycle of the message. Use
   * {@link setTimeToLive} to enforce message expiry in the network.
   */
  setGMExpiration(value: number): void;

  /**
   * Whether this message is Guaranteed Message DMQ eligible
   */
  isDMQEligible(): boolean;

  /**
   * Sets the new value for Guaranteed Message DMQ (Dead Message Queue) Eligible.
   * When this property is set, when the message expires in the network
   * the message is saved on a appliance dead message queue. Otherwise the expired message is
   * discarded. See {@link setTimeToLive}.
   */
  setDMQEligible(value: boolean): void;

  /**
   * Returns the Guaranteed Message MessageID for this message.
   */
  getGuaranteedMessageId(): number;

  /**
   * Returns the Topic Sequence Number. If there is no topic sequence number, `undefined` is returned.
   */
  getTopicSequenceNumber(): number | undefined;

  /**
   * Returns the delivery count.
   */
  getDeliveryCount(): number;

  /**
   * Acknowledges this message.
   *
   * If the {@link solace.MessageConsumer} on which this message was received is configured to use
   * {@link solace.MessageConsumerAckMode.CLIENT}, then when a message is received by an
   * application, the application must call this method to explicitly acknowledge reception of the
   * message. This frees local and router resources associated with an unacknowledged message.
   *
   * The API does not send acknowledgments immediately. It stores the state for
   * acknowledged messages internally and acknowledges messages, in bulk, when a
   * threshold or timer is reached.
   *
   * @throws {@link solace.OperationError}
   *  * if this message was not received via Guaranteed Message;
   *    subcode: {@link solace.ErrorSubcode.MESSAGE_DELIVERY_MODE_MISMATCH}
   *  * if the associated {@link solace.Session} is not connected;
   *    subcode: {@link solace.ErrorSubcode.SESSION_NOT_CONNECTED}
   *  * if the associated {@link solace.MessageConsumer} is not connectedl
   *    subcode: {@link solace.ErrorSubcode.INVALID_OPERATION}
   */
  acknowledge(): void;

  /**
   * Returns whether acknowledge() has been called on this message.
   */
  readonly isAcknowledged: boolean;

  /**
   * Test if the Acknowledge Immediately message property is set or not.
   * When the Acknowledge Immediately property is set to true on an outgoing
   * Guaranteed Message, it indicates that the Solace Message Router should
   * acknowledge this message immediately upon receipt.
   *
   * This property, when set by a publisher, may or may not be removed by the
   * Solace Message Router prior to delivery to a consumer, so message consumers
   * must not expect the property value indicates how the message was
   * originally published
   */
  isAcknowledgeImmediately(): boolean;

  /**
   * Set the optional Acknoweledge Immediately message property.
   * When the Acknowledge Immediately property is set to true on an outgoing Guaranteed Message,
   * it indicates that the Solace Message Router should acknoweledge this message
   * immediately upon receipt. By default the property is set to false on newly created messages.
   *
   * This property, when set by a publisher, may or may not be removed by the appliance
   * prior to delivery to a consumer, so message consumers must not expect the property value
   * indicates how the message was originally published. Therefore if a received message
   * is forwarded by the application, the Acknowledge Immediately property should be
   * explicitly set to the desired value (true or false).
   *
   * Setting this property on an outgoing direct message has no effect.
   */
  setAcknowledgeImmediately(value: boolean): void;

  /**
   * Gets the cache status of this message.
   *
   * The status will be {@link MessageCacheStatus#LIVE} unless the message was returned in a reply to a cache request.
   */
  getCacheStatus(): MessageCacheStatus;

  /**
   * Returns whether the message's reply field is set, indicating
   * that this message is a reply to a previous request. See {@link solace.Session#sendRequest}.
   */
  isReplyMessage(): boolean;

  /**
   * Indicates whether the message has been marked as redelivered by the Solace Message Router.
   */
  isRedelivered(): boolean;

  /**
   * Sets whether to flag the message as a reply.
   */
  setAsReplyMessage(value: boolean): void;

  /**
   * Gets the receive timestamp (in milliseconds, from midnight, January 1, 1970 UTC).
   */
  getReceiverTimestamp(): number;

  /**
   * Gets the replyTo destination, if set.
   */
  getReplyTo(): Destination | undefined;

  /**
   * Sets the replyTo destination
   */
  setReplyTo(value: Destination): void;

  /**
   * Returns the Sender's ID, if set.
   */
  getSenderId(): string | undefined;

  /**
   * Sets the Sender ID for the message
   */
  setSenderId(value: string): void;

  /**
   * Gets the send timestamp (in milliseconds, from midnight, January 1, 1970 UTC), if set.
   */
  getSenderTimestamp(): number | undefined;

  /**
   * Sets the send timestamp (in milliseconds, from midnight, January 1,
   * 1970 UTC). This field can be generated automatically during message
   * publishing, but it will not be generated if previously set to a non-null value by this method.
   * See {@link SessionProperties#generateSendTimestamps}.
   *
   * An application that publishes the same {@link Message} multiple times and
   * also wants generted timestamps on each messages, should set the sender timestamp
   * to undefined after each call to {@link solace.Session#send}.
   */
  setSenderTimestamp(value: number): void;

  /**
   * Gets the sequence number, if set.
   *
   * This is an application-defined field, see {@link setSequenceNumber}.
   * @throws {@link solace.SDTUnsupportedValueError} in case the sequence number is out of range.
   */
  getSequenceNumber(): number | undefined;

  /**
   * Sets the application-defined sequence number. If the sequence number
   * is not set, or set to undefined, and {@link SessionProperties#generateSequenceNumber}
   * is true, then a sequence number is automatically generated for each sent message.
   */
  setSequenceNumber(value: number): void;

  /**
   * Gets the Class of Service (CoS) value for the message.
   * The Class of Service has different semantics for direct and guaranteed messages.
   *
   * For messages published with {@link MessageDeliveryModeType.DIRECT}, the
   * class of service selects the weighted round-robin delivery queue when the
   * message is forwarded to a consumer.{@link MessageUserCosType.COS1} are the
   * lowest priority messages and will use the Solace Message Router D-1 delivery queues.
   *
   * For messages published as guaranteed messages
   * ({@link MessageDeliveryModeType.PERSISTENT} or
   * {@link MessageDeliveryModeType.NON_PERSISTENT}), messages published
   * with {@link MessageUserCosType.COS1} can be rejected by the Solace Message Router if
   * that message would cause any queue or topic-endpoint to exceed its configured
   * low-priority-max-msg-count.
   */
  getUserCos(): MessageUserCosType;

  /**
   * Gets the Message Priority Parameter (JMS Priority) value for the message.
   * Numerical values between 0 and 255 are valid return values,
   * undefined means the parameter is not present.
   *
   * If destination queues and topic endpoints for this message
   * are configured to respect message priority,
   * the values 0 through 9 can be used to affect the priority
   * of delivery to consumers of those queues or topic endpoints.
   * For the purposes of prioritized message delivery,
   * values larger than 9 are treated the same as 9.
   */
  getPriority(): number;

  /**
   * Sets the Class of Service (CoS) value for the message.
   *
   * The Class of Service has different semantics for direct and guaranteed messages.
   *
   * For messages published with {@link MessageDeliveryModeType.DIRECT}, the
   * class of service selects the weighted round-robin delivery queue when the
   * message is forwarded to a consumer.{@link MessageUserCosType#COS1} are the
   * lowest priority messages and will use the Solace Message Router D-1 delivery queues.
   *
   * For messages published as guaranteed messages
   * ({@link MessageDeliveryModeType.PERSISTENT} or
   * {@link MessageDeliveryModeType.NON_PERSISTENT}), messages published
   * with {@link MessageUserCosType#COS1} can be rejected by the Solace Message Router if
   * that message would cause any queue or topic-endpoint to exceed its configured
   * low-priority-max-msg-count.
   *
   * @default {solace.MessageUserCosType#COS1}
   */
  setUserCos(value: MessageUserCosType): void;

  /**
   * Sets the Message Priority Parameter (JMS Priority) value for the message.
   * Numerical values between 0 and 255 are accepted,
   * use undefined to unset.
   *
   * If destination queues and topic endpoints for this message
   * are configured to respect message priority,
   * the values 0 through 9 can be used to affect the priority
   * of delivery to consumers of those queues or topic endpoints.
   * For the purposes of prioritized message delivery, values larger than 9
   * are treated the same as 9.
   */
  setPriority(value: number): void;

  /**
   * Gets the user data part of the message, if set.
   */
  getUserData(): string | undefined;

  /**
   * Sets the user data part of the message.
   */
  setUserData(value: string): void;

  /**
   * Gets the XML content part of the message, if set.
   * Notice that the content is encoded as UTF-8 characters,
   * it needs to be decoded as JavaScript surrogate pair: decodeURIComponent(escape(value))
   */
  getXmlContent(): string | undefined;

  /**
   * Gets the XML content part of the message decoded from UTF-8 encoding of the characters.
   */
  getXmlContentDecoded(): string | null;

  /**
   * Sets the XML content part of the message.
   * The content is encoded by replacing each instance of certain characters
   * by one, two, three, or four escape sequences representing the
   * UTF-8 encoding of the character.
   */
  setXmlContent(value: string): void;

  /**
   * Sets the message's XML metadata section.
   */
  setXmlMetadata(value: string): void;

  /**
   * Gets the message's XML metadata section, if set.
   */
  getXmlMetadata(): string | undefined;

  /**
   * Gets the user property map carried in the message binary metadata, if set.
   */
  getUserPropertyMap(): SDTMapContainer | undefined;

  /**
   * Allows users to specify their own user properties to be carried
   * in the message binary metadata separate from the payload.
   */
  setUserPropertyMap(value: SDTMapContainer): void;

  /**
   * Makes this message a structured data message by assigning it a structured data type (SDT) container payload (such as a
   * {@link SDTMapContainer}, {@link SDTStreamContainer} or a {@link SDTFieldType#STRING}, which is transported in the binary
   * attachment field.
   *
   * Assigning a SDT container updates the message's Type property to the appropriate value.
   *
   * The container argument must be a {@link SDTField} with a type of {@link SDTFieldType.MAP},
   * {@link SDTFieldType.STREAM}, or {@link SDTFieldType.STRING}.
   *
   */
  setSdtContainer(container: SDTField): void;

  /**
   * Gets the message's structured data container, if this is a structured data message.
   */
  getSdtContainer(): SDTField | null;

  /**
   * Produces a human-readable dump of the message's properties and contents. Applications must not parse the output, as its format is
   * not a defined part of the API and subject to change.
   *
   * Output can be controlled by the <code>flags</code> parameter.
   */
  dump(flags: MessageDumpFlag): string;

  /**
   * Releases all memory associated with this message. All values are reinitialized to defaults. The message is no longer associated with any session or consumer.
   */
  reset(): void;

  /**
   * Allow additional properties, e.g., properties contained in new `solclientjs` versions.
   */
  [key: string]: any;
}

/**
 * Represents an enumeration of message payload types (see {@link Message#getBinaryAttachment})
 *
 * A message may contain unstructured byte data, or a structured container.
 *
 * @see solace.MessageType
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
 * Represents a message destination.
 *
 * Publishers can send messages to topics or queues, to which subscribers can subscribe or bind. A Destination specifies the target
 * of such an operation.
 *
 * Users should obtain an instances from one of the following:
 * * {@link SolaceObjectFactory.createTopicDestination}
 * * {@link SolaceObjectFactory.createDurableQueueDestination}
 * * {@link solace.MessageConsumer#getDestination}
 * * {@link SDTField#getValue} when {@link SDTField#getType} returns {@link SDTFieldType.DESTINATION}.
 *
 * @see solace.Destination
 */
export interface Destination {

  /**
   * The destination name specified at creation time.
   */
  readonly name: string;

  /**
   * The destination type.
   */
  readonly type: DestinationType;

  /**
   * The destination name specified at creation time.
   */
  getName(): string;

  /**
   * The destination type.
   */
  getType(): DestinationType;

  /**
   * A generic description of the Destination.
   */
  toString(): void;
}

/**
 * Enumerates destination types for destination objects.
 *
 * @see solace.DestinationType
 */
export enum DestinationType {
  /**
   * A Topic destination.
   */
  TOPIC = 'topic',
  /**
   * A queue destination.
   */
  QUEUE = 'queue',
  /**
   * A temporary queue destination.
   */
  TEMPORARY_QUEUE = 'temporary_queue',
}

/**
 * An attribue of a {@link Message}.
 *
 * Applications receive messages due to subscriptions on topics, or consumers connected to durable objects.
 * The MessageCacheStatus of such messages is: {@link MessageCacheStatus#LIVE}.
 *
 * Message are also delivered to an application
 * as a result of a cache request (see {@link solace.CacheSession#sendCacheRequest}) which
 * have a MessageCacheStatus that is {@link MessageCacheStatus#CACHED} or
 * {@link MessageCacheStatus#SUSPECT}.
 *
 * The MessageCacheStatus is retrieved with {@link Message#getCacheStatus}.
 *
 * @see solace.MessageCacheStatus
 */
export enum MessageCacheStatus {
  /**
   * The message is live.
   */
  LIVE = 0,
  /**
   * The message was retrieveed from a solCache Instance.
   */
  CACHED = 1,
  /**
   * The message was retrieved from a suspect solCache Instance.
   */
  SUSPECT = 2,
}

/**
 * Represents an enumeration of user Class of Service (COS) levels. The COS is set on a Message with {@link Message#setUserCos}.
 *
 * The Class of Service has different semantics for direct and guaranteed messages.
 *
 * For messages published with {@link MessageDeliveryModeType.DIRECT}, the class of service selects the weighted round-robin
 * delivery queue when the message is forwarded to a consumer.  {@link MessageUserCosType.COS1} are the lowest priority messages
 * and will use the Solace Message Router D-1 delivery queues.
 *
 * For messages published as guaranteed messages ({@link MessageDeliveryModeType.PERSISTENT} or
 * {@link MessageDeliveryModeType.NON_PERSISTENT}), messages published with {@link MessageUserCosType.COS1} can be rejected by
 * the Solace Message Router if that message would cause any queue or topic-endpoint to exceed its configured
 * low-priority-max-msg-count.
 *
 * @see solace.MessageUserCosType
 */
export enum MessageUserCosType {
  /**
   * Direct Messages: Lowest priority, use Solace Message Router client D-1 queues for delivery.
   *
   * Guaranteed Messages: Messages can be rejected if the message would cause any
   * queue or topic-endpoint to exceed its configured <i>low-priority-max-msg-count</i>.
   */
  COS1 = 0,
  /**
   * Direct Messages: Medium priority, use Solace Message Router client D-2 queues for delivery.
   *
   * Guaranteed Messages: N/A (same as COS3)
   */
  COS2 = 1,
  /**
   * Direct Messages: Highest priority, use Solace Message Router client D-3 queues for delivery.
   *
   * Guaranteed Messages: Messages are not rejected for exceeding <i>low-priority-max-msg-count</i>.
   * Messages may still be rejected for other reasons such as Queue 'Spool Over Quota'.
   */
  COS3 = 2,
}

/**
 * Represents a SDT (Structured Data Type) field.
 *
 * SDTs are structured, language-independent, and architecture-independent data types.
 * SDTs can be used in messages to facilitate the exchange of binary data in a heterogeneous network
 * that has clients that use different hardware architectures and programming languages.
 *
 * To create an instance of an <code>SDTField</code>, call {@link SolaceObjectFactory.createSDTField}.
 *
 * @see solace.SDTField
 */
export interface SDTField {

  /**
   * Gets the type of field represented.
   */
  getType(): SDTFieldType;

  /**
   * Gets the field value.
   * @throws {solace.SDTUnsupportedValueError} if value found in the field is not in range supported by the platform/runtime.
   */
  getValue(): any;

  toString(): string;
}

/**
 * An enumeration of all SDT data types.
 *
 * @see solace.SDTFieldType
 */
export enum SDTFieldType {

  /**
   * Maps to a boolean.
   */
  BOOL = 0,
  /**
   * Maps to a number.
   */
  UINT8 = 1,
  /**
   * Maps to a number.
   */
  INT8 = 2,
  /**
   * Maps to a number.
   */
  UINT16 = 3,
  /**
   * Maps to a number.
   */
  INT16 = 4,
  /**
   * Maps to a number.
   */
  UINT32 = 5,
  /**
   * Maps to a number.
   */
  INT32 = 6,
  /**
   * Maps to a number.
   *
   * Warning: Supports 48-bit integers (range: 0 to 2<sup>48</sup>-1). When decoding, only the lower 48 bits are considered significant.
   */
  UINT64 = 7,
  /**
   * Maps to a number.
   *
   * Warning:: Supports 48-bit integers + sign (range: -(2<sup>48</sup>-1) to 2<sup>48</sup>-1). When decoding, only the lower 48 bits are considered significant.
   */
  INT64 = 8,
  /**
   * A single character; maps to a string.
   */
  WCHAR = 9,
  /**
   * Maps to a string.
   */
  STRING = 10,
  /**
   * Maps to a Uint8Array.
   *
   * Backward compatibility note:
   * Using the version_10 factory profile or older, the getValue() method of a BYTEARRAY sdtField
   * returns the byte array in 'latin1' String representation.
   * Later profiles return a Uint8Array (in the form of a nodeJS Buffer instance in fact)
   *
   * When creating a field of type BYTEARRAY, the following datatypes are all accepted as value:
   *   - Buffer (the nodeJS native type or equivalent)
   *   - ArrayBuffer,
   *   - Any DataView or TypedArray,
   *   - 'latin1' String for backwards compatibility:
   *     Each character has a code in the range 0-255
   *     representing exactly one byte in the attachment.
   */
  BYTEARRAY = 11,
  /**
   * Single-precision float; maps to a number.
   */
  FLOATTYPE = 12,
  /**
   * Double-precision float; maps to a number.
   */
  DOUBLETYPE = 13,
  /**
   * Maps to {@link SDTMapContainer}.
   */
  MAP = 14,
  /**
   * Maps to {@link SDTStreamContainer}.
   */
  STREAM = 15,
  /**
   * Maps to {@link Destination}.
   */
  DESTINATION = 16,
  /**
   * Maps to <code>null</code>.
   */
  NULLTYPE = 17,
  /**
   * Maps to an unknown type.
   */
  UNKNOWN = 18,
  /**
   * Maps to an encoded SMF message.
   */
  SMF_MESSAGE = 19,
}

/**
 * Defines a Structured Data Type (SDT) map container.
 *
 * To create an instance of an <code>SDTMapContainer</code>, call {@link SolaceObjectFactory.createSDTMapContainer}.
 *
 * @see solace.SDTMapContainer
 */
export interface SDTMapContainer {

  /**
   * Get the list of keys in this map, in unspecified order.
   */
  getKeys(): string[];

  /**
   * Return the SDTField with the given key.
   */
  getField(key: string): SDTField | undefined;

  /**
   * Delete an SDTField with the given key.
   */
  deleteField(key: string): void;

  /**
   * Adds a field to this map. If a key:value mapping already exists for this key, it is replaced.
   *
   * @throws {solace.OperationError} if value does not match type
   * @throws {solace.SDTUnsupportedValueError} if value is not in range supported by the platform/runtime
   */
  addField(key: string, type: SDTFieldType, value: any): void;
}

/**
 * Defines a Structured Data Type (SDT) stream container. A stream is an iterable collection of {@link SDTField}s.
 *
 * To create an instance of an <code>SDTStreamContainer</code>, call {@link SolaceObjectFactory.createSDTStreamContainer}.
 *
 * @see solace.SDTStreamContainer
 */
export interface SDTStreamContainer {

  /**
   * Returns true if the stream has at least one more {@link SDTField} at the current position.
   */
  hasNext(): boolean;

  /**
   * Returns the next field in the stream and advances the read pointer.
   * If the end of the stream is reached, it returns undefined.
   */
  getNext(): SDTField | undefined;

  /**
   * Rewinds the read pointer to the beginning of the stream. Normally when {@link hasNext}
   * returns `false`, a client application must call rewind() to reiterate over the stream's fields.
   * @throws {solace.OperationError} if the stream cannot be rewound.
   */
  rewind(): void;

  /**
   * Appends a SDTField to the stream.
   *
   * @throws {solace.OperationError} if value does not match type
   * @throws {solace.SDTUnsupportedValueError} if value is not in range supported by the platform/runtime
   */
  addField(type: SDTFieldType, value: any): void;
}

/**
 * Represents an enumeration of message dump formats. It controls the output of {@link Message#dump}.
 *
 * @see solace.MessageDumpFlag
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
