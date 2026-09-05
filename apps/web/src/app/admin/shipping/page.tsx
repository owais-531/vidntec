import type { Metadata } from 'next';
import { getShippingRatesAdmin } from '@/lib/admin/queries';
import { PageHeader } from '@/components/admin/page-header';
import { ShippingRates } from '@/components/admin/shipping-rates';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Shipping' };

export default async function ShippingPage() {
  const rates = await getShippingRatesAdmin();
  return (
    <>
      <PageHeader
        title="Shipping rates"
        subtitle="Flat rates shown to customers at checkout"
      />
      <ShippingRates rates={rates} />
    </>
  );
}
