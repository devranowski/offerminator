import type { ReactNode } from 'react';
import type { IngestionSummaryDto } from '@offerminator/api-contracts';

import styles from './appShell.module.css';

interface AppShellProps {
  readonly children: ReactNode;
  readonly summaryState: IngestionSummaryState;
}

interface SummaryContentProps {
  readonly state: IngestionSummaryState;
}

interface LoadingIngestionSummaryState {
  readonly status: 'loading';
}

interface ErrorIngestionSummaryState {
  readonly status: 'error';
  readonly onRetry: () => void;
}

interface ReadyIngestionSummaryState {
  readonly status: 'ready';
  readonly summary: IngestionSummaryDto;
}

type IngestionSummaryState =
  LoadingIngestionSummaryState | ErrorIngestionSummaryState | ReadyIngestionSummaryState;

function AppShell({ children, summaryState }: AppShellProps) {
  const summary = summaryState.status === 'ready' ? summaryState.summary : undefined;
  const approved = summary?.approved ?? '—';
  const rejected = summary?.rejected ?? '—';

  return (
    <div className={styles.offerminator}>
      <div className={styles.appShell}>
        <header className={styles.siteHeader}>
          <div>
            <p className={styles.productName}>Offerminator</p>
            <p className={styles.tagline}>Come with me… if you want to get hired.</p>
          </div>
          <p className={styles.systemLabel}>CYBERDYNE / MODEL 101</p>
        </header>

        <section className={styles.statusOverview} aria-label="Job screening results">
          <div>
            <span className={styles.currentStatus} aria-current="page">
              Cleared <span aria-label={`${String(approved)} records`}>{approved}</span>
            </span>
            <span className={styles.futureStatus}>
              Terminated <span aria-label={`${String(rejected)} records`}>{rejected}</span>
            </span>
          </div>
        </section>

        <section className={styles.summaryStrip} aria-labelledby="summary-title">
          <span className={styles.summaryIndex} aria-hidden="true">
            {formatSummaryIndex(summaryState)}
          </span>
          <SummaryContent state={summaryState} />
        </section>

        <main className={styles.mainContent}>{children}</main>

        <footer className={styles.footer}>Cyberdyne Systems Model 101 — Job Screening Unit</footer>
      </div>
    </div>
  );
}

function formatSummaryIndex(state: IngestionSummaryState): string {
  if (state.status === 'error') {
    return '!/!';
  }

  if (state.status === 'loading') {
    return '—/—';
  }

  return `${state.summary.approved + state.summary.rejected}/${state.summary.totalRecords}`;
}

function SummaryContent({ state }: SummaryContentProps) {
  if (state.status === 'error') {
    return (
      <div role="alert">
        <h1 id="summary-title">Ingestion summary unavailable.</h1>
        <p>Cleared jobs are still available below.</p>
        <button className={styles.summaryRetry} type="button" onClick={state.onRetry}>
          Retry summary
        </button>
      </div>
    );
  }

  if (state.status === 'loading') {
    return (
      <div>
        <h1 id="summary-title">Judgment Day: evaluating records.</h1>
        <p>Automatically evaluated against six fixed eligibility rules.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 id="summary-title">
        Judgment Day: {state.summary.approved} cleared, {state.summary.rejected} terminated.
      </h1>
      <p>Automatically evaluated against six fixed eligibility rules.</p>
    </div>
  );
}

export type { IngestionSummaryState };
export { AppShell };
