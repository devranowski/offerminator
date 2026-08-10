import type { CountryCode } from './countryCode.js';
import type { ApprovedLanguage, JobLanguage } from './jobEnums.js';

function isApprovedLanguageForCountry(
  language: JobLanguage,
  country: CountryCode | null,
): language is ApprovedLanguage {
  return language === 'english' || (language === 'french' && country === 'CA');
}

export { isApprovedLanguageForCountry };
