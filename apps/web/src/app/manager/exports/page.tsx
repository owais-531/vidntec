import type { Metadata } from 'next';
import { ORDER_STATUSES } from '@vidntec/shared';
import { PageHeader } from '@/components/admin/page-header';
import { Card, CardBody } from '@/components/ui/card';
import { buttonClasses } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Exports' };

const CONTROL =
  'h-9 w-full rounded-card border border-paper-line bg-white px-3 text-sm focus:border-brand-400 focus:outline-none';
const LABEL = 'mb-1 block text-xs font-medium text-ink-muted';

function DateRange() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={LABEL} htmlFor="from">
          From (optional)
        </label>
        <input id="from" name="from" type="date" className={CONTROL} />
      </div>
      <div>
        <label className={LABEL} htmlFor="to">
          To (optional)
        </label>
        <input id="to" name="to" type="date" className={CONTROL} />
      </div>
    </div>
  );
}

export default function ManagerExportsPage() {
  return (
    <>
      <PageHeader
        title="Exports"
        subtitle="Download CSV files that open in Excel or Google Sheets. Dates are in Pakistan time; amounts are in rupees."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Order history</h2>
            <p className="mb-4 mt-1 text-xs text-ink-muted">
              Every order with customer, delivery address, payment, status and totals.
            </p>
            <form action="/manager/export/orders" method="get" className="space-y-3">
              <DateRange />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={LABEL} htmlFor="status">
                    Status
                  </label>
                  <select id="status" name="status" className={CONTROL} defaultValue="">
                    <option value="">All statuses</option>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s} className="capitalize">
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={LABEL} htmlFor="mode">
                    Rows
                  </label>
                  <select id="mode" name="mode" className={CONTROL} defaultValue="orders">
                    <option value="orders">One row per order</option>
                    <option value="items">One row per item</option>
                  </select>
                </div>
              </div>
              <button type="submit" className={buttonClasses('primary', 'sm')}>
                Download orders CSV
              </button>
            </form>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="text-sm font-semibold text-ink">Customers</h2>
            <p className="mb-4 mt-1 text-xs text-ink-muted">
              One row per customer (by email): location, number of orders, total spent, first and last
              order, and whether they are one-time or recurring.
            </p>
            <form action="/manager/export/customers" method="get" className="space-y-3">
              <DateRange />
              <div>
                <label className={LABEL} htmlFor="segment">
                  Customers
                </label>
                <select id="segment" name="segment" className={CONTROL} defaultValue="all">
                  <option value="all">All customers</option>
                  <option value="recurring">Recurring only (2+ orders)</option>
                  <option value="one_time">One-time only (1 order)</option>
                </select>
              </div>
              <button type="submit" className={buttonClasses('primary', 'sm')}>
                Download customers CSV
              </button>
            </form>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
