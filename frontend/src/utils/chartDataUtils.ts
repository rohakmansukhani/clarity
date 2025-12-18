export const normalizeChartData = (historyResults: any[], stocks: string[]) => {
    if (!historyResults || historyResults.length === 0) return [];

    // Find the common date range
    const allDates = new Set<string>();
    historyResults.forEach(result => {
        if (result.data && Array.isArray(result.data)) {
            result.data.forEach((point: any) => {
                if (point.date) allDates.add(point.date);
            });
        }
    });

    const sortedDates = Array.from(allDates).sort();

    // Create a map of symbol -> date -> price
    const priceMap: Record<string, Record<string, number>> = {};
    historyResults.forEach(result => {
        if (result.data && Array.isArray(result.data)) {
            priceMap[result.symbol] = {};
            result.data.forEach((point: any) => {
                if (point.date && point.close) {
                    priceMap[result.symbol][point.date] = point.close;
                }
            });
        }
    });

    // Get starting prices for normalization
    const startPrices: Record<string, number> = {};
    stocks.forEach(symbol => {
        const firstDate = sortedDates.find(date => priceMap[symbol]?.[date]);
        if (firstDate) {
            startPrices[symbol] = priceMap[symbol][firstDate];
        }
    });

    // Normalize to percentage change from start (100 = start)
    return sortedDates.map(date => {
        const dataPoint: any = { date };
        stocks.forEach((symbol, idx) => {
            const price = priceMap[symbol]?.[date];
            const startPrice = startPrices[symbol];
            if (price && startPrice) {
                // Normalized percentage for chart display
                dataPoint[`stock${idx + 1}`] = Math.round((price / startPrice) * 100 * 100) / 100;
                // Actual price for tooltip
                dataPoint[`price${idx + 1}`] = price;
            }
        });
        return dataPoint;
    }).filter(point => Object.keys(point).length > 1); // Filter out dates with no data
};
