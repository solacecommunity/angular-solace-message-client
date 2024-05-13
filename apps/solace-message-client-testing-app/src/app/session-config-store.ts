import {SolaceMessageClientConfig} from '@solace-community/angular-solace-message-client';
import {promptForAccessToken} from './prompt-access-token.provider';

const SESSION_CONFIG_STORAGE_KEY = 'solace';

/**
 * Stores the session config in local storage.
 */
export class SessionConfigStore {

  private constructor() {
  }

  public static store(config: SolaceMessageClientConfig): void {
    const json = JSON.stringify(config, (key, value) => {
      if (key === 'accessToken' && value === promptForAccessToken) {
        return value.name;
      }
      return value;
    });
    localStorage.setItem(SESSION_CONFIG_STORAGE_KEY, json);
  }

  public static load(): SolaceMessageClientConfig | undefined {
    const config = localStorage.getItem(SESSION_CONFIG_STORAGE_KEY);
    if (!config) {
      return undefined;
    }

    return JSON.parse(config, (key, value) => {
      if (key === 'accessToken' && value === promptForAccessToken.name) {
        return promptForAccessToken;
      }
      return value;
    });
  }

  public static empty(): boolean {
    return localStorage.getItem(SESSION_CONFIG_STORAGE_KEY) === null;
  }

  public static clear(): void {
    localStorage.removeItem(SESSION_CONFIG_STORAGE_KEY);
  }
}
