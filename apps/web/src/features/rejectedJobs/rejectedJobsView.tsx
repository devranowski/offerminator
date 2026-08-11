import { useQuery } from '@tanstack/react-query';

import { fetchRejectedJobs, rejectedJobsQueryKey } from '../../api/jobsApi.js';
import { RejectedJobCard } from './rejectedJobCard.js';
import styles from './rejectedJobsView.module.css';

interface RejectedJobsErrorStateProps {
  readonly onRetry: () => void;
}

function RejectedJobsView() {
  const jobsQuery = useQuery({
    queryKey: rejectedJobsQueryKey(),
    queryFn: ({ signal }) => fetchRejectedJobs(signal),
  });

  function retry(): void {
    void jobsQuery.refetch();
  }

  if (jobsQuery.isError) {
    return <RejectedJobsErrorState onRetry={retry} />;
  }

  if (jobsQuery.isPending) {
    return <RejectedJobsLoadingState />;
  }

  return (
    <>
      <div className={styles.resultsHeading} aria-live="polite">
        <p>
          <strong>{jobsQuery.data.total}</strong>{' '}
          {jobsQuery.data.total === 1 ? 'terminated record' : 'terminated records'}
        </p>
        <span>REJECTION FEED / READ ONLY</span>
      </div>
      <ul className={styles.rejectionList}>
        {jobsQuery.data.items.map((job, index) => (
          <li key={job.id}>
            <RejectedJobCard job={job} index={index} />
          </li>
        ))}
      </ul>
    </>
  );
}

function RejectedJobsLoadingState() {
  return (
    <section className={styles.statePanel} aria-live="polite" aria-busy="true">
      <p className={styles.stateCode}>REJECTION FEED / IN PROGRESS</p>
      <h2>Scanning job feed...</h2>
      <p>Rejected jobs are being loaded.</p>
      <div className={styles.staticPlaceholders} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </section>
  );
}

function RejectedJobsErrorState({ onRetry }: RejectedJobsErrorStateProps) {
  return (
    <section className={`${styles.statePanel} ${styles.errorPanel}`} role="alert">
      <p className={styles.stateCode}>REJECTION FEED / INTERRUPTED</p>
      <h2>Connection to Skynet lost.</h2>
      <p>Rejected jobs could not be loaded.</p>
      <button type="button" onClick={onRetry}>
        Retry
      </button>
    </section>
  );
}

export { RejectedJobsView };
