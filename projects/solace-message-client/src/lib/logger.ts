import {EnvironmentProviders, inject, Injectable, makeEnvironmentProviders, Type} from '@angular/core';
import {LogLevel} from 'solclientjs';

/**
 * Logger used by the Angular Solace Message Client.
 *
 * The default log level can be changed as follows:
 * - Change the log level programmatically by providing it under the DI token {@link LogLevel}:
 *   `{provide: LogLevel, useValue: LogLevel.DEBUG}`
 * - Change the log level at runtime via session storage by adding the following entry and then reloading the application:
 *   key:   `angular-solace-message-client#loglevel`
 *   value: `debug` // supported values are: trace | debug | info | warn | error | fatal
 */
@Injectable()
export class Logger {

  public readonly logLevel = this.readLogLevelFromSessionStorage(inject(LogLevel as unknown as Type<LogLevel>));

  public debug(...data: any[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console.debug(...this.addLogPrefix(data));
    }
  }

  public info(...data: any[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console.info(...this.addLogPrefix(data));
    }
  }

  public warn(...data: any[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console.warn(...this.addLogPrefix(data));
    }
  }

  public error(...data: any[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console.error(...this.addLogPrefix(data));
    }
  }

  private addLogPrefix(args: unknown[]): unknown[] {
    return [`[SolaceMessageClient] ${args[0]}`, ...args.slice(1)]; // eslint-disable-line @typescript-eslint/restrict-template-expressions
  }

  private readLogLevelFromSessionStorage(defaultLogLevel: LogLevel): LogLevel {
    const level = sessionStorage.getItem('angular-solace-message-client#loglevel');
    switch (level) {
      case 'trace':
        return LogLevel.TRACE;
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      case 'fatal':
        return LogLevel.FATAL;
      default:
        return defaultLogLevel;
    }
  }
}

/**
 * Registers a set of DI providers to enable logging in the Angular Solace Message Client.
 */
export function provideLogger(logLevel: LogLevel): EnvironmentProviders {
  return makeEnvironmentProviders([
    Logger,
    // Provide inherited 'LogLevel' or provide default LogLevel otherwise.
    {provide: LogLevel, useFactory: () => inject(LogLevel as unknown as Type<LogLevel>, {skipSelf: true, optional: true}) ?? logLevel},
  ]);
}
