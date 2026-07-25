export function isCustomTemplateBuilderEnabled(
  env: string | undefined = process.env.NEXT_PUBLIC_CUSTOM_TEMPLATE_BUILDER_ENABLED
): boolean {
  return env === 'true';
}
