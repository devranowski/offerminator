export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship' | 'unknown';

export type CompanyType = 'direct-employer' | 'consulting-agency' | 'staffing-firm' | 'unknown';

export type JobLanguage = 'english' | 'french' | 'other' | 'unknown';

export type ApprovedCompanyType = Extract<CompanyType, 'direct-employer' | 'consulting-agency'>;

export type ApprovedLanguage = Extract<JobLanguage, 'english' | 'french'>;
