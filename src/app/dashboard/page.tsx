import Header from '@/components/layout/Header';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { ProjectStatus } from '@/types';

const summaryCards = [
  { label: '진행중 공사', value: 3 },
  { label: '이번달 견적', value: 5 },
  { label: '오늘 일지', value: 2 },
  { label: '완료 공사', value: 12 },
];

const recentProjects = [
  { name: '유성구 관평동 상수도 관로 교체공사', location: '대전시 유성구', status: '진행중' as ProjectStatus, type: '상수도' },
  { name: '중구 은행동 하수관거 정비공사', location: '대전시 중구', status: '완료' as ProjectStatus, type: '하수도' },
  { name: '서구 둔산동 급수관 신설공사', location: '대전시 서구', status: '대기' as ProjectStatus, type: '상수도' },
];

const recentLogs = [
  { date: '2025-05-21', project: '관평동 관로 교체공사', content: '터파기 작업 완료, 기초 모래 포설 시작', author: '홍길동' },
  { date: '2025-05-20', project: '은행동 하수관거 정비', content: '흄관 φ400 부설 완료 (연장 120m)', author: '홍길동' },
];

export default function DashboardPage() {
  return (
    <div>
      <Header title="대시보드" />

      <div className="p-6 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 gap-4">
          {summaryCards.map(({ label, value }) => (
            <Card key={label} className="p-5">
              <p className="text-sm text-[#6b7280] mb-2">{label}</p>
              <p className="text-3xl font-bold text-[#1e3a5f]">{value}</p>
            </Card>
          ))}
        </div>

        {/* 최근 공사 현장 */}
        <section>
          <h2 className="text-base font-medium text-[#111827] mb-3">최근 공사 현장</h2>
          <Card>
            <ul className="divide-y divide-[#e5e7eb]">
              {recentProjects.map((project) => (
                <li
                  key={project.name}
                  className="px-5 py-4 flex items-center justify-between hover:bg-[#f8fafc] transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#111827] truncate">{project.name}</p>
                    <p className="text-xs text-[#6b7280] mt-0.5">{project.location} · {project.type}</p>
                  </div>
                  <Badge variant={project.status} className="ml-4 flex-shrink-0">
                    {project.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        {/* 최근 현장 일지 */}
        <section>
          <h2 className="text-base font-medium text-[#111827] mb-3">최근 현장 일지</h2>
          <Card>
            <ul className="divide-y divide-[#e5e7eb]">
              {recentLogs.map((log) => (
                <li key={log.date + log.project} className="px-5 py-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-[#6b7280]">{log.date}</span>
                    <span className="text-xs text-[#9ca3af]">·</span>
                    <span className="text-xs text-[#6b7280]">{log.project}</span>
                  </div>
                  <p className="text-sm text-[#111827]">{log.content}</p>
                  <p className="text-xs text-[#9ca3af] mt-1">{log.author}</p>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </div>
  );
}
