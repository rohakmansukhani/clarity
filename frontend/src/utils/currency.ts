export const formatIndianCurrencyDynamic = (value: number): string => {
    const absValue = Math.abs(value);

    if (absValue >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (absValue >= 100000) {
        return `₹${(value / 100000).toFixed(2)}L`;
    } else if (absValue >= 1000) {
        return `₹${(value / 1000).toFixed(2)}K`;
    } else {
        return `₹${value.toFixed(2)}`;
    }
};

export const formatIndianCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(value);
};
