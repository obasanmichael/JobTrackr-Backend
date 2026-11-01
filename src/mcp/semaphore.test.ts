import { Semaphore } from './semaphore';

describe('Semaphore', () => {
  it('never runs more than the permitted tasks at once and finishes them all', async () => {
    const semaphore = new Semaphore(3);
    let running = 0;
    let peak = 0;

    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        semaphore.run(async () => {
          running += 1;
          peak = Math.max(peak, running);
          await new Promise((resolve) => setTimeout(resolve, 5));
          running -= 1;
          return i;
        }),
      ),
    );

    expect(peak).toBe(3);
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('releases the permit when a task throws', async () => {
    const semaphore = new Semaphore(1);

    await expect(
      semaphore.run(() => Promise.reject(new Error('boom'))),
    ).rejects.toThrow('boom');
    await expect(semaphore.run(() => Promise.resolve('ok'))).resolves.toBe(
      'ok',
    );
  });
});
