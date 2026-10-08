import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCurrency, formatCurrencyForTenant, formatMoney, formatNumber, getCurrencySymbol } from '../main/countries';

test('formatCurrency: en-US / USD', () => {
  assert.equal(formatCurrency(1234.5, 'USD', 'en-US'), '$1,234.50');
});

test('formatCurrency: en-IN / INR has rupees symbol and grouping', () => {
  const out = formatCurrency(1234.5, 'INR', 'en-IN');
  assert.match(out, /1,234\.50/);
  assert.match(out, /₹/);
});

test('formatCurrency: es-AR / ARS uses comma decimal', () => {
  const out = formatCurrency(1234.5, 'ARS', 'es-AR');
  assert.match(out, /1\.234,50/);
});

test('formatCurrency: zero amount still formats', () => {
  assert.equal(formatCurrency(0, 'USD', 'en-US'), '$0.00');
});

test('formatCurrency: empty currency falls back to fixed', () => {
  assert.equal(formatCurrency(1234.5, '', 'en-US'), '1234.50');
});

test('formatCurrencyForTenant: IN tenant uses en-IN locale', () => {
  const out = formatCurrencyForTenant(1234.5, 'IN', 'INR');
  assert.match(out, /1,234\.50/);
  assert.match(out, /₹/);
});

test('formatCurrencyForTenant: AR tenant uses es-AR locale', () => {
  const out = formatCurrencyForTenant(1234.5, 'AR', 'ARS');
  assert.match(out, /1\.234,50/);
});

test('formatCurrencyForTenant: US tenant uses en-US locale', () => {
  assert.equal(formatCurrencyForTenant(1234.5, 'US', 'USD'), '$1,234.50');
});

test('formatCurrencyForTenant: unknown country falls back to en-US', () => {
  assert.equal(formatCurrencyForTenant(7, 'ZZ', 'USD'), '$7.00');
});

test('formatCurrencyForTenant: missing country defaults to IN', () => {
  const out = formatCurrencyForTenant(7, undefined, 'INR');
  assert.match(out, /7\.00/);
  assert.match(out, /₹/);
});

// The formatters are built once per locale and options and then reused: a
// screen of prices used to build one per price. The text must not change.
test('cached formatters: the text matches a freshly built formatter, call after call', () => {
  const fresh = (locale: string, currency: string) => new Intl.NumberFormat(locale, {
    style: 'currency', currency, currencyDisplay: 'narrowSymbol',
  }).format(1234.5);
  for (let call = 0; call < 3; call += 1) {
    assert.equal(formatCurrencyForTenant(1234.5, 'IT', 'EUR'), fresh('it-IT', 'EUR'));
    assert.equal(formatCurrency(1234.5, 'USD', 'en-US'), fresh('en-US', 'USD'));
    assert.equal(formatCurrency(1234.5, 'INR', 'en-IN'), fresh('en-IN', 'INR'));
  }
});

test('cached formatters: an unknown currency falls back the same way every time', () => {
  assert.equal(formatCurrency(5, 'NOT-A-CODE', 'en-US'), 'NOT-A-CODE 5.00');
  assert.equal(formatCurrency(5, 'NOT-A-CODE', 'en-US'), 'NOT-A-CODE 5.00');
});

test('cached formatters: digits preference keeps its own formatter', () => {
  const persian = formatMoney(1234, 'IRR', 'fa-IR');
  const latin = formatMoney(1234, 'IRR', 'fa-IR', { digits: 'latin' });
  assert.notEqual(persian, latin);
  assert.match(latin, /1,234|1٬234/);
  assert.equal(formatMoney(1234, 'IRR', 'fa-IR'), persian);
  assert.equal(formatMoney(1234, 'IRR', 'fa-IR', { digits: 'latin' }), latin);
  assert.equal(formatNumber(1234.5, 'fa-IR', 'latn'), formatNumber(1234.5, 'fa-IR', 'latn'));
  assert.notEqual(formatNumber(1234.5, 'fa-IR'), formatNumber(1234.5, 'fa-IR', 'latn'));
});

test('cached formatters: the currency symbol is read from the same formatter', () => {
  assert.equal(getCurrencySymbol('EUR', 'it-IT'), '€');
  assert.equal(getCurrencySymbol('EUR', 'it-IT'), '€');
  assert.equal(getCurrencySymbol('NOT-A-CODE'), 'NOT-A-CODE');
});
