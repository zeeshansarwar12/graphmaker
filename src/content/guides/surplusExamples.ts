export const surplusGuideRoute = '/guides/consumer-and-producer-surplus/';
export const surplusImageDirectory = '/images/guides/';
export const surplusGuideSlug = 'consumer-and-producer-surplus';
export const surplusSocialImage = `${surplusImageDirectory}${surplusGuideSlug}-social.png`;
export const surplusSocialAlt = 'GraphMaker guide to consumer and producer surplus with shaded supply and demand areas';

interface Market {
  demandIntercept: number;
  demandSlope: number;
  supplyIntercept: number;
  supplySlope: number;
  ceiling: number;
  floor: number;
  tax: number;
}

function model(market: Market) {
  const { demandIntercept: a, demandSlope: b, supplyIntercept: c, supplySlope: d, ceiling, floor, tax } = market;
  const demandPrice = (quantity: number) => (a - quantity) / b;
  const supplyPrice = (quantity: number) => (quantity - c) / d;
  const demandQuantity = (price: number) => a - b * price;
  const supplyQuantity = (price: number) => c + d * price;
  const price = (a - c) / (b + d);
  const quantity = demandQuantity(price);
  const area = (width: number, first: number, last: number) => width * (first + last) / 2;

  function outcome(traded: number, buyer: number, seller: number) {
    const consumerHeights = [demandPrice(0) - buyer, demandPrice(traded) - buyer] as const;
    const producerHeights = [seller - supplyPrice(0), seller - supplyPrice(traded)] as const;
    const consumer = area(traded, ...consumerHeights);
    const producer = area(traded, ...producerHeights);
    const revenue = traded * (buyer - seller);
    const loss = area(quantity - traded, demandPrice(traded) - supplyPrice(traded), 0);
    return {
      traded, buyer, seller, consumerHeights, producerHeights,
      demandAtTraded: demandPrice(traded), supplyAtTraded: supplyPrice(traded),
      missingTrades: quantity - traded, lossHeight: demandPrice(traded) - supplyPrice(traded),
      consumer, producer, revenue, loss, total: consumer + producer + revenue,
    };
  }

  const seller = (a - c - b * tax) / (b + d);
  const buyer = seller + tax;
  return {
    market, price, quantity, demandPrice, supplyPrice, demandQuantity, supplyQuantity,
    ceilingDemand: demandQuantity(ceiling), ceilingSupply: supplyQuantity(ceiling),
    floorDemand: demandQuantity(floor), floorSupply: supplyQuantity(floor),
    shortage: demandQuantity(ceiling) - supplyQuantity(ceiling),
    excess: supplyQuantity(floor) - demandQuantity(floor),
    taxBurden: { buyer: buyer - price, seller: price - seller, buyerShare: (buyer - price) / tax, sellerShare: (price - seller) / tax },
    equilibrium: outcome(quantity, price, price),
    ceiling: outcome(supplyQuantity(ceiling), ceiling, ceiling),
    floor: outcome(demandQuantity(floor), floor, floor),
    tax: outcome(supplyQuantity(seller), buyer, seller),
  };
}

export const exampleMarket = model({ demandIntercept: 120, demandSlope: 3, supplyIntercept: -10, supplySlope: 2, ceiling: 20, floor: 32, tax: 10 });
export const practiceMarket = model({ demandIntercept: 96, demandSlope: 2, supplyIntercept: -24, supplySlope: 4, ceiling: 16, floor: 24, tax: 6 });
export const scenarioNames = { equilibrium: 'Competitive equilibrium', ceiling: 'Price ceiling', floor: 'Price floor', tax: 'Per-unit tax' } as const;
export type SurplusScenario = keyof typeof scenarioNames;
export const surplusScenarios = Object.keys(scenarioNames) as SurplusScenario[];
export const surplusChart = (name: SurplusScenario | 'practice') => `${surplusImageDirectory}${surplusGuideSlug}-${name}.svg`;
export const formatSurplus = (value: number) => String(Number(value.toFixed(3))).replaceAll('-', '−');
