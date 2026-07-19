import Logo from '@/components/ui/Logo';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-6">
        <Logo variant="light" size={44} />
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm px-10 py-8 text-center">
          <h1 className="text-[#111827] font-semibold mb-1" style={{ fontSize: '18px' }}>로그인</h1>
          <p className="text-[#6b7280]" style={{ fontSize: '14px' }}>준비 중입니다</p>
        </div>
      </div>
    </div>
  );
}
