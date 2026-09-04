import { useState, type FormEvent } from 'react';
import { SignUp } from '@clerk/react';
import { Link } from 'wouter';

export default function SignUpPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  const [companyName, setCompanyName] = useState('무등기업');
  const [employeeName, setEmployeeName] = useState('');
  const [showClerk, setShowClerk] = useState(false);
  
  const handlePreSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !employeeName.trim()) {
      return;
    }
    // Set into session storage so we can update user metadata later 
    sessionStorage.setItem('onhue_company_name', companyName);
    sessionStorage.setItem('onhue_employee_name', employeeName);
    setShowClerk(true);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[hsl(var(--background))]">
      <header className="flex h-14 items-center justify-between border-b border-[hsl(var(--border))] bg-white px-6">
        <div className="flex items-center gap-3">
          <img src={`${basePath}/logo.png`} alt="무등기업" className="h-5 object-contain" />
          <span className="text-xs font-bold text-[hsl(var(--foreground))] border-l border-[hsl(var(--border))] pl-3">
            임직원 인사관리 시스템
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left panel - Geometric Split */}
        <div className="hidden w-1/2 flex-col border-r border-[hsl(var(--border))] bg-white p-12 lg:flex relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
          
          <div className="relative z-10 my-auto">
            <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--foreground))] leading-snug">
              계정 등록
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              초기 계정 설정을 위해 임직원 정보를 입력해 주십시오. 회사명과 실명을 정확히 기재해야 관리자 승인이 가능합니다.
            </p>
          </div>
        </div>

        {/* Right panel - Form */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-[hsl(var(--background))]">
          <div className="w-full max-w-[400px]">
            {!showClerk ? (
              <div className="animate-rise bg-white border border-[hsl(var(--border))] rounded p-8">
                <div className="mb-6 border-b border-[hsl(var(--border))] pb-5">
                  <h2 className="text-lg font-bold tracking-tight text-[hsl(var(--foreground))]">임직원 정보 입력</h2>
                  <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">인사관리 시스템 등록을 위한 사전 정보입니다.</p>
                </div>

                <form onSubmit={handlePreSubmit} className="space-y-4">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[hsl(var(--foreground))]">소속 (회사명)</span>
                    <input 
                      type="text" 
                      value={companyName} 
                      onChange={(e) => setCompanyName(e.target.value)} 
                      placeholder="무등기업"
                      className="h-10 w-full rounded border border-[hsl(var(--input))] bg-white px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring))]" 
                      required 
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold text-[hsl(var(--foreground))]">성명</span>
                    <input 
                      type="text" 
                      value={employeeName} 
                      onChange={(e) => setEmployeeName(e.target.value)} 
                      placeholder="홍길동"
                      className="h-10 w-full rounded border border-[hsl(var(--input))] bg-white px-3 text-sm outline-none transition-colors focus:border-[hsl(var(--ring))] focus:ring-1 focus:ring-[hsl(var(--ring))]" 
                      required 
                    />
                  </label>
                  
                  <button 
                    type="submit" 
                    className="mt-6 flex h-10 w-full items-center justify-center rounded bg-[hsl(var(--primary))] text-sm font-medium text-white transition-colors hover:bg-[hsl(var(--primary))/0.9] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
                  >
                    다음 단계
                  </button>
                  
                  <div className="mt-6 pt-4 border-t border-[hsl(var(--border))] text-center text-xs text-[hsl(var(--muted-foreground))]">
                    이미 계정이 있으신가요?{' '}
                    <Link href="/sign-in" className="font-semibold text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))/0.9]">
                      로그인으로 이동
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

      <footer className="flex h-12 items-center justify-center border-t border-[hsl(var(--border))] bg-white text-[11px] text-[hsl(var(--muted-foreground))]">
        &copy; {new Date().getFullYear()} 무등기업 HR Management System. All rights reserved.
      </footer>
    </div>
  );
}
