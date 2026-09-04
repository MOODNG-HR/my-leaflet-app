import { SignIn } from '@clerk/react';
import { CalendarDays } from 'lucide-react';

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
  return (
    <div className="flex min-h-[100dvh] flex-col bg-[hsl(var(--background))] md:flex-row">
      {/* Left panel - Branding */}
      <div className="relative flex flex-col justify-between bg-[hsl(var(--primary))] p-8 text-[hsl(var(--primary-foreground))] md:w-[45%] md:p-12 lg:w-[40%] xl:p-16">
        <div className="noise" />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[11px] bg-[hsl(var(--primary-foreground))] text-[hsl(var(--primary))]">
              <CalendarDays size={21} strokeWidth={2.4} />
            </div>
            <span className="text-[18px] font-extrabold tracking-[-.04em]">온휴</span>
          </div>
          <div className="mt-16 sm:mt-24">
            <h1 className="text-[32px] font-extrabold leading-[1.2] tracking-[-.05em] sm:text-[40px]">
              단단하고 믿음직한<br />
              우리 회사 연차 데스크
            </h1>
            <p className="mt-5 max-w-[340px] text-[14px] leading-relaxed text-[hsl(var(--primary-foreground)/.7)]">
              복잡한 연차 계산부터 승인 내역까지. 온휴가 가장 명확하고 정확하게 정리해 드립니다.
            </p>
          </div>
        </div>
        <div className="relative z-10 hidden mt-auto md:block">
          <div className="font-mono text-[10px] tracking-[.15em] opacity-60">DEPENDABLE WORKPLACE</div>
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-[360px] animate-rise">
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </div>
      </div>
    </div>
  );
}
