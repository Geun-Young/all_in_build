import { Bell } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-[#e5e7eb] flex items-center justify-between px-6">
      <h1 className="text-[#111827] font-semibold" style={{ fontSize: '18px' }}>{title}</h1>
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg text-[#6b7280] hover:bg-[#f0f4f9] hover:text-[#1e3a5f] transition-colors">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-[#1e3a5f] flex items-center justify-center">
          <span className="text-xs font-semibold text-white">홍</span>
        </div>
      </div>
    </header>
  );
}
