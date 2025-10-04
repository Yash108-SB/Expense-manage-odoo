import axios from 'axios';

// Cache for exchange rates (valid for 1 hour)
const rateCache = new Map();
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

export const convertCurrency = async (amount, fromCurrency, toCurrency) => {
  try {
    // If same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return { convertedAmount: amount, rate: 1 };
    }

    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const cached = rateCache.get(cacheKey);

    // Check cache
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return {
        convertedAmount: amount * cached.rate,
        rate: cached.rate
      };
    }

    // Fetch fresh rates
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
    );

    const rate = response.data.rates[toCurrency];

    if (!rate) {
      throw new Error(`Exchange rate not found for ${fromCurrency} to ${toCurrency}`);
    }

    // Update cache
    rateCache.set(cacheKey, {
      rate,
      timestamp: Date.now()
    });

    return {
      convertedAmount: amount * rate,
      rate
    };
  } catch (error) {
    console.error('Currency conversion error:', error.message);
    throw new Error('Failed to convert currency');
  }
};

export const getExchangeRates = async (baseCurrency) => {
  try {
    const response = await axios.get(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );
    return response.data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    throw new Error('Failed to fetch exchange rates');
  }
};
