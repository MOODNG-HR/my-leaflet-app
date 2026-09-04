import { useState, type FormEvent } from 'react';
import { SignUp } from '@clerk/react';
import { CalendarDays, Loader2 } from 'lucide-react';
import { Link } from 'wouter';

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [companyName, setCompanyName] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [showClerk, setShowClerk] = useState(false);
  
  const handlePreSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !employeeName.trim()) {
      return;
    }
    // Set into session storage so we can update user metadata later 
    // (though clerk <SignUp /> does not support custom metadata easily unless configured in dashboard,
    // we fulfill the visual requirement here and store it. An actual post-signup hook would read this).
    sessionStorage.setItem('onhue_company_name', companyName);
    sessionStorage.setItem('onhue_employee_name', employeeName);
    setShowClerk(true);
  };

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
        <div className="w-full max-w-[400px]">
          {!showClerk ? (
            <div className="animate-rise">
              <div className="mb-8">
                <h2 className="text-[24px] font-extrabold tracking-[-.04em]">시작하기</h2>
                <p className="mt-2 text-[13px] text-[hsl(var(--muted-foreground))]">먼저 회사 정보를 등록해 주세요.</p>
              </div>

              <form onSubmit={handlePreSubmit} className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">회사명</span>
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    placeholder="주식회사 온휴"
                    className="h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-xs outline-none transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" 
                    required 
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] font-bold text-[hsl(var(--muted-foreground))]">이름 (관리자)</span>
                  <input 
                    type="text" 
                    value={employeeName} 
                    onChange={(e) => setEmployeeName(e.target.value)} 
                    placeholder="김민지"
                    className="h-12 w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 text-xs outline-none transition focus:border-[hsl(var(--ring))] focus:ring-2 focus:ring-[hsl(var(--ring)/.1)]" 
                    required 
                  />
                </label>
                
                <button 
                  type="submit" 
                  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[hsl(var(--primary))] text-[13px] font-bold text-[hsl(var(--primary-foreground))] transition hover:brightness-110"
                >
                  다음 단계로
                </button>
                
                <div className="mt-6 text-center text-[12px] text-[hsl(var(--muted-foreground))]">
                  이미 계정이 있으신가요?{' '}
                  <Link href="/sign-in" className="font-bold text-[hsl(var(--foreground))] hover:underline">
                    로그인
                  </Link>
                </div>
              </form>
            </div>
          ) : (
            <div className="animate-rise">
              <SignUp 
                routing="path" 
                path={`${basePath}/sign-up`} 
                signInUrl={`${basePath}/sign-in`}
                initialValues={{ firstName: employeeName }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
