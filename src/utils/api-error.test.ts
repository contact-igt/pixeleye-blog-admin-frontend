import { describe, expect, it } from 'vitest';
import { getSafeApiErrorMessage } from './api-error';

describe('getSafeApiErrorMessage', () => {
  it('uses the safe backend reason from a fetch ApiClientError conflict', () => {
    expect(getSafeApiErrorMessage({
      name: 'ApiClientError',
      status: 409,
      message: 'Only paused Campaigns can be resumed.',
      data: { code: 'CAMPAIGN_INVALID_RESUME_STATUS' }
    })).toBe('Only paused Campaigns can be resumed.');
  });

  it('explains when resume is blocked by an unavailable Worker', () => {
    expect(getSafeApiErrorMessage({
      name: 'ApiClientError',
      status: 503,
      message: 'Newsletter Worker is unavailable.',
      data: { code: 'CAMPAIGN_WORKER_UNAVAILABLE' }
    })).toBe('Newsletter Worker is unavailable. Wait for it to become active and try again.');
  });

  it('does not expose unsafe server details', () => {
    expect(getSafeApiErrorMessage({
      name: 'ApiClientError',
      status: 409,
      message: 'SQL select password token'
    })).toBe('This action cannot be completed in the current status.');
  });
});
