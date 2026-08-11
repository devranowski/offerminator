import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fullRejectedJobsResponse } from './rejectedJobsFixtures.js';
import { mockApi, rejectedJobsRequests } from './mockApi.js';
import { renderApp } from './renderApp.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('rejected jobs UI', () => {
  it('renders all ten API-shaped records with every reason and read-only markers', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: /Terminated/u }));

    const panel = screen.getByRole('tabpanel', { name: /Terminated/u });
    const cards = await within(panel).findAllByRole('article');

    expect(cards).toHaveLength(10);
    expect(panel).toHaveTextContent('10 terminated records');

    for (const job of fullRejectedJobsResponse.items) {
      const title = job.title ?? 'Untitled job';
      const card = within(panel).getByRole('article', { name: title });

      expect(within(card).getByText(`${job.source}:${String(job.sourceIndex)}`)).toBeVisible();
      expect(within(card).getByText('Terminated')).toBeVisible();
      expect(within(card).getByText('Termination reasons')).toBeVisible();

      for (const reason of job.reasons) {
        expect(within(card).getByText(reason.code)).toBeVisible();
        expect(within(card).getByText(reason.message)).toBeVisible();
      }
    }

    for (const card of cards) {
      const marker = within(card).getByText('Terminated');

      expect(marker.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }

    expect(within(panel).queryByRole('button')).not.toBeInTheDocument();
    expect(
      within(panel).queryByText(/approve|restore|edit|delete|retry record/iu),
    ).not.toBeInTheDocument();
  });

  it('shows OpsFlex with its four exact reasons and a native raw-record disclosure', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: /Terminated/u }));

    const card = await screen.findByRole('article', { name: 'Untitled job' });
    const reasonItems = within(card).getAllByRole('listitem');

    expect(within(card).getByText('OpsFlex')).toBeVisible();
    expect(within(card).getByText('jobs.json:19')).toBeVisible();
    expect(reasonItems).toHaveLength(4);
    expect(within(card).getByText('TITLE_MISSING')).toBeVisible();
    expect(within(card).getByText('EMPLOYMENT_TYPE_NOT_FULL_TIME')).toBeVisible();
    expect(within(card).getByText('HOURLY_SALARY_BELOW_THRESHOLD')).toBeVisible();
    expect(within(card).getByText('STAFFING_FIRM')).toBeVisible();

    const summary = within(card).getByText('Show raw record');
    const details = summary.closest('details');

    expect(summary.tagName).toBe('SUMMARY');
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute('open');

    await user.click(summary);

    expect(details).toHaveAttribute('open');
    expect(within(card).getByText('Hide raw record')).toBeVisible();
    expect(within(card).getByLabelText('Raw record for Untitled job')).toHaveTextContent(
      '"company": "OpsFlex"',
    );

    await user.click(within(card).getByText('Hide raw record'));

    expect(details).not.toHaveAttribute('open');
    expect(within(card).getByText('Show raw record')).toBeVisible();
  });

  it('implements automatic tabs with roving focus and all required navigation keys', async () => {
    mockApi();
    const user = userEvent.setup();
    renderApp();

    const clearedTab = screen.getByRole('tab', { name: /Cleared/u });
    const terminatedTab = screen.getByRole('tab', { name: /Terminated/u });

    expect(clearedTab).toHaveAttribute('aria-selected', 'true');
    expect(clearedTab).toHaveAttribute('aria-controls', 'cleared-panel');
    expect(clearedTab).toHaveAttribute('tabindex', '0');
    expect(terminatedTab).toHaveAttribute('aria-selected', 'false');
    expect(terminatedTab).toHaveAttribute('aria-controls', 'terminated-panel');
    expect(terminatedTab).toHaveAttribute('tabindex', '-1');

    clearedTab.focus();
    await user.keyboard('{End}');
    expect(terminatedTab).toHaveFocus();
    expect(terminatedTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: /Terminated/u })).toBeVisible();

    await user.keyboard('{Home}');
    expect(clearedTab).toHaveFocus();
    expect(clearedTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(terminatedTab).toHaveFocus();
    expect(terminatedTab).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowRight}');
    expect(clearedTab).toHaveFocus();
    expect(clearedTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows a terminated loading state while its endpoint is pending', async () => {
    mockApi({ mode: 'pending' });
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: /Terminated/u }));

    expect(screen.getByRole('heading', { name: 'Scanning job feed...' })).toBeVisible();
    expect(screen.getByText('Rejected jobs are being loaded.')).toBeVisible();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows an endpoint-specific error and Retry issues a new rejected-jobs request', async () => {
    const api = mockApi({ failRejectedJobsRequests: 1 });
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: /Terminated/u }));

    expect(
      await screen.findByRole('heading', { name: 'Connection to Skynet lost.' }),
    ).toBeVisible();
    expect(screen.getByText('Rejected jobs could not be loaded.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Untitled job' })).toBeVisible();
    expect(rejectedJobsRequests(api.requests)).toHaveLength(2);
  });

  it('keeps the summary error copy accurate for the active Terminated panel', async () => {
    mockApi({ failSummaryRequests: 1 });
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('tab', { name: /Terminated/u }));

    expect(
      await screen.findByRole('heading', { name: 'Ingestion summary unavailable.' }),
    ).toBeVisible();
    expect(screen.getByText('Terminated jobs are still available below.')).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Untitled job' })).toBeVisible();
  });
});
