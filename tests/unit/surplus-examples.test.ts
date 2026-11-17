import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exampleMarket, practiceMarket, surplusChart, surplusScenarios, surplusSocialImage } from '../../src/content/guides/surplusExamples';

describe('surplus guide calculations', () => {
  it.each([
    { name: 'tickets', model: exampleMarket, price: 26, quantity: 42, shortage: 30, excess: 30, buyer: 4, seller: 6, buyerShare: 0.4, sellerShare: 0.6 },
    { name: 'notebooks', model: practiceMarket, price: 20, quantity: 56, shortage: 24, excess: 24, buyer: 4, seller: 2, buyerShare: 2 / 3, sellerShare: 1 / 3 },
  ])('balances the $name market and computes policy quantities and incidence', ({ model, price: expectedPrice, quantity: expectedQuantity, shortage: expectedShortage, excess: expectedExcess, ...expected }) => {
    const { price, quantity, shortage, excess, taxBurden } = model;
    expect([price, quantity, shortage, excess]).toEqual([expectedPrice, expectedQuantity, expectedShortage, expectedExcess]);
    expect(taxBurden).toEqual({ buyer: expected.buyer, seller: expected.seller, buyerShare: expected.buyerShare, sellerShare: expected.sellerShare });
    expect(model.demandQuantity(price)).toBe(model.supplyQuantity(price));
    expect(model.demandQuantity(model.tax.buyer)).toBe(model.tax.traded);
    expect(model.supplyQuantity(model.tax.seller)).toBe(model.tax.traded);
    expect(model.tax.buyer - model.tax.seller).toBe(model.market.tax);
  });

  it.each([
    { name: 'tickets', model: exampleMarket, rows: [[42,26,26,294,441,0,0,735],[30,20,20,450,225,0,60,675],[24,32,32,96,504,0,135,600],[30,30,20,150,225,300,60,675]] },
    { name: 'notebooks', model: practiceMarket, rows: [[56,20,20,784,392,0,0,1176],[40,16,16,880,200,0,96,1080],[48,24,24,576,576,0,24,1152],[48,24,18,576,288,288,24,1152]] },
  ])('computes every area and conserves welfare in the $name market', ({ model, rows }) => {
    surplusScenarios.forEach((scenario, index) => {
      const { traded, buyer, seller, consumer, producer, revenue, loss, total } = model[scenario];
      expect([traded, buyer, seller, consumer, producer, revenue, loss, total]).toEqual(rows[index]);
      expect(consumer + producer + revenue + loss).toBeCloseTo(model.equilibrium.total);
    });
  });
});

describe('surplus guide assets', () => {
  it.each([...surplusScenarios, 'practice'] as const)('includes the labeled %s chart', (scenario) => {
    const svg = readFileSync(new URL(`../../public${surplusChart(scenario)}`, import.meta.url), 'utf8');
    expect(svg).toContain('viewBox="0 0 800 500"');
    for (const label of ['Quantity', 'Price', 'Supply', 'Demand', 'Consumer surplus', 'Producer surplus']) {
      expect(svg).toContain(`>${label}</text>`);
    }
    expect(svg.includes('>Deadweight loss</text>')).toBe(['ceiling', 'floor', 'tax'].includes(scenario));
    expect(svg.includes('>Tax revenue</text>')).toBe(scenario === 'tax');
  });

  it('includes a 1200 by 630 PNG social card', () => {
    const png = readFileSync(new URL(`../../public${surplusSocialImage}`, import.meta.url));
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
