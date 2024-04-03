"use client";
import { TrashIcon } from '@heroicons/react/24/outline';
import { useRouter } from "next/navigation";
import { type FormEvent } from 'react';
import { api } from '~/trpc/react';

export function DeleteInvoice({ id }: { id: string }) {
  const router = useRouter();
  const remove = api.invoice.deleteInvoice.useMutation({
    onSuccess: () => {
      router.refresh();
    }
  });
  const onRemoveClick = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    remove.mutate(id);
  }
  return (
    <form onSubmit={onRemoveClick}>
      <button className="rounded-md border p-2 hover:bg-gray-100">
        <span className="sr-only">Delete</span>
        <TrashIcon className="w-5" />
      </button>
    </form>
  );
}