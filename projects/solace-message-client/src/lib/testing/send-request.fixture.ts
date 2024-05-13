import {Message, RequestError, Session} from 'solclientjs';

/**
 * Fixture to simulate request-response communication.
 */
export class SendRequestFixture {

  private _onResponseCallback?: (session: Session, message: Message, userObject: object) => void;
  private _onErrorCallback?: (session: Session, error: RequestError, userObject: object) => void;

  public throwErrorOnSend = false;
  public requestTimeout: number | undefined;
  public requestMessage: Message | undefined;

  constructor(private _session: jasmine.SpyObj<Session>) {
    this._session.sendRequest.and.callFake((request, timeout, onResponseCallback, onErrorCallback) => {
      this._onResponseCallback = onResponseCallback;
      this._onErrorCallback = onErrorCallback;
      this.requestMessage = request;
      this.requestTimeout = timeout;
      if (this.throwErrorOnSend) {
        throw Error('Error while sending the request');
      }
    });
  }

  /**
   * Simulates the Solace message broker to send a response.
   */
  public async simulateReply(message: Message): Promise<void> {
    if (!this._onResponseCallback) {
      throw Error('[SpecError] No \'replyReceivedCBFunction\' registered');
    }

    this._onResponseCallback(this._session, message, undefined!);
  }

  /**
   * Simulates the Solace message broker to send an error.
   */
  public async simulateError(error: RequestError): Promise<void> {
    if (!this._onErrorCallback) {
      throw Error('[SpecError] No \'requestFailedCBFunction\' registered');
    }

    this._onErrorCallback(this._session, error, undefined!);
  }
}
