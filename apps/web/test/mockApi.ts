import type { JobsResponseDto } from '@offerminator/api-contracts';
import { vi } from 'vitest';

import { fullJobsResponse, ingestionSummary, jobsByCountry } from './approvedJobsFixtures.js';

type TestFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type ApiMockOptions =
  | { readonly mode: 'pending' }
  | {
      readonly mode?: 'settled';
      readonly failJobsRequests?: number;
      readonly failSummaryRequests?: number;
      readonly resolveJobs?: (url: string) => JobsResponseDto;
    };

interface ApiMock {
  readonly requests: string[];
}

function mockApi(options: ApiMockOptions = {}): ApiMock {
  const requests: string[] = [];
  let jobsRequestCount = 0;
  let summaryRequestCount = 0;
  const fetchMock = vi.fn<TestFetch>(async (input) => {
    const url = requestUrl(input);
    requests.push(url);

    if (url === '/api/ingestion-summary') {
      summaryRequestCount += 1;

      if (options.mode === 'pending') {
        return pendingResponse();
      }

      if (summaryRequestCount <= (options.failSummaryRequests ?? 0)) {
        return jsonResponse({ message: 'unavailable' }, 500);
      }

      return jsonResponse(ingestionSummary);
    }

    if (url.startsWith('/api/jobs?')) {
      jobsRequestCount += 1;

      if (options.mode === 'pending') {
        return pendingResponse();
      }

      if (jobsRequestCount <= (options.failJobsRequests ?? 0)) {
        return jsonResponse({ message: 'unavailable' }, 500);
      }

      return jsonResponse(options.resolveJobs?.(url) ?? fullJobsResponse);
    }

    return jsonResponse({ message: `Unexpected request: ${url}` }, 404);
  });

  vi.stubGlobal('fetch', fetchMock);

  return { requests };
}

function resolveCountryResponse(url: string): JobsResponseDto {
  const country = new URL(url, 'https://offerminator.test').searchParams.get('country');

  if (country === 'CA' || country === 'DE' || country === 'GB' || country === 'US') {
    return jobsByCountry[country];
  }

  return fullJobsResponse;
}

function jobsRequests(requests: readonly string[]): string[] {
  return requests.filter((url) => url.startsWith('/api/jobs?'));
}

function summaryRequests(requests: readonly string[]): string[] {
  return requests.filter((url) => url === '/api/ingestion-summary');
}

function pendingResponse(): Promise<Response> {
  return new Promise<Response>(() => undefined);
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status,
  });
}

export { jobsRequests, mockApi, resolveCountryResponse, summaryRequests };
