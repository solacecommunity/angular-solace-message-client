import {Pipe, PipeTransform} from '@angular/core';

@Pipe({name: 'appStringifyMap'})
export class StringifyMapPipe implements PipeTransform {

  public transform(object: Map<string, any> | undefined | null): string | null {
    if (!object) {
      return null;
    }
    if (!(object instanceof Map)) {
      throw Error('[IllegalArgumentError] Object expected to be a Map.');
    }
    return Array.from(object)
      .sort(([key1], [key2]) => key1.localeCompare(key2))
      .map(([key, value]) => `{"${key}" => ${JSON.stringify(value)}}`)
      .join('\n')
      .trim();
  }
}
