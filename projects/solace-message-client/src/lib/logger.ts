import {EnvironmentProviders, Injectable, makeEnvironmentProviders} from '@angular/core';
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

  constructor(public readonly logLevel: LogLevel) {
    this.logLevel = this.readLogLevelFromSessionStorage(logLevel);
  }

  public debug(...data: any[]): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      console?.debug?.(...this.addLogPrefix(data));
    }
  }

  public info(...data: any[]): void {
    if (this.logLevel >= LogLevel.INFO) {
      console?.info?.(...this.addLogPrefix(data));
    }
  }

  public warn(...data: any[]): void {
    if (this.logLevel >= LogLevel.WARN) {
      console?.warn?.(...this.addLogPrefix(data));
    }
  }

  public error(...data: any[]): void {
    if (this.logLevel >= LogLevel.ERROR) {
      console?.error?.(...this.addLogPrefix(data));
    }
  }

  private addLogPrefix(args: any[]): any[] {
    return [`[SolaceMessageClient] ${args[0]}`, ...args.slice(1)];
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
export function provideLogger(): EnvironmentProviders {
  return makeEnvironmentProviders([
    Logger,
    {provide: LogLevel, useValue: LogLevel.WARN},
  ]);
}
