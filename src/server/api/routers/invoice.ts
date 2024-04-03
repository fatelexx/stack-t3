/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { z } from "zod";
import { type InvoicesTable } from "~/app/lib/definitions";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const ITEMS_PER_PAGE = 6;

export const invoiceRouter = createTRPCRouter({
  fetchFilteredInvoices: publicProcedure.input(z.object({
    query: z.string(),
    currentPage: z.number()
  })).query(async ({ ctx, input: { currentPage, query } }) => {
    const offset = (currentPage - 1) * ITEMS_PER_PAGE;

    const invoices = await ctx.db.invoices
      .findMany({
        // where: {
        //     OR: [
        //         {customers: {name: {contains: query}}},
        //         {customers: {email: {contains: query}}},
        //         // {amount: {}}
        //     ]
        // },
        select: {
          id: true,
          amount: true,
          date: true,
          status: true,
          customers: {
            select: {
              name: true,
              email: true,
              image_url: true
            }
          }
        },
        orderBy: {
          date: "desc"
        },
        skip: offset,
        take: ITEMS_PER_PAGE
      });

    const result: InvoicesTable[] = invoices.map(i => ({
      id: i.id,
      amount: i.amount,
      date: i.date.toDateString(),
      status: i.status,
      name: i.customers.name,
      email: i.customers.email,
      image_url: i.customers.image_url
    }) as InvoicesTable);

    return result;
  }),
  fetchInvoicesPages: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const count = await ctx.db.invoices.count({
      // where
    });
    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  }),
  deleteInvoice: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const deleted = await ctx.db.invoices.delete({ where: { id: input } });
    if (deleted) {
      return { message: 'Deleted Invoice.' };
    }
    return { message: 'Database Error: Failed to Delete Invoice.' };
  })
});
