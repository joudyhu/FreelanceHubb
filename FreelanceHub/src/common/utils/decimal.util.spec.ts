import { money } from './decimal.util';

describe('money', () => {
  it('rounds to two decimal places', () => {
    expect(money(10.235)).toBe(10.24);
  });
  it('rejects invalid values', () => {
    expect(() => money('not-money')).toThrow();
  });
});
