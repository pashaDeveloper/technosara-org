const countries = require('../data/countries.json');

const countryCodes = countries.map(country => country.code);
const countriesByCode = new Map(countries.map(country => [country.code, country]));

function getCountry(code) {
  if (typeof code !== 'string') return null;
  return countriesByCode.get(code.trim().toUpperCase()) || null;
}

module.exports = { countries, countryCodes, getCountry };
