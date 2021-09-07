import {SerialExecutor} from './serial-executor.service';
import {noop} from 'rxjs';

describe('SerialExecutor', () => {

  it('should execute tasks sequentially', async () => {
    const serialExecutor = new SerialExecutor();
    const capture: string[] = [];

    const task1 = serialExecutor.scheduleSerial(async () => {
      capture.push('task-1 (a)');
      await sleep(500);
      capture.push('task-1 (b)');
    });
    const task2 = serialExecutor.scheduleSerial(async () => {
      capture.push('task-2 (a)');
      await sleep(50);
      capture.push('task-2 (b)');
    });
    const task3 = serialExecutor.scheduleSerial(async () => {
      capture.push('task-3');
    });
    const task4 = serialExecutor.scheduleSerial(async () => {
      capture.push('task-4 (a)');
      await sleep(25);
      capture.push('task-4 (b)');
    });

    // Wait until all tasks completed.
    await Promise.all([task1, task2, task3, task4]);

    expect(capture).toEqual([
      'task-1 (a)',
      'task-1 (b)',
      'task-2 (a)',
      'task-2 (b)',
      'task-3',
      'task-4 (a)',
      'task-4 (b)',
    ]);
  });

  it('should not terminate the executor when a task rejects', async () => {
    const serialExecutor = new SerialExecutor();
    const capture: string[] = [];

    const task1 = serialExecutor.scheduleSerial(() => {
      capture.push('task-1');
      return Promise.resolve('task-1 (success)');
    });
    const task2 = serialExecutor.scheduleSerial(() => {
      capture.push('task-2');
      return Promise.reject('task-2 (failed)');
    });
    const task3 = serialExecutor.scheduleSerial(() => {
      capture.push('task-3');
      return Promise.resolve('task-3 (success)');
    });

    // Wait unitl all tasks completed.
    await Promise.all([task1, task2, task3]).catch(noop);

    expect(capture).toEqual([
      'task-1',
      'task-2',
      'task-3',
    ]);

    await expectAsync(task1).toBeResolvedTo('task-1 (success)');
    await expectAsync(task2).toBeRejectedWith('task-2 (failed)');
    await expectAsync(task3).toBeResolvedTo('task-3 (success)');
  });

  it('should resolve to the task\'s value', async () => {
    const serialExecutor = new SerialExecutor();

    const task1 = serialExecutor.scheduleSerial(() => Promise.resolve('task-1 (success)'));
    const task2 = serialExecutor.scheduleSerial(() => Promise.reject('task-2 (failed)'));
    const task3 = serialExecutor.scheduleSerial(() => Promise.resolve('task-3 (success)'));

    await expectAsync(task1).toBeResolvedTo('task-1 (success)');
    await expectAsync(task2).toBeRejectedWith('task-2 (failed)');
    await expectAsync(task3).toBeResolvedTo('task-3 (success)');
  });
});

async function sleep(millis: number): Promise<void> {
  await new Promise<void>(resolve => {
    setTimeout(() => resolve(), millis);
  });
}
