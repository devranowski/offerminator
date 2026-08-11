import { useId, useState, type SyntheticEvent } from 'react';
import type { RawJobPreviewDto, RejectedJobDto } from '@offerminator/api-contracts';

import styles from './rejectedJobCard.module.css';

interface RejectedJobCardProps {
  readonly index: number;
  readonly job: RejectedJobDto;
}

interface RawDisclosureProps {
  readonly label: string;
  readonly raw: RawJobPreviewDto;
  readonly truncated: boolean;
}

function RejectedJobCard({ index, job }: RejectedJobCardProps) {
  const titleId = useId();
  const reasonsId = useId();
  const title = job.title ?? 'Untitled job';

  return (
    <article className={styles.rejectionCard} aria-labelledby={titleId}>
      <span className={styles.recordNumber} aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <header className={styles.rejectionHeader}>
        <div>
          <h2 id={titleId} className={styles.jobTitle}>
            {title}
          </h2>
          <p className={styles.jobCompany}>{job.company ?? 'Company unavailable'}</p>
          <code className={styles.sourceReference}>
            {job.sourceId}:{job.sourceIndex}
          </code>
        </div>
        <span className={styles.statusMarker}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
          Terminated
        </span>
      </header>

      <section className={styles.reasons} aria-labelledby={reasonsId}>
        <h3 id={reasonsId}>Termination reasons</h3>
        <ul className={styles.reasonList}>
          {job.reasons.map((reason, reasonIndex) => (
            <li className={styles.reasonItem} key={`${reason.code}:${reason.field}:${reasonIndex}`}>
              <code className={styles.reasonCode}>{reason.code}</code>
              <span className={styles.reasonMessage}>{reason.message}</span>
            </li>
          ))}
        </ul>
      </section>

      <RawDisclosure label={title} raw={job.raw} truncated={job.rawPreviewTruncated} />
    </article>
  );
}

function RawDisclosure({ label, raw, truncated }: RawDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>): void {
    setIsOpen(event.currentTarget.open);
  }

  return (
    <details className={styles.rawDisclosure} onToggle={handleToggle}>
      <summary>{isOpen ? 'Hide raw record' : 'Show raw record'}</summary>
      {isOpen ? (
        <>
          {truncated ? <p className={styles.rawNotice}>Raw record preview is truncated.</p> : null}
          <pre className={styles.rawJson} tabIndex={0} aria-label={`Raw record for ${label}`}>
            <code>{JSON.stringify(raw, null, 2)}</code>
          </pre>
        </>
      ) : null}
    </details>
  );
}

export { RejectedJobCard };
