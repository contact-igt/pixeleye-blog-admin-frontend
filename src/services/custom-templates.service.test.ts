import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  activateCustomTemplate,
  archiveCustomTemplate,
  createCustomTemplate,
  duplicateCustomTemplate,
  getCustomTemplate,
  listCustomTemplates,
  permanentlyDeleteCustomTemplate,
  restoreCustomTemplate,
  saveCustomTemplateVersion
} from './custom-templates.service';
import type { CustomTemplateLayoutConfigV1 } from '@/components/blogs/custom-template/custom-template.types';

function response(data: unknown) { return new Response(JSON.stringify({ success: true, data }), { status: 200, headers: { 'Content-Type': 'application/json' } }); }

function layout(): CustomTemplateLayoutConfigV1 {
  return {
    schemaVersion: 1,
    layoutId: 'service-layout',
    metadata: { name: 'Service Layout', description: 'Payload check.' },
    page: { contentWidth: 'full', background: 'white', spacing: 'normal', typography: 'editorial' },
    sections: [{
      id: 'section-main',
      layout: 'full_width',
      responsiveStrategy: 'stack_on_mobile',
      enabled: true,
      background: 'sky',
      slots: [{ id: 'slot-main', name: 'Main', components: [] }]
    }]
  };
}

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('custom-templates.service', () => {
  it('lists Custom Templates with query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [], pagination: {} }));
    vi.stubGlobal('fetch', fetchMock);
    await listCustomTemplates({ status: 'active', page: 2 });
    const url = String(fetchMock.mock.calls[0]![0]);
    expect(url).toContain('/custom-templates?');
    expect(url).toContain('status=active');
    expect(url).toContain('page=2');
  });

  it('creates a Custom Template via POST', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: '30' }));
    vi.stubGlobal('fetch', fetchMock);
    await createCustomTemplate({ name: 'X', layout_config_json: layout() });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/custom-templates');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.layout_config_json.sections[0].settings).toEqual({
      width: 'inherit',
      backgroundStyle: 'sky',
      paddingTop: 'inherit',
      paddingBottom: 'inherit'
    });
    expect(body.layout_config_json.sections[0]).not.toHaveProperty('background');
  });

  it('fetches Custom Template detail via GET', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: '30' }));
    vi.stubGlobal('fetch', fetchMock);
    await getCustomTemplate('30');
    expect(String(fetchMock.mock.calls[0]![0])).toContain('/custom-templates/30');
  });

  it('saves a new version via POST to /versions', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: '30' }));
    vi.stubGlobal('fetch', fetchMock);
    const versionLayout = layout();
    versionLayout.sections[0].settings = { width: 'standard', backgroundStyle: 'sky' };
    await saveCustomTemplateVersion('30', { layout_config_json: versionLayout, expected_lock_version: 1 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/custom-templates/30/versions');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.layout_config_json.sections[0].settings).toMatchObject({ width: 'standard', backgroundStyle: 'sky' });
  });

  it('calls the correct lifecycle endpoints', async () => {
    const fetchMock = vi.fn().mockImplementation(async () => response({ id: '30' }));
    vi.stubGlobal('fetch', fetchMock);
    await activateCustomTemplate('30', { expected_lock_version: 1 });
    await archiveCustomTemplate('30', { expected_lock_version: 1 });
    await restoreCustomTemplate('30', { expected_lock_version: 1 });
    await duplicateCustomTemplate('30');
    await permanentlyDeleteCustomTemplate('30');
    const urls = fetchMock.mock.calls.map((args: any[]) => String(args[0]));
    expect(urls).toEqual(expect.arrayContaining([
      expect.stringContaining('/custom-templates/30/activate'),
      expect.stringContaining('/custom-templates/30/archive'),
      expect.stringContaining('/custom-templates/30/restore'),
      expect.stringContaining('/custom-templates/30/duplicate'),
      expect.stringContaining('/custom-templates/30')
    ]));
    const deleteCall = fetchMock.mock.calls.find((args: any[]) => (args[1] as RequestInit)?.method === 'DELETE');
    expect(deleteCall).toBeDefined();
  });
});
