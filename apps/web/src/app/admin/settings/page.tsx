import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const settings = await getStoreSettings();
  return (
    <>
      <PageHeader title="Store settings" />
      <SettingsForm settings={settings} />
    </>
  );
}
