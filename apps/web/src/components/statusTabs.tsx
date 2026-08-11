import { useRef, type KeyboardEvent } from 'react';

import styles from './statusTabs.module.css';

type StatusTab = 'cleared' | 'terminated';

interface StatusTabsProps {
  readonly activeTab: StatusTab;
  readonly approvedCount: number | '—';
  readonly rejectedCount: number | '—';
  readonly onTabChange: (tab: StatusTab) => void;
}

const tabs: readonly StatusTab[] = ['cleared', 'terminated'];

function StatusTabs({ activeTab, approvedCount, rejectedCount, onTabChange }: StatusTabsProps) {
  const tabRefs = useRef<Record<StatusTab, HTMLButtonElement | null>>({
    cleared: null,
    terminated: null,
  });

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    const currentIndex = tabs.indexOf(activeTab);
    let nextTab: StatusTab | undefined;

    if (event.key === 'ArrowRight') {
      nextTab = tabs[(currentIndex + 1) % tabs.length];
    } else if (event.key === 'ArrowLeft') {
      nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
    } else if (event.key === 'Home') {
      nextTab = tabs[0];
    } else if (event.key === 'End') {
      nextTab = tabs[tabs.length - 1];
    }

    if (nextTab !== undefined) {
      event.preventDefault();
      onTabChange(nextTab);
      tabRefs.current[nextTab]?.focus();
    }
  }

  return (
    <nav className={styles.navigation} aria-label="Job screening results">
      <div role="tablist" aria-label="Result status">
        <button
          id="cleared-tab"
          ref={(element) => {
            tabRefs.current.cleared = element;
          }}
          type="button"
          role="tab"
          aria-selected={activeTab === 'cleared'}
          aria-controls="cleared-panel"
          tabIndex={activeTab === 'cleared' ? 0 : -1}
          data-status="cleared"
          onClick={() => onTabChange('cleared')}
          onKeyDown={handleKeyDown}
        >
          Cleared
          <span aria-label={`${String(approvedCount)} records`}>{approvedCount}</span>
        </button>
        <button
          id="terminated-tab"
          ref={(element) => {
            tabRefs.current.terminated = element;
          }}
          type="button"
          role="tab"
          aria-selected={activeTab === 'terminated'}
          aria-controls="terminated-panel"
          tabIndex={activeTab === 'terminated' ? 0 : -1}
          data-status="terminated"
          onClick={() => onTabChange('terminated')}
          onKeyDown={handleKeyDown}
        >
          Terminated
          <span aria-label={`${String(rejectedCount)} records`}>{rejectedCount}</span>
        </button>
      </div>
    </nav>
  );
}

export type { StatusTab };
export { StatusTabs };
