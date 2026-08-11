import { useId } from 'react';
import type { JobDto } from '@offerminator/api-contracts';

import styles from './approvedJobCard.module.css';

interface ApprovedJobCardProps {
  readonly index: number;
  readonly job: JobDto;
}

interface FormattedLocation {
  readonly primary: string;
  readonly secondary: string | null;
}

const moneyFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function ApprovedJobCard({ index, job }: ApprovedJobCardProps) {
  const titleId = useId();
  const location = formatLocation(job.location);
  const salaryPeriod = job.salary.period === 'annual' ? 'year' : 'hour';
  const showUsdEquivalent = job.salary.currency !== 'USD';

  return (
    <article className={styles.jobCard} aria-labelledby={titleId}>
      <span className={styles.recordNumber} aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <header className={styles.jobHeader}>
        <div>
          <h2 id={titleId} className={styles.jobTitle}>
            {job.title}
          </h2>
          <p className={styles.jobCompany}>{job.company ?? 'Company unavailable'}</p>
        </div>
        <span className={styles.statusMarker}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m3 8 3 3 7-7" />
          </svg>
          Cleared
        </span>
      </header>

      <dl className={styles.jobMeta}>
        <div>
          <dt>Location</dt>
          <dd>
            {location.primary}
            {location.secondary === null ? null : <small>{location.secondary}</small>}
          </dd>
        </div>
        <div>
          <dt>Salary</dt>
          <dd>
            {job.salary.currency} {moneyFormatter.format(job.salary.amount)} / {salaryPeriod}
            {showUsdEquivalent ? (
              <small>USD {moneyFormatter.format(job.salary.usdEquivalent)} equivalent</small>
            ) : null}
            {job.salary.period === 'hourly' ? (
              <small>USD {moneyFormatter.format(job.salary.annualizedUsd)} annualized</small>
            ) : null}
          </dd>
        </div>
        <div className={styles.jobDate}>
          <dt>Posting date</dt>
          <dd>
            {job.postingDate === null ? (
              <span className={styles.unavailable}>Date unavailable</span>
            ) : (
              <time dateTime={job.postingDate}>{formatDate(job.postingDate)}</time>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function formatLocation(location: JobDto['location']): FormattedLocation {
  const physicalLocation = [location.city, location.region].filter(
    (value): value is string => value !== null,
  );

  if (location.kind === 'remote') {
    return {
      primary: `Remote · ${location.country ?? 'Country unavailable'}`,
      secondary: physicalLocation.length === 0 ? null : physicalLocation.join(', '),
    };
  }

  const completeLocation = [...physicalLocation, location.country];
  const availableParts = completeLocation.filter((value): value is string => value !== null);

  return {
    primary: availableParts.length === 0 ? 'Location unavailable' : availableParts.join(', '),
    secondary: null,
  };
}

function formatDate(date: string): string {
  return dateFormatter.format(new Date(`${date}T00:00:00Z`));
}

export { ApprovedJobCard };
