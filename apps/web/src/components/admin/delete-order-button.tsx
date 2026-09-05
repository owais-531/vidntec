'use client';

import { useRouter } from 'next/navigation';
import { deleteOrderAction } from '@/lib/actions/orders';
import { ConfirmButton } from '@/components/ui/confirm-button';

export function DeleteOrderButton({
  orderId,
  redirectTo,
  children = '🗑',
}: {
  orderId: string;
  /** Where to go after a successful delete (order-detail page). Omit to just refresh. */
  redirectTo?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <ConfirmButton
      message="Delete order?"
      confirmLabel="Delete"
      successMessage="Order deleted"
      action={async () => {
        const res = await deleteOrderAction(orderId);
        if (res.ok) {
          if (redirectTo) router.push(redirectTo);
          else router.refresh();
        }
        return res;
      }}
    >
      {children}
    </ConfirmButton>
  );
}
