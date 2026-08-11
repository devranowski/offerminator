import {
  ingestionSummaryResponseSchema,
  jobsResponseSchema,
  type IngestionSummaryDto,
  type JobsResponseDto,
  type JobSortDto,
} from '@offerminator/api-contracts';

type CountryFilter = '' | 'CA' | 'DE' | 'GB' | 'US';

interface ApprovedJobsQuery {
  readonly q: string;
  readonly country: CountryFilter;
  readonly sort: JobSortDto;
}

const JOBS_ENDPOINT = '/api/jobs';
const INGESTION_SUMMARY_ENDPOINT = '/api/ingestion-summary';

function buildJobsUrl(query: ApprovedJobsQuery): string {
  const parameters = new URLSearchParams();
  const title = query.q.trim();

  if (title !== '') {
    parameters.set('q', title);
  }

  if (query.country !== '') {
    parameters.set('country', query.country);
  }

  parameters.set('sort', query.sort);

  return `${JOBS_ENDPOINT}?${parameters.toString()}`;
}

async function fetchApprovedJobs(
  query: ApprovedJobsQuery,
  signal?: AbortSignal,
): Promise<JobsResponseDto> {
  const response = await fetch(buildJobsUrl(query), signal === undefined ? undefined : { signal });

  if (!response.ok) {
    throw new Error(`Approved jobs request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return jobsResponseSchema.parse(payload);
}

async function fetchIngestionSummary(signal?: AbortSignal): Promise<IngestionSummaryDto> {
  const response = await fetch(
    INGESTION_SUMMARY_ENDPOINT,
    signal === undefined ? undefined : { signal },
  );

  if (!response.ok) {
    throw new Error(`Ingestion summary request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();

  return ingestionSummaryResponseSchema.parse(payload);
}

function approvedJobsQueryKey(query: ApprovedJobsQuery) {
  return ['approvedJobs', query.q, query.country, query.sort] as const;
}

function ingestionSummaryQueryKey() {
  return ['ingestionSummary'] as const;
}

export type { ApprovedJobsQuery, CountryFilter };
export {
  approvedJobsQueryKey,
  buildJobsUrl,
  fetchApprovedJobs,
  fetchIngestionSummary,
  ingestionSummaryQueryKey,
};
