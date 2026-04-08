import { VendorSettingsPageClient } from "./vendor-settings-page-client";

export default async function VendorSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ stripe?: string }>;
}) {
  const params = await searchParams;

  return <VendorSettingsPageClient stripeState={params.stripe} />;
}
