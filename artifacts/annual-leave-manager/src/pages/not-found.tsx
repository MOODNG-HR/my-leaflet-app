import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Link } from 'wouter';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] w-full items-center justify-center bg-[hsl(var(--background))] px-5">
      <div className="surface w-full max-w-md p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f8e5e0] text-[#a34738]"><AlertCircle size={22} /></div>
        <div className="eyebrow mt-5">페이지를 찾을 수 없음</div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-[-.06em]">이 주소는 아직 비어 있어요</h1>
        <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">주소를 다시 확인하거나 오늘의 현황으로 돌아가 주세요.</p>
        <Link href="/" data-testid="link-not-found-home" className="mt-7 inline-flex items-center gap-2 rounded-lg bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))]"><ArrowLeft size={14} />현황으로 돌아가기</Link>
      </div>
    </div>
  );
}
