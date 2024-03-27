/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { type LatestInvoiceRaw, type Revenue } from "~/app/lib/definitions";
import { formatCurrency } from "~/app/lib/utils";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

type InvoiceStatus = {
  paid: bigint;
  pending: bigint;
}

export const dashboardRouter = createTRPCRouter({
  fetchRevenue: publicProcedure.query(async ({ ctx }) => {
    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data: Revenue[] = await ctx.db.revenue.findMany();
    console.log('Data fetch complete after 3 seconds.', data);
    return data;
  }),
  fetchLatestInvoices: publicProcedure.query(async ({ ctx }) => {
    const dataFromDb = (await ctx.db.invoices.findMany({
      orderBy: {
        date: 'desc'
      },
      take: 5,
      select: {
        amount: true,
        customers: {
          select: {
            name: true,
            image_url: true,
            email: true
          }
        },
        id: true
      },
    }));
    const data: LatestInvoiceRaw[] = dataFromDb.map<LatestInvoiceRaw>(x => ({
      amount: x.amount,
      email: x.customers.email,
      id: x.id,
      image_url: x.customers.image_url,
      name: x.customers.name
    } as LatestInvoiceRaw));

    const latestInvoices = data.map((invoice) => ({
      ...invoice,
      amount: formatCurrency(invoice.amount),
    }));
    return latestInvoices;
  }),
  fetchCardData: publicProcedure.query(async ({ ctx }) => {
    const invoiceCountPromise = ctx.db.invoices.count();
    const customerCountPromise = ctx.db.customers.count();
    const invoiceStatusPromise = await ctx.db.$queryRaw<InvoiceStatus[]>`
      SELECT
      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
      FROM "public"."invoices"
      `;

    const [invoiceCount, customerCount, invoiceStatus] = await Promise.all([
      invoiceCountPromise,
      customerCountPromise,
      invoiceStatusPromise,
    ]);

    const [first] = invoiceStatus;

    const numberOfInvoices = Number(invoiceCount ?? '0');
    const numberOfCustomers = Number(customerCount ?? '0');
    const totalPaidInvoices = formatCurrency(Number(first?.paid));
    const totalPendingInvoices = formatCurrency(Number(first?.pending));

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  })
});
