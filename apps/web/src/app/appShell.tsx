import type { ReactNode } from 'react';
import type { IngestionSummaryDto } from '@offerminator/api-contracts';

import offerminatorMarkUrl from '../assets/offerminatorMark.svg';
import type { StatusTab } from '../components/statusTabs.js';
import { StatusTabs } from '../components/statusTabs.js';
import styles from './appShell.module.css';

interface AppShellProps {
  readonly activeTab: StatusTab;
  readonly clearedContent: ReactNode;
  readonly onTabChange: (tab: StatusTab) => void;
  readonly summaryState: IngestionSummaryState;
  readonly terminatedContent: ReactNode;
}

interface SummaryContentProps {
  readonly activeTab: StatusTab;
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

function AppShell({
  activeTab,
  clearedContent,
  onTabChange,
  summaryState,
  terminatedContent,
}: AppShellProps) {
  const summary = summaryState.status === 'ready' ? summaryState.summary : undefined;
  const approved = summary?.approved ?? '—';
  const rejected = summary?.rejected ?? '—';

  return (
    <div className={styles.offerminator} data-view={activeTab}>
      <div className={styles.appShell}>
        <header className={styles.siteHeader}>
          <div className={styles.brandLockup}>
            <img alt="" className={styles.brandMark} src={offerminatorMarkUrl} />
            <div className={styles.brandCopy}>
              <p className={styles.productName}>Offerminator</p>
              <p className={styles.tagline}>Come with me… if you want to get hired.</p>
            </div>
          </div>
          <p className={styles.systemLabel}>CYBERDYNE / MODEL 101</p>
        </header>

        <StatusTabs
          activeTab={activeTab}
          approvedCount={approved}
          rejectedCount={rejected}
          onTabChange={onTabChange}
        />

        <section className={styles.summaryStrip} aria-labelledby="summary-title">
          <span className={styles.summaryIndex} aria-hidden="true">
            {formatSummaryIndex(summaryState)}
          </span>
          <SummaryContent activeTab={activeTab} state={summaryState} />
        </section>

        <main className={styles.mainContent}>
          <section
            id="cleared-panel"
            role="tabpanel"
            aria-labelledby="cleared-tab"
            hidden={activeTab !== 'cleared'}
          >
            {clearedContent}
          </section>
          <section
            id="terminated-panel"
            role="tabpanel"
            aria-labelledby="terminated-tab"
            hidden={activeTab !== 'terminated'}
          >
            {terminatedContent}
          </section>
        </main>

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

function SummaryContent({ activeTab, state }: SummaryContentProps) {
  if (state.status === 'error') {
    return (
      <div role="alert">
        <h1 id="summary-title">Ingestion summary unavailable.</h1>
        <p>
          {activeTab === 'cleared'
            ? 'Check the Cleared feed status below.'
            : 'Check the Terminated feed status below.'}
        </p>
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
