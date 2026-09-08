import { PrintPreviewClient } from "./print-preview-client";

export const dynamic = "force-dynamic";

export default async function PrintPreviewPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  return <PrintPreviewClient previewKey={resolvedSearchParams?.key || ""} />;
}
