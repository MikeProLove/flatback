'use client';

import Image from 'next/image';
import OpenChatButton from '@/components/OpenChatButton';

type Props = {
  row: {
    id: string;
    listing_id: string;
    listing_title: string;
    listing_city: string | null;
    cover_url: string | null;
    start_date: string | null;
    end_date: string | null;
    monthly_price: number | null;
    deposit: number | null;
    status: string;
    payment_status: string;
    // для mine:
    owner_id_for_chat?: string | null;
    // для incoming:
    renter_id_for_chat?: string | null;
  };
  variant: 'mine' | 'incoming';
};

export default function RequestCard({ row, variant }: Props) {
  const period =
    row.start_date && row.end_date
      ? `${new Date(row.start_date).toLocaleDateString('ru-RU')} — ${new Date(row.end_date).toLocaleDateString('ru-RU')}`
      : 'Дата не указана';

  const otherId = variant === 'mine' ? row.owner_id_for_chat : row.renter_id_for_chat;

  return (
    <div className="rounded-2xl border p-4 flex gap-4 items-stretch">
      <div className="w-[180px] h-[120px] rounded-xl overflow-hidden bg-muted relative shrink-0">
        {row.cover_url ? (
          <Image src={row.cover_url} alt="" fill className="object-cover" />
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-lg">{row.listing_title}</div>
        <div className="text-sm text-muted-foreground">
          {row.listing_city ?? '—'}
        </div>

        <div className="mt-2 text-sm">{period}</div>

        <div className="mt-1 text-sm text-muted-foreground">
          {row.status} · {row.payment_status}
        </div>

        {otherId ? (
          <div className="mt-3">
            <OpenChatButton listingId={row.listing_id} otherId={otherId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
