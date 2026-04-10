import { PrintPreviewClient } from "./print-preview-client";

export const dynamic = "force-dynamic";

export default function PrintPreviewPage({ searchParams }) {
  return <PrintPreviewClient previewKey={searchParams?.key || ""} />;
}
