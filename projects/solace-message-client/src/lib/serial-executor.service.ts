import { Subject } from 'rxjs';
import { catchError, mergeMap, takeUntil } from 'rxjs/operators';

export type Task<T> = () => Promise<T>;

/**
 * Allows the mutual exclusive execution of tasks.
 *
 * Scheduled tasks are executed sequentially, one at a time, until all tasks have executed.
 * A task completed execution when its Promise resolved or rejected.
 */
export class SerialExecutor {

  private _destroy$ = new Subject<void>();
  private _tasks$ = new Subject<Task<any>>();

  constructor() {
    this._tasks$
      .pipe(
        mergeMap(task => task(), 1), // serialize execution
        catchError((error, caught) => {
          console.error('[SolaceMessageClient] Unexpected: ', error);
          return caught;
        }),
        takeUntil(this._destroy$),
      )
      .subscribe();
  }

  /**
   * Schedules the given task for serial execution.
   * The task will be executed after all previously scheduled tasks have finished execution.
   *
   * @return Promise that resolves to the task's return value when it finished execution, or
   *         that rejects when the taks's Promise rejects.
   */
  public scheduleSerial<T>(task: Task<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this._tasks$.next(() => task().then(resolve).catch(reject));
    });
  }

  public destroy(): void {
    this._destroy$.next();
  }
}
