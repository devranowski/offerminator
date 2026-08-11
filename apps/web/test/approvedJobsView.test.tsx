import type { JobSortDto } from '@offerminator/api-contracts';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { hourlyJob, nullableJob } from './approvedJobsFixtures.js';
import { jobsRequests, mockApi, resolveCountryResponse, summaryRequests } from './mockApi.js';
import { renderApp } from './renderApp.js';

type CountryScenario = readonly [label: string, code: 'CA' | 'DE' | 'GB' | 'US', total: number];
type SortExpectation = readonly [sort: JobSortDto, label: string];

const countryScenarios: readonly CountryScenario[] = [
  ['Canada', 'CA', 2],
  ['Germany', 'DE', 0],
  ['United Kingdom', 'GB', 1],
  ['United States', 'US', 7],
];

const sortExpectations: readonly SortExpectation[] = [
  ['posting-date-desc', 'Newest first'],
  ['posting-date-asc', 'Oldest first'],
  ['salary-desc', 'Highest salary'],
  ['salary-asc', 'Lowest salary'],
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('approved jobs UI', () => {
  it('renders ten API-shaped jobs with accessible Cleared markers', async () => {
    mockApi();
    renderApp();

    const cards = await screen.findAllByRole('article');

    expect(cards).toHaveLength(10);
    expect(screen.getByRole('heading', { name: 'Customer Success Manager' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Growth Marketing Manager' })).toBeVisible();
    expect(screen.getByText('Date unavailable')).toBeVisible();
    expect(screen.getByText('GBP 85,000 / year')).toBeVisible();
    expect(screen.getByText('USD 106,250 equivalent')).toBeVisible();
    expect(screen.getByText('Remote · GB')).toBeVisible();
    expect(screen.getByText('Manchester, England')).toBeVisible();

    for (const card of cards) {
      const marker = within(card).getByText('Cleared');

      expect(marker).toBeVisible();
      expect(marker.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    }
  });

  it('renders explicit fallbacks for nullable DTO fields', async () => {
    mockApi({
      resolveJobs: () => ({
        items: [nullableJob],
        total: 1,
      }),
    });
    renderApp();

    expect(await screen.findByRole('heading', { name: 'Null Fields Specialist' })).toBeVisible();
    expect(screen.getByText('Company unavailable')).toBeVisible();
    expect(screen.getByText('Location unavailable')).toBeVisible();
    expect(screen.getByText('Date unavailable')).toBeVisible();
  });

  it('renders source hourly pay and the precomputed annualized amount', async () => {
    mockApi({
      resolveJobs: () => ({
        items: [hourlyJob],
        total: 1,
      }),
    });
    renderApp();

    const card = await screen.findByRole('article', { name: 'Hourly Systems Engineer' });

    expect(card).toHaveTextContent('USD 60 / hour');
    expect(within(card).getByText('USD 124,800 annualized')).toBeVisible();
  });

  it('shows the exact static loading state without an accessible spinner', () => {
    mockApi({ mode: 'pending' });
    renderApp();

    expect(screen.getByRole('heading', { name: 'Scanning job feed...' })).toBeVisible();
    expect(screen.getByText('Approved jobs are being loaded.')).toBeVisible();
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('shows the exact error state and Retry issues a new jobs request', async () => {
    const api = mockApi({ failJobsRequests: 1 });
    const user = userEvent.setup();
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Connection to Skynet lost.' }),
    ).toBeVisible();
    expect(screen.getByText('Approved jobs could not be loaded.')).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Scanning job feed...' })).not.toBeInTheDocument();
    expect(screen.queryByText('Approved jobs are being loaded.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByRole('heading', { name: 'Customer Success Manager' })).toBeVisible();
    expect(jobsRequests(api.requests)).toHaveLength(2);
  });

  it('keeps jobs available and retries an independent summary failure', async () => {
    const api = mockApi({ failSummaryRequests: 1 });
    const user = userEvent.setup();
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Ingestion summary unavailable.' }),
    ).toBeVisible();
    expect(screen.getByText('Check the Cleared feed status below.')).toBeVisible();
    expect(await screen.findByRole('heading', { name: 'Customer Success Manager' })).toBeVisible();
    expect(jobsRequests(api.requests)).toHaveLength(1);
    expect(summaryRequests(api.requests)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: 'Retry summary' }));

    expect(
      await screen.findByRole('heading', {
        name: 'Judgment Day: 10 cleared, 10 terminated.',
      }),
    ).toBeVisible();
    expect(summaryRequests(api.requests)).toHaveLength(2);
    expect(jobsRequests(api.requests)).toHaveLength(1);
  });

  it('reports summary and Cleared feed failures independently when both requests fail', async () => {
    mockApi({ failJobsRequests: 1, failSummaryRequests: 1 });
    renderApp();

    expect(
      await screen.findByRole('heading', { name: 'Ingestion summary unavailable.' }),
    ).toBeVisible();
    expect(screen.getByText('Check the Cleared feed status below.')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Connection to Skynet lost.' })).toBeVisible();
    expect(screen.getByText('Approved jobs could not be loaded.')).toBeVisible();
  });

  it('shows Germany as an empty result and Clear filters restores defaults and the full list', async () => {
    const api = mockApi({ resolveJobs: resolveCountryResponse });
    const user = userEvent.setup();
    renderApp();

    await screen.findAllByRole('article');

    const titleInput = screen.getByRole('searchbox', { name: 'Job title' });
    const countrySelect = screen.getByRole('combobox', { name: 'Country' });
    const sortSelect = screen.getByRole('combobox', { name: 'Sort' });

    await user.type(titleInput, 'Engineer');
    await user.selectOptions(countrySelect, 'DE');
    await user.selectOptions(sortSelect, 'salary-asc');

    expect(
      await screen.findByRole('heading', { name: 'No fate but what you filter.' }),
    ).toBeVisible();
    expect(screen.getByText('No cleared jobs match the current filters.')).toBeVisible();
    expect(countrySelect).toHaveDisplayValue('Germany');

    await user.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(titleInput).toHaveValue('');
    expect(countrySelect).toHaveValue('');
    expect(sortSelect).toHaveValue('posting-date-desc');
    expect(titleInput).toHaveFocus();
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(10));
    expect(jobsRequests(api.requests)).toContain('/api/jobs?sort=posting-date-desc');
  });

  it('uses title, a country code and every sort value in relative jobs requests', async () => {
    const api = mockApi();
    const user = userEvent.setup();
    renderApp();

    await screen.findAllByRole('article');

    await user.type(screen.getByRole('searchbox', { name: 'Job title' }), '  Engineer  ');

    expect(screen.getByRole('heading', { name: 'Scanning cleared records...' })).toBeVisible();
    expect(screen.queryAllByRole('article')).toHaveLength(0);
    expect(screen.queryByText('10 matching jobs')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(jobsRequests(api.requests)).toContain('/api/jobs?q=Engineer&sort=posting-date-desc');
    });

    await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), 'GB');

    const sortSelect = screen.getByRole('combobox', { name: 'Sort' });
    for (const [sort, label] of sortExpectations) {
      await user.selectOptions(sortSelect, sort);

      await waitFor(() => {
        expect(jobsRequests(api.requests)).toContain(
          `/api/jobs?q=Engineer&country=GB&sort=${sort}`,
        );
      });
      expect(sortSelect).toHaveDisplayValue(label);
    }

    for (const url of jobsRequests(api.requests)) {
      expect(url).toMatch(/^\/api\/jobs\?/);
      expect(url).not.toContain('http://');
      expect(url).not.toContain('United Kingdom');
    }
  });

  it.each(countryScenarios)(
    'sends %s as country=%s and renders %i records',
    async (label, code, total) => {
      const api = mockApi({ resolveJobs: resolveCountryResponse });
      const user = userEvent.setup();
      renderApp();

      await screen.findAllByRole('article');
      await user.selectOptions(screen.getByRole('combobox', { name: 'Country' }), code);

      await waitFor(() => expect(screen.queryAllByRole('article')).toHaveLength(total));
      expect(jobsRequests(api.requests)).toContain(
        `/api/jobs?country=${code}&sort=posting-date-desc`,
      );
      expect(screen.getByRole('combobox', { name: 'Country' })).toHaveDisplayValue(label);
    },
  );
});
