// features/platform/useCurrency.ts
// Detects user's currency from their timezone setting,
// fetches live exchange rate from exchangerate-api (free tier),
// and returns a formatter + converted amount helper.
'use client';

import { useEffect, useState } from 'react';
import { useSettings } from '@/features/settings';

/* ── Timezone → currency map ── */
const TIMEZONE_CURRENCY: Record<string, string> = {
  'America/Jamaica':           'JMD',
  'America/New_York':          'USD',
  'America/Chicago':           'USD',
  'America/Denver':            'USD',
  'America/Los_Angeles':       'USD',
  'America/Toronto':           'CAD',
  'America/Vancouver':         'CAD',
  'America/Barbados':          'BBD',
  'America/Trinidad':          'TTD',
  'America/Port_of_Spain':     'TTD',
  'America/Guyana':            'GYD',
  'America/Belize':            'BZD',
  'America/Nassau':            'BSD',
  'America/St_Kitts':          'XCD',
  'America/Antigua':           'XCD',
  'America/Dominica':          'XCD',
  'America/St_Vincent':        'XCD',
  'America/Grenada':           'XCD',
  'America/St_Lucia':          'XCD',
  'America/Anguilla':          'XCD',
  'America/Montserrat':        'XCD',
  'America/Cayman':            'KYD',
  'America/Grand_Turk':        'USD',
  'Europe/London':             'GBP',
  'Europe/Paris':              'EUR',
  'Europe/Berlin':             'EUR',
  'Asia/Tokyo':                'JPY',
  'Asia/Shanghai':             'CNY',
  'Asia/Kolkata':              'INR',
  'Australia/Sydney':          'AUD',
};

const BASE_CURRENCY = 'JMD'; // all rates stored in JMD on the backend

const CURRENCY_SYMBOLS: Record<string, string> = {
  JMD: 'J$', USD: '$', GBP: '£', EUR: '€', CAD: 'CA$',
  TTD: 'TT$', BBD: 'Bds$', GYD: 'G$', XCD: 'EC$', KYD: 'KY$',
  BSD: 'B$', BZD: 'BZ$', JPY: '¥', CNY: '¥', INR: '₹', AUD: 'A$',
};

interface CurrencyState {
  currency:    string;
  symbol:      string;
  rate:        number;   // 1 JMD = X target currency
  loading:     boolean;
  error:       boolean;
}

const rateCache: Record<string, { rate: number; at: number }> = {};
const CACHE_TTL = 1000 * 60 * 30; // 30 min

async function fetchRate(target: string): Promise<number> {
  if (target === BASE_CURRENCY) return 1;

  const cached = rateCache[target];
  if (cached && Date.now() - cached.at < CACHE_TTL) return cached.rate;

  try {
    // Free tier — no API key needed for basic pairs
    const res  = await fetch(`https://open.er-api.com/v6/latest/${BASE_CURRENCY}`);
    const data = await res.json();
    const rate = data?.rates?.[target] ?? null;
    if (rate === null) throw new Error('Rate not found');
    rateCache[target] = { rate, at: Date.now() };
    return rate;
  } catch {
    // Fallback: hardcoded approximate rates (updated occasionally)
    const FALLBACK: Record<string, number> = {
      USD: 0.0064, GBP: 0.0050, EUR: 0.0059, CAD: 0.0087,
      TTD: 0.043,  BBD: 0.013,  GYD: 1.34,   XCD: 0.017,
    };
    return FALLBACK[target] ?? 1;
  }
}

export function useCurrency() {
  const { settings } = useSettings();

  const timezone = settings?.timezone ?? 'America/Jamaica';
  const currency = TIMEZONE_CURRENCY[timezone] ?? 'JMD';
  const symbol   = CURRENCY_SYMBOLS[currency] ?? currency;

  const [state, setState] = useState<CurrencyState>({
    currency,
    symbol,
    rate:    1,
    loading: currency !== BASE_CURRENCY,
    error:   false,
  });

  useEffect(() => {
    if (currency === BASE_CURRENCY) {
      setState({ currency, symbol, rate: 1, loading: false, error: false });
      return;
    }

    setState(s => ({ ...s, loading: true, error: false }));
    fetchRate(currency).then(rate => {
      setState({ currency, symbol, rate, loading: false, error: false });
    }).catch(() => {
      setState(s => ({ ...s, loading: false, error: true }));
    });
  }, [currency]);

  /**
   * Convert a JMD amount to the user's local currency and format it.
   * @param jmdAmount — the raw amount in JMD
   * @param opts.short — if true, abbreviate large numbers (e.g. J$2.5k)
   */
  function format(jmdAmount: number, opts?: { short?: boolean }): string {
    const converted = jmdAmount * state.rate;

    if (opts?.short && converted >= 1000) {
      return `${state.symbol}${(converted / 1000).toFixed(1)}k`;
    }

    return `${state.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: currency === 'JPY' ? 0 : 2,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    })}`;
  }

  /** Raw converted number */
  function convert(jmdAmount: number): number {
    return jmdAmount * state.rate;
  }

  return {
    currency:      state.currency,
    symbol:        state.symbol,
    rate:          state.rate,
    loading:       state.loading,
    error:         state.error,
    isJMD:         state.currency === BASE_CURRENCY,
    format,
    convert,
  };
}
