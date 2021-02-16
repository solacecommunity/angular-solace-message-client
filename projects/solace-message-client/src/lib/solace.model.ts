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
   * of time set for {@link SessionProperties#reconnectRetryWaitInMsecs} before attempting
   * another connection. The next connection attempt may be to the same host,
   * see {@link SessionProperties#connectRetriesPerHost}.
   *
   * If an established connection fails, the reconnection is attempted with
   * {@link SessionProperties#reconnectRetries} retries instead.
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
   * {@link SessionProperties#connectRetriesPerHost} sets how many connection
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
   * of time set for {@link SessionProperties#reconnectRetryWaitInMsecs} before attempting
   * another connection. The next reconnect attempt may be to the same host,
   * see {@link SessionProperties#connectRetriesPerHost}.
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
   * See {@link solace.Session#sendRequest}.
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
   * Set to 'true' to have the API remember subscriptions and reapply them upon calling {@link solace.Session#connect} on a disconnected session.
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
   * request timeout for {@link solace.Session#subscribe},  {@link solace.Session#unsubscribe}, {@link solace.Session#updateProperty}.
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
 * property is {@link SolaceModel#authenticationScheme}.
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
   * @see {@link solace.SessionProperties#sslPfx}
   * @see {@link solace.SessionProperties#sslPfxPassword}
   * @see {@link solace.SessionProperties#sslPrivateKey}
   * @see {@link solace.SessionProperties#sslPrivateKeyPassword}
   * @see {@link solace.SessionProperties#sslCertificate}
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
   * in the profile, {@link solace.SolclientFactoryProperties#profile}, in the field {@link solace.FactoryProfile#guaranteedMessagingEnabled}.
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
