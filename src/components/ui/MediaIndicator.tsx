import React from 'react';
import { Video, FileText, FileType2, Link, HelpCircle, File } from 'lucide-react';

interface MediaIndicatorProps {
  type: 'video' | 'markdown' | 'pdf' | 'quiz' | 'attachment' | string;
}

export function MediaIndicator({ type }: MediaIndicatorProps) {
  let Icon = Link;
  let color = '#94A3B8';
  let title = 'رابط';

  if (type === 'video') {
    Icon = Video; color = '#3B82F6'; title = 'فيديو';
  } else if (type === 'markdown') {
    Icon = FileText; color = '#6366F1'; title = 'محتوى نصي';
  } else if (type === 'pdf') {
    Icon = FileType2; color = '#EF4444'; title = 'مستند PDF';
  } else if (type === 'quiz') {
    Icon = HelpCircle; color = '#F59E0B'; title = 'اختبار';
  } else if (type === 'attachment') {
    Icon = File; color = '#10B981'; title = 'مرفق';
  }

  return (
    <div title={title} className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
      <Icon className="w-4 h-4" style={{ color }} />
    </div>
  );
}
