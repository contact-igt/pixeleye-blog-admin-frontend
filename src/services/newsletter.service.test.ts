import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  apiRequestFile: vi.fn()
}));

vi.mock('./api-client', () => ({
  apiRequest: mocks.apiRequest,
  apiRequestFile: mocks.apiRequestFile
}));

import { newsletterService } from './newsletter.service';

describe('newsletter subscriber export service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.apiRequestFile.mockResolvedValue({
      blob: new Blob(['Email']),
      contentType: 'text/csv',
      contentDisposition: null
    });
  });

  it('propagates trimmed export filters without pagination', async () => {
    await newsletterService.exportSubscribers({
      search: '  retina  ',
      status: 'pending',
      source: '  website  '
    });

    expect(mocks.apiRequestFile).toHaveBeenCalledWith(
      '/admin/newsletter/subscribers/export?search=retina&status=pending&source=website',
      {
        method: 'GET',
        headers: { Accept: 'text/csv' }
      }
    );
  });

  it('omits empty filters from the export query string', async () => {
    await newsletterService.exportSubscribers({ search: ' ', source: ' ' });

    expect(mocks.apiRequestFile).toHaveBeenCalledWith(
      '/admin/newsletter/subscribers/export',
      {
        method: 'GET',
        headers: { Accept: 'text/csv' }
      }
    );
  });
});
