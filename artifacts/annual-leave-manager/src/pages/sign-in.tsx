import { SignIn } from '@clerk/react';
import { Link } from 'wouter';

export default function SignInPage() {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  
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
              인사관리 시스템 로그인
            </h1>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
              사번 또는 등록된 이메일 계정을 사용하여 시스템에 접근하십시오. 접근 권한이 없는 경우 관리자에게 문의 바랍니다.
            </p>
          </div>
        </div>

        {/* Right panel - Form */}
        <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-[hsl(var(--background))]">
          <div className="w-full max-w-[400px] animate-rise">
            <SignIn 
              routing="path" 
              path={`${basePath}/sign-in`} 
              signUpUrl={`${basePath}/sign-up`} 
            />
            <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--border))] pt-4 text-xs text-[hsl(var(--muted-foreground))]">
              <span>계정 등록이 필요하신가요?</span>
              <Link href="/sign-up" className="font-semibold text-[hsl(var(--primary))] hover:underline">
                계정 등록
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      <footer className="flex h-12 items-center justify-center border-t border-[hsl(var(--border))] bg-white text-[11px] text-[hsl(var(--muted-foreground))]">
        &copy; {new Date().getFullYear()} 무등기업 HR Management System. All rights reserved.
      </footer>
    </div>
  );
}
