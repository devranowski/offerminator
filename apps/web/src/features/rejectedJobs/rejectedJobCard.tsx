import { useState, type SyntheticEvent } from 'react';
import type { RejectedJobDto } from '@offerminator/api-contracts';

import styles from './rejectedJobCard.module.css';

interface RejectedJobCardProps {
  readonly index: number;
  readonly job: RejectedJobDto;
}

interface RawDisclosureProps {
  readonly label: string;
  readonly raw: unknown;
}

function RejectedJobCard({ index, job }: RejectedJobCardProps) {
  const title = job.title ?? 'Untitled job';

  return (
    <article className={styles.rejectionCard} aria-labelledby={`${job.id}-title`}>
      <span className={styles.recordNumber} aria-hidden="true">
        {String(index + 1).padStart(2, '0')}
      </span>
      <header className={styles.rejectionHeader}>
        <div>
          <h2 id={`${job.id}-title`} className={styles.jobTitle}>
            {title}
          </h2>
          <p className={styles.jobCompany}>{job.company ?? 'Company unavailable'}</p>
          <code className={styles.sourceReference}>
            {job.source}:{job.sourceIndex}
          </code>
        </div>
        <span className={styles.statusMarker}>
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="m4 4 8 8M12 4l-8 8" />
          </svg>
          Terminated
        </span>
      </header>

      <section className={styles.reasons} aria-labelledby={`${job.id}-reasons`}>
        <h3 id={`${job.id}-reasons`}>Termination reasons</h3>
        <ul className={styles.reasonList}>
          {job.reasons.map((reason, reasonIndex) => (
            <li className={styles.reasonItem} key={`${reason.code}:${reason.field}:${reasonIndex}`}>
              <code className={styles.reasonCode}>{reason.code}</code>
              <span className={styles.reasonMessage}>{reason.message}</span>
            </li>
          ))}
        </ul>
      </section>

      <RawDisclosure label={title} raw={job.raw} />
    </article>
  );
}

function RawDisclosure({ label, raw }: RawDisclosureProps) {
  const [isOpen, setIsOpen] = useState(false);

  function handleToggle(event: SyntheticEvent<HTMLDetailsElement>): void {
    setIsOpen(event.currentTarget.open);
  }

  return (
    <details className={styles.rawDisclosure} onToggle={handleToggle}>
      <summary>{isOpen ? 'Hide raw record' : 'Show raw record'}</summary>
      <pre className={styles.rawJson} tabIndex={0} aria-label={`Raw record for ${label}`}>
        <code>{JSON.stringify(raw, null, 2)}</code>
      </pre>
    </details>
  );
}

export { RejectedJobCard };
