import { describe, expect, test } from 'vitest';
import { diffDays, hourBucket, isWithin, parseIso, windowBounds } from '#shared/utils/time.js';

describe('parseIso', () => {
  test('valid iso -> Date', () => {
    expect(parseIso('2026-06-01T00:00:00.000Z')).toBeInstanceOf(Date);
  });

  test('invalid -> null', () => {
    expect(parseIso('not-a-date')).toBeNull();
  });
});

describe('diffDays', () => {
  test('whole day difference', () => {
    expect(diffDays('2026-06-01T00:00:00.000Z', '2026-06-04T00:00:00.000Z')).toBe(3);
  });

  test('invalid -> 0', () => {
    expect(diffDays('bad', '2026-06-04T00:00:00.000Z')).toBe(0);
  });
});

describe('hourBucket', () => {
  test('zeroes minutes/seconds', () => {
    expect(hourBucket('2026-06-01T13:45:09.000Z')).toBe('2026-06-01T13:00:00.000Z');
  });

  test('invalid passthrough', () => {
    expect(hourBucket('bad')).toBe('bad');
  });
});

describe('windowBounds', () => {
  test('recent and previous equal-length windows', () => {
    const now = new Date('2026-06-14T00:00:00.000Z');
    const { recentStart, previousStart } = windowBounds(now, 7, 7);
    expect(recentStart.toISOString()).toBe('2026-06-07T00:00:00.000Z');
    expect(previousStart.toISOString()).toBe('2026-05-31T00:00:00.000Z');
  });
});

describe('isWithin', () => {
  test('inside window', () => {
    const start = new Date('2026-06-07T00:00:00.000Z');
    const now = new Date('2026-06-14T00:00:00.000Z');
    expect(isWithin('2026-06-10T00:00:00.000Z', start, now)).toBe(true);
  });

  test('outside window', () => {
    const start = new Date('2026-06-07T00:00:00.000Z');
    const now = new Date('2026-06-14T00:00:00.000Z');
    expect(isWithin('2026-06-01T00:00:00.000Z', start, now)).toBe(false);
  });
});
