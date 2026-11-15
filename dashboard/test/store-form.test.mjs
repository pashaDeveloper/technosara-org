import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeBody } from '../src/pages/stores/storeFormUtils.js';
import { definition, formValues } from '../src/pages/stores/definitions.js';

test('country selection survives edit and can be cleared', () => {
  const values = formValues(definition, { country_code: 'US' });
  assert.equal(storeBody(values).country_code, 'US');
  assert.equal(storeBody({ ...values, country_code: ' ir ' }).country_code, 'IR');
  assert.equal(storeBody({ ...values, country_code: '' }).country_code, null);
  assert.equal(storeBody(formValues(definition)).country_code, null);
});

test('store form keeps existing codes and capabilities and allows image removal', () => {
  const values = formValues(definition, { name: ' استیم ', name_en: ' Steam ', code: 'steam', image: 'https://example.com/old.png', supports_prices: true, is_active: false, api_base_url: 'https://api.example.com' });
  const body = storeBody({ ...values, image: '' });
  assert.equal(body.name_en, 'Steam');
  assert.equal(body.code, 'steam');
  assert.equal(body.is_active, false);
  assert.equal(body.supports_prices, true);
  assert.equal(body.image, '');
  assert.equal(body.api_base_url, 'https://api.example.com');
  assert.equal(Object.hasOwn(body, 'metadata'), false);
});
