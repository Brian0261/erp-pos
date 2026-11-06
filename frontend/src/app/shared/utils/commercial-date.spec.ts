import { commercialDateAt, formatCommercialDay, formatCommercialInstant, isCommercialDate } from './commercial-date';
describe('Commercial calendar', () => {
  it('rejects normalization of impossible dates and accepts a leap day', () => {
    for(const value of ['2032-02-30','2033-02-29','0000-01-01','2032-13-01','bad']) expect(isCommercialDate(value)).toBeFalse();
    expect(isCommercialDate('2032-02-29')).toBeTrue();expect(formatCommercialDay('2032-02-29')).toBe('29/02/2032');
  });
  it('uses the Lima calendar at midnight and year boundaries', () => {
    expect(commercialDateAt('2033-01-01T04:59:59.999Z')).toBe('2032-12-31');
    expect(commercialDateAt('2033-01-01T05:00:00Z')).toBe('2033-01-01');
    expect(formatCommercialInstant('2033-01-01T04:59:59Z')).toContain('31/12/2032');
    expect(formatCommercialInstant('bad')).toBe('No disponible');
  });
});
