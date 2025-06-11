/*
 * Copyright (c) 2018-2023 Swiss Federal Railways
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 */

import {DestroyRef, inject} from '@angular/core';
import {noop} from 'rxjs';

/**
 * Implementation of {@link DestroyRef} that can be manually disposed.
 *
 * Binds to the {@link DestroyRef} of the current injection context if constructed inside an injection context.
 */
export class ɵDestroyRef implements DestroyRef {

  private _callbacks = new Set<() => void>();
  private _destroyed = false;

  constructor() {
    inject(DestroyRef, {optional: true})?.onDestroy(() => this.destroy());
  }

  public onDestroy(callback: () => void): () => void {
    if (this._destroyed) {
      callback();
      return noop;
    }

    this._callbacks.add(callback);
    return () => this._callbacks.delete(callback);
  }

  public destroy(): void {
    this._callbacks.forEach(callback => callback());
    this._callbacks.clear();
    this._destroyed = true;
  }

  public get destroyed(): boolean {
    return this._destroyed;
  }
}
