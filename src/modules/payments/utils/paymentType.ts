import { FileText, Zap, type LucideIcon } from 'lucide-react';

export type PaymentMethodKind = 'automated' | 'manual' | 'unknown';

export interface PaymentMethodInfo {
  kind: PaymentMethodKind;
  label: string;
  badgeClassName: string;
  Icon: LucideIcon;
  hasReceiptImage: boolean;
  receiptImageUrl?: string;
}

export function getPaymentMethod(payment: { receiptUrl?: string | null; receiptImageUrl?: string | null }): PaymentMethodInfo {
  if (payment.receiptUrl === 'EXTERNAL_KARTI_PAYMENT') {
    return {
      kind: 'automated',
      label: 'سداد آلي (تطبيق كارتي)',
      badgeClassName: 'bg-violet-50 text-violet-800 border-violet-200',
      Icon: Zap,
      hasReceiptImage: false,
    };
  }

  const receiptImageUrl = payment.receiptUrl || payment.receiptImageUrl || undefined;
  if (receiptImageUrl) {
    return {
      kind: 'manual',
      label: 'سداد يدوي (سند تحويل)',
      badgeClassName: 'bg-sky-50 text-sky-800 border-sky-200',
      Icon: FileText,
      hasReceiptImage: true,
      receiptImageUrl,
    };
  }

  return {
    kind: 'unknown',
    label: 'طريقة الدفع غير محددة',
    badgeClassName: 'bg-slate-50 text-slate-600 border-slate-200',
    Icon: FileText,
    hasReceiptImage: false,
  };
}
