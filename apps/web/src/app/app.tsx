import { useQuery } from '@tanstack/react-query';

import { fetchIngestionSummary, ingestionSummaryQueryKey } from '../api/jobsApi.js';
import { ApprovedJobsView } from '../features/approvedJobs/approvedJobsView.js';
import type { IngestionSummaryState } from './appShell.js';
import { AppShell } from './appShell.js';

function App() {
  const summaryQuery = useQuery({
    queryKey: ingestionSummaryQueryKey(),
    queryFn: ({ signal }) => fetchIngestionSummary(signal),
    staleTime: Number.POSITIVE_INFINITY,
  });

  function retrySummary(): void {
    void summaryQuery.refetch();
  }

  let summaryState: IngestionSummaryState;
  if (summaryQuery.isPending) {
    summaryState = { status: 'loading' };
  } else if (summaryQuery.isError) {
    summaryState = { status: 'error', onRetry: retrySummary };
  } else {
    summaryState = { status: 'ready', summary: summaryQuery.data };
  }

  return (
    <AppShell summaryState={summaryState}>
      <ApprovedJobsView />
    </AppShell>
  );
}

export { App };
