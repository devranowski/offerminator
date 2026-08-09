import type {
  ApprovalDecision,
  ApprovedJob,
  ApprovedLocation,
  ApprovedSalary,
  CountryCode,
  CurrencyConversionResult,
  HourlySalary,
  InPersonJobLocation,
  IsoDate,
  JobLocation,
  NonEmptyString,
  NormalizationWarning,
  NormalizedJobCandidate,
  RejectedJob,
  RejectionReason,
  Salary,
  UnknownSalary,
  UnknownSalaryReason,
} from '../../src/models/index.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;

type Expect<Value extends true> = Value;

export type SalaryKindsContract = Expect<Equal<Salary['kind'], 'annual' | 'hourly' | 'unknown'>>;
export type UnknownSalaryReasonsContract = Expect<
  Equal<UnknownSalaryReason, 'missing' | 'invalid-value' | 'invalid-unit' | 'missing-currency'>
>;
export type ApprovedSalaryExcludesUnknownContract = Expect<
  Equal<Extract<ApprovedSalary, { kind: 'unknown' }>, never>
>;
export type ApprovedSalaryKindsContract = Expect<
  Equal<ApprovedSalary['kind'], 'annual' | 'hourly'>
>;
export type LocationKindsContract = Expect<
  Equal<JobLocation['kind'], 'remote' | 'in-person' | 'unknown'>
>;
export type UnknownLocationCityContract = Expect<
  Equal<Extract<JobLocation, { kind: 'unknown' }>['city'], null>
>;
export type ApprovedLocationExcludesUnknownContract = Expect<
  Equal<Extract<ApprovedLocation, { kind: 'unknown' }>, never>
>;
export type ApprovedInPersonCountryContract = Expect<
  Equal<Extract<ApprovedLocation, { kind: 'in-person' }>['country'], CountryCode & ('US' | 'CA')>
>;
export type ApprovedJobTitleContract = Expect<Equal<ApprovedJob['title'], NonEmptyString>>;
export type ApprovedJobEmploymentContract = Expect<
  Equal<ApprovedJob['employmentType'], 'full-time'>
>;
export type ApprovedJobCompanyContract = Expect<
  Equal<ApprovedJob['companyType'], 'direct-employer' | 'consulting-agency'>
>;
export type ApprovedJobLanguageContract = Expect<
  Equal<ApprovedJob['language'], 'english' | 'french'>
>;
export type ApprovedDecisionJobContract = Expect<
  Equal<Extract<ApprovalDecision, { status: 'approved' }>['job'], ApprovedJob>
>;
export type RejectedDecisionJobContract = Expect<
  Equal<Extract<ApprovalDecision, { status: 'rejected' }>['job'], NormalizedJobCandidate | null>
>;
export type RejectedDecisionReasonsContract = Expect<
  Equal<Extract<ApprovalDecision, { status: 'rejected' }>['reasons'], readonly RejectionReason[]>
>;
export type NormalizationWarningsContract = Expect<
  Equal<NormalizedJobCandidate['warnings'], readonly NormalizationWarning[]>
>;
export type RejectedJobReasonsContract = Expect<
  Equal<RejectedJob['reasons'], readonly RejectionReason[]>
>;
export type CurrencyResultKindsContract = Expect<
  Equal<CurrencyConversionResult['ok'], true | false>
>;
export type SuccessfulCurrencyResultContract = Expect<
  Equal<Extract<CurrencyConversionResult, { ok: true }>['usdCents'], number>
>;
export type FailedCurrencyReasonContract = Expect<
  Equal<Extract<CurrencyConversionResult, { ok: false }>['reason'], 'unsupported-currency'>
>;
export type FailedCurrencyCodeContract = Expect<
  Equal<Extract<CurrencyConversionResult, { ok: false }>['currency'], string>
>;

declare const nonEmptyString: NonEmptyString;
declare const isoDate: IsoDate;
declare const countryCode: CountryCode;
declare const usCountryCode: CountryCode & 'US';
declare const gbCountryCode: CountryCode & 'GB';
declare const deCountryCode: CountryCode & 'DE';

const plainString: string = nonEmptyString;
void plainString;

declare function acceptsNonEmptyString(value: NonEmptyString): void;
declare function acceptsIsoDate(value: IsoDate): void;
declare function acceptsCountryCode(value: CountryCode): void;

// @ts-expect-error A plain string has not passed the NonEmptyString factory.
acceptsNonEmptyString('Backend Engineer');
// @ts-expect-error Domain brands are not interchangeable.
acceptsNonEmptyString(isoDate);
// @ts-expect-error Domain brands are not interchangeable.
acceptsIsoDate(countryCode);
// @ts-expect-error Domain brands are not interchangeable.
acceptsCountryCode(nonEmptyString);

declare function acceptsHourlySource(value: HourlySalary['source']): void;

acceptsHourlySource('explicit');
// @ts-expect-error Flat-format salary is always annual.
acceptsHourlySource('implicit-flat-format');

const unknownSalary: UnknownSalary = {
  kind: 'unknown',
  reason: 'missing',
  raw: null,
};

declare function acceptsApprovedSalary(value: ApprovedSalary): void;

// @ts-expect-error An unknown salary cannot be approved.
acceptsApprovedSalary(unknownSalary);

const remoteLocation = {
  kind: 'remote',
  city: null,
  region: null,
  country: gbCountryCode,
  raw: 'Remote',
} satisfies ApprovedLocation;

const usInPersonLocation = {
  kind: 'in-person',
  city: 'Austin',
  region: 'TX',
  country: usCountryCode,
  raw: null,
} satisfies ApprovedLocation;

const deInPersonLocation: InPersonJobLocation = {
  kind: 'in-person',
  city: 'Berlin',
  region: null,
  country: deCountryCode,
  raw: null,
};

declare function acceptsApprovedLocation(value: ApprovedLocation): void;

acceptsApprovedLocation(remoteLocation);
acceptsApprovedLocation(usInPersonLocation);
// @ts-expect-error In-person approved jobs are restricted to US and CA.
acceptsApprovedLocation(deInPersonLocation);

declare function acceptsApprovedEmployment(value: ApprovedJob['employmentType']): void;
declare function acceptsApprovedCompany(value: ApprovedJob['companyType']): void;
declare function acceptsApprovedLanguage(value: ApprovedJob['language']): void;

acceptsApprovedEmployment('full-time');
// @ts-expect-error Approved jobs cannot be part-time.
acceptsApprovedEmployment('part-time');
acceptsApprovedCompany('direct-employer');
// @ts-expect-error Approved jobs cannot come from a staffing firm.
acceptsApprovedCompany('staffing-firm');
acceptsApprovedLanguage('english');
// @ts-expect-error Approved jobs cannot use an unsupported language.
acceptsApprovedLanguage('other');

const approvedJobLiteral = {
  id: 'jobs.json:0',
  title: nonEmptyString,
  description: null,
  company: 'Example',
  location: remoteLocation,
  salary: {
    kind: 'annual',
    amount: 120_000,
    currency: 'USD',
    source: 'explicit',
  },
  employmentType: 'full-time',
  companyType: 'direct-employer',
  language: 'english',
  postingDate: isoDate,
  salaryUsdCents: 12_000_000,
  annualizedSalaryUsdCents: 12_000_000,
} as const;

// @ts-expect-error ApprovedJob is nominal and can only be created by its future factory.
const approvedJob: ApprovedJob = approvedJobLiteral;
void approvedJob;

const incompleteCandidate = {
  id: 'jobs.json:19',
  source: 'jobs.json',
  sourceIndex: 19,
  title: null,
  description: null,
  company: 'OpsFlex',
  location: {
    kind: 'unknown',
    city: null,
    region: null,
    country: null,
    raw: null,
  },
  salary: unknownSalary,
  employmentType: 'part-time',
  companyType: 'staffing-firm',
  language: 'english',
  postingDate: null,
  warnings: [],
  raw: null,
} satisfies NormalizedJobCandidate;

void incompleteCandidate;
