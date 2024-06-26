/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { z } from "zod";
import { type InvoiceForm, type CustomerField, type InvoicesTable } from "~/app/lib/definitions";
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
        where: {
            OR: [
                {customers: {name: {contains: query}}},
                {customers: {email: {contains: query}}},
                // {amount: {}}
            ]
        },
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
      where: {
        OR: [
          {customers: {name: {contains: input}}},
          {customers: {email: {contains: input}}},
          // {amount: {}}
      ]
      }
    });
    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  }),
  fetchInvoiceById: publicProcedure.input(z.string()).query(async ({ctx, input}) => {
    const invoice = await ctx.db.invoices.findUniqueOrThrow({
      where: {id: input},
      select: {
        id: true,
        amount: true,
        status: true,
        customer_id: true
      }
    });

    const result: InvoiceForm = {...invoice, amount: invoice.amount / 100, status: invoice.status as 'paid' | 'pending'};
    return result;
  }),
  deleteInvoice: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    const deleted = await ctx.db.invoices.delete({ where: { id: input } });
    if (deleted) {
      return { message: 'Deleted Invoice.' };
    }
    return { message: 'Database Error: Failed to Delete Invoice.' };
  }),
  fetchCustomers: publicProcedure.query(async ({ ctx }) => {
    const customers: CustomerField[] = await ctx.db.customers.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc'
      }
    });
    return customers;
  }),
  createInvoice: publicProcedure.input(z.object({
    customerId: z.string(),
    amount: z.number(),
    status: z.enum(['pending', 'paid'])
  })).mutation(async ({ ctx, input: { amount, customerId, status } }) => {
    const amountInCents = amount * 100;
    const date = new Date().toISOString();

    await ctx.db.invoices.create({
      data: {
        customers: {
          connect: {
            id: customerId
          }
        },
        amount: amountInCents,
        status,
        date
      }
    });
  }),
  updateInvoice: publicProcedure.input(z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.number(),
    status: z.enum(['pending', 'paid'])
  })).mutation(async ({ ctx, input: { amount, customerId, status, id } }) => {
    const amountInCents = amount * 100;

    await ctx.db.invoices.updateMany({
      data: {
        customer_id: customerId,
        amount: amountInCents,
        status
      },
      where: {
        id
      }
    })
  }),
});
