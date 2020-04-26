import { throttlePromise, debouncePromise } from './throttle-debounce';
import { delay } from './async';

describe('throttlePromise', () => {
  test('leading & trailing', async () => {
    let sentCount = 0;
    const fn = throttlePromise(
      100,
      () => {
        sentCount += 1;
      },
      { leading: true, trailing: true },
    );
    void fn();
    expect(sentCount).toEqual(1);
    void fn();
    void fn();
    void fn();
    void fn();
    expect(sentCount).toEqual(1);
    await delay(105);
    expect(sentCount).toEqual(2);
  });

  test('leading', async () => {
    let sentCount = 0;
    const fn = throttlePromise(
      100,
      () => {
        sentCount += 1;
      },
      { leading: true, trailing: false },
    );
    void fn();
    void fn();
    void fn();
    void fn();
    void fn();
    expect(sentCount).toEqual(1);
    await delay(105);
    expect(sentCount).toEqual(1);
    void fn();
    expect(sentCount).toEqual(2);
    await delay(105);
    expect(sentCount).toEqual(2);
  });

  test('trailing', async () => {
    let sentCount = 0;
    const fn = throttlePromise(
      100,
      () => {
        sentCount += 1;
      },
      { leading: false, trailing: true },
    );
    void fn();
    void fn();
    void fn();
    void fn();
    void fn();
    expect(sentCount).toEqual(0);
    await delay(105);
    expect(sentCount).toEqual(1);
    void fn();
    expect(sentCount).toEqual(1);
    await delay(105);
    expect(sentCount).toEqual(2);
  });
});

describe('debouncePromise', () => {
  test('debouncePromise', async () => {
    let sentCount = 0;
    const fn = debouncePromise(100, () => {
      sentCount += 1;
    });
    void fn();
    void fn();
    void fn();
    void fn();
    void fn();
    await delay(10);
    void fn();
    await delay(10);
    expect(sentCount).toEqual(0);
    await delay(95);
    expect(sentCount).toEqual(1);

    void fn();
    await delay(40);
    void fn();
    await delay(40);
    expect(sentCount).toEqual(1);
    await delay(65);
    expect(sentCount).toEqual(2);
  });
});
