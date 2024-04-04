import Form from '~/app/ui/invoices/create-form';
import Breadcrumbs from '~/app/ui/invoices/breadcrumbs';
import { type Metadata } from 'next';
import { api } from '~/trpc/server';

export const metadata: Metadata = {
  title: 'Create Invoice',
}; 

export default async function Page() {
const customers = await api.invoice.fetchCustomers.query();
 
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Invoices', href: '/dashboard/invoices' },
          {
            label: 'Create Invoice',
            href: '/dashboard/invoices/create',
            active: true,
          },
        ]}
      />
      <Form customers={customers} />
    </main>
  );
}