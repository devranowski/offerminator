import { useEffect, useRef, useState, type RefObject } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { JobSortDto } from '@offerminator/api-contracts';

import type { ApprovedJobsQuery, CountryFilter } from '../../api/jobsApi.js';
import { approvedJobsQueryKey, fetchApprovedJobs } from '../../api/jobsApi.js';
import { ApprovedJobCard } from './approvedJobCard.js';
import styles from './approvedJobsView.module.css';

interface FiltersProps {
  readonly country: CountryFilter;
  readonly sort: JobSortDto;
  readonly titleInputRef: RefObject<HTMLInputElement | null>;
  readonly titleQuery: string;
  readonly onCountryChange: (country: CountryFilter) => void;
  readonly onSortChange: (sort: JobSortDto) => void;
  readonly onTitleChange: (title: string) => void;
}

interface ApprovedJobsErrorStateProps {
  readonly onRetry: () => void;
}

interface EmptyStateProps {
  readonly onClearFilters: () => void;
}

interface ResultsHeadingProps {
  readonly isUpdating: boolean;
  readonly showUpdatingIndicator: boolean;
  readonly total: number;
}

const DEFAULT_SORT: JobSortDto = 'posting-date-desc';
const SEARCH_DEBOUNCE_MS = 300;

function ApprovedJobsView() {
  const [titleQuery, setTitleQuery] = useState('');
  const [debouncedTitleQuery, setDebouncedTitleQuery] = useState('');
  const [country, setCountry] = useState<CountryFilter>('');
  const [sort, setSort] = useState<JobSortDto>(DEFAULT_SORT);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedTitleQuery(titleQuery.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [titleQuery]);

  const query: ApprovedJobsQuery = {
    q: debouncedTitleQuery,
    country,
    sort,
  };

  const jobsQuery = useQuery({
    queryKey: approvedJobsQueryKey(query),
    queryFn: ({ signal }) => fetchApprovedJobs(query, signal),
    placeholderData: keepPreviousData,
  });

  const isTitleDebouncing = titleQuery.trim() !== debouncedTitleQuery;
  const isUpdatingResults = isTitleDebouncing || jobsQuery.isPlaceholderData;

  function clearFilters(): void {
    setTitleQuery('');
    setDebouncedTitleQuery('');
    setCountry('');
    setSort(DEFAULT_SORT);
    titleInputRef.current?.focus();
  }

  function retry(): void {
    void jobsQuery.refetch();
  }

  if (jobsQuery.isError) {
    return <ApprovedJobsErrorState onRetry={retry} />;
  }

  if (jobsQuery.isPending) {
    return <ApprovedJobsLoadingState />;
  }

  const jobs = jobsQuery.data.items;
  const isEmpty = jobsQuery.data.total === 0;
  const settledResults = isEmpty ? (
    <EmptyState onClearFilters={clearFilters} />
  ) : (
    <ul className={styles.jobList}>
      {jobs.map((job, index) => (
        <li key={job.id}>
          <ApprovedJobCard job={job} index={index} />
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <Filters
        country={country}
        sort={sort}
        titleInputRef={titleInputRef}
        titleQuery={titleQuery}
        onCountryChange={setCountry}
        onSortChange={setSort}
        onTitleChange={setTitleQuery}
      />
      <ResultsHeading
        isUpdating={isUpdatingResults}
        showUpdatingIndicator={isTitleDebouncing}
        total={jobsQuery.data.total}
      />
      <section aria-label="Approved jobs results" aria-busy={isUpdatingResults}>
        {settledResults}
      </section>
    </>
  );
}

function ResultsHeading({ isUpdating, showUpdatingIndicator, total }: ResultsHeadingProps) {
  return (
    <div className={styles.resultsHeading}>
      <p role="status" aria-live="polite" aria-atomic="true">
        <strong>{total}</strong> {total === 1 ? 'matching job' : 'matching jobs'}
      </p>
      <span
        className={styles.updatingIndicator}
        data-visible={showUpdatingIndicator}
        aria-hidden="true"
      >
        Updating results...
      </span>
      <span className={styles.recordsLabel}>Cleared records</span>
      <span className={styles.visuallyHidden} aria-live="polite" aria-atomic="true">
        {isUpdating ? 'Updating matching jobs' : ''}
      </span>
    </div>
  );
}

function Filters({
  country,
  sort,
  titleInputRef,
  titleQuery,
  onCountryChange,
  onSortChange,
  onTitleChange,
}: FiltersProps) {
  return (
    <section className={styles.filters} aria-labelledby="filters-title">
      <h2 id="filters-title" className={styles.visuallyHidden}>
        Filter cleared jobs
      </h2>
      <div className={styles.filterGrid}>
        <div className={styles.field}>
          <label htmlFor="job-title">Job title</label>
          <input
            id="job-title"
            ref={titleInputRef}
            type="search"
            placeholder="Search by title"
            value={titleQuery}
            onChange={(event) => onTitleChange(event.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="country">Country</label>
          <select
            id="country"
            value={country}
            onChange={(event) => onCountryChange(toCountryFilter(event.target.value))}
          >
            <option value="">All countries</option>
            <option value="CA">Canada</option>
            <option value="DE">Germany</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
          </select>
        </div>
        <div className={styles.field}>
          <label htmlFor="sort">Sort</label>
          <select
            id="sort"
            value={sort}
            onChange={(event) => onSortChange(toJobSort(event.target.value))}
          >
            <option value="posting-date-desc">Newest first</option>
            <option value="posting-date-asc">Oldest first</option>
            <option value="salary-desc">Highest salary</option>
            <option value="salary-asc">Lowest salary</option>
          </select>
        </div>
      </div>
    </section>
  );
}

function ApprovedJobsLoadingState() {
  return (
    <section className={styles.statePanel} aria-live="polite" aria-busy="true">
      <p className={styles.stateCode}>FEED CONNECTION / IN PROGRESS</p>
      <h2>Scanning job feed...</h2>
      <p>Approved jobs are being loaded.</p>
      <div className={styles.staticPlaceholders} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function ApprovedJobsErrorState({ onRetry }: ApprovedJobsErrorStateProps) {
  return (
    <section className={`${styles.statePanel} ${styles.errorPanel}`} role="alert">
      <p className={styles.stateCode}>FEED CONNECTION / INTERRUPTED</p>
      <h2>Connection to Skynet lost.</h2>
      <p>Approved jobs could not be loaded.</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </section>
  );
}

function EmptyState({ onClearFilters }: EmptyStateProps) {
  return (
    <section className={styles.emptyState}>
      <p className={styles.stateCode}>FILTER RESULT / 0</p>
      <h2>No fate but what you filter.</h2>
      <p>No cleared jobs match the current filters.</p>
      <button type="button" onClick={onClearFilters}>
        Clear filters
      </button>
    </section>
  );
}

function toCountryFilter(value: string): CountryFilter {
  if (value === '' || value === 'CA' || value === 'DE' || value === 'GB' || value === 'US') {
    return value;
  }

  throw new Error(`Unexpected country filter: ${value}`);
}

function toJobSort(value: string): JobSortDto {
  if (
    value === 'posting-date-desc' ||
    value === 'posting-date-asc' ||
    value === 'salary-desc' ||
    value === 'salary-asc'
  ) {
    return value;
  }

  throw new Error(`Unexpected job sort: ${value}`);
}

export { ApprovedJobsView };
