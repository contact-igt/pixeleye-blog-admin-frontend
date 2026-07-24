import { BlogForm } from '@/components/blogs/blog-form';
import { defaultTemplateKey, isSupportedTemplate } from '@/components/blogs/templates/template-registry';

export function requestedTemplate(value?: string | string[]) {
  const key = Array.isArray(value) ? value[0] : value;
  return key && isSupportedTemplate(key, 1) ? key : defaultTemplateKey;
}

export default async function CreateBlogPage({ searchParams }: { searchParams: Promise<{ template?: string | string[] }> }) {
  const params = await searchParams;
  return <BlogForm initialTemplateKey={requestedTemplate(params.template)} />;
}

