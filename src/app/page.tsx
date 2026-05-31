'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import AddProjectModal, { ProjectFormData } from '@/components/features/AddProjectModal';
import { Project, ProjectStatus } from '@/types';
import { Search, Plus, MapPin, Calendar, ChevronRight, HardHat, MoreHorizontal } from 'lucide-react';

const DUMMY_PROJECTS: Project[] = [
  {
    id: '1',
    name: '중부관내4구역',
    client: '중부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 중구 문화동 311~20',
    type: '상수도',
    status: '진행중',
    startDate: '2025-03-01',
    endDate: '2025-06-30',
    photoCount: 7,
    createdAt: '2025-03-01',
  },
  {
    id: '2',
    name: '유성구 관평동 상수도 관로 교체',
    client: '유성사업소',
    contractor: '칠성건설(주)',
    location: '대전시 유성구 관평동',
    type: '상수도',
    status: '완료',
    startDate: '2025-01-15',
    endDate: '2025-04-30',
    photoCount: 23,
    createdAt: '2025-01-15',
  },
  {
    id: '3',
    name: '서구 둔산동 급수관 신설',
    client: '서부사업소',
    contractor: '칠성건설(주)',
    location: '대전시 서구 둔산동',
    type: '상수도',
    status: '대기',
    startDate: '2025-06-01',
    endDate: '2025-09-30',
    photoCount: 0,
    createdAt: '2025-06-01',
  },
];

const STATUS_FILTERS: { label: string; value: ProjectStatus | '전체' }[] = [
  { label: '전체', value: '전체' },
  { label: '진행중', value: '진행중' },
  { label: '완료', value: '완료' },
  { label: '대기', value: '대기' },
];

function formatDate(d: string) {
  return d.replace(/-/g, '.').slice(0, 10);
}

export default function HomePage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>(DUMMY_PROJECTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<ProjectStatus | '전체'>('전체');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const displayProjects = projects.filter((p) => {
    if (activeFilter !== '전체' && p.status !== activeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.location.toLowerCase().includes(q);
    }
    return true;
  });

  function handleSaveProject(data: ProjectFormData) {
    if (editingProject) {
      setProjects((prev) => prev.map((p) => (p.id === editingProject.id ? { ...p, ...data } : p)));
    } else {
      const newProject: Project = {
        id: String(Date.now()),
        type: '상수도',
        photoCount: 0,
        createdAt: new Date().toISOString().split('T')[0],
        ...data,
      };
      setProjects((prev) => [newProject, ...prev]);
    }
    setEditingProject(null);
  }

  function handleDeleteProject(id: string) {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setOpenMenuId(null);
  }

  function openAdd() {
    setEditingProject(null);
    setIsModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditingProject(project);
    setIsModalOpen(true);
    setOpenMenuId(null);
  }

  return (
    <div onClick={() => setOpenMenuId(null)}>
      {/* 헤더 */}
      <header className="bg-white border-b border-[#e5e7eb] px-5 flex items-center justify-between" style={{ height: '64px' }}>
        <img src="/new_logo.png" alt="All-In Build" style={{ height: '40px', width: 'auto' }} />
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-[#1e3a5f] text-white px-5 rounded-xl font-medium hover:bg-[#2d5080] transition-colors"
          style={{ height: '48px', fontSize: '16px' }}
        >
          <Plus size={18} />
          새 공사 등록
        </button>
      </header>

      <div className="p-5 space-y-4">
        {/* 검색바 */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="공사명 또는 위치 검색..."
            className="w-full pl-12 pr-4 border border-[#e5e7eb] rounded-xl text-[#111827] placeholder-[#9ca3af] focus:outline-none focus:border-[#1e3a5f] transition-colors"
            style={{ height: '52px', fontSize: '16px' }}
          />
        </div>

        {/* 필터 탭 */}
        <div className="flex border-b border-[#e5e7eb]">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setActiveFilter(value)}
              className={`px-4 transition-colors border-b-2 -mb-px font-medium ${
                activeFilter === value
                  ? 'border-[#1e3a5f] text-[#1e3a5f]'
                  : 'border-transparent text-[#6b7280] hover:text-[#374151]'
              }`}
              style={{ fontSize: '16px', minHeight: '44px' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 카드 목록 */}
        {displayProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-5">
            <HardHat size={52} className="text-[#d1d5db]" />
            <p style={{ fontSize: '18px', color: '#9ca3af' }}>등록된 공사가 없습니다</p>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#2d5080] transition-colors"
              style={{ fontSize: '16px' }}
            >
              <Plus size={18} />
              새 공사 등록
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayProjects.map((project) => (
              <div
                key={project.id}
                onClick={() => router.push(`/projects/${project.id}`)}
                className="relative bg-white border border-[#e5e7eb] rounded-xl cursor-pointer hover:shadow-md transition-shadow flex items-center"
                style={{ padding: '20px' }}
              >
                {/* 메인 정보 */}
                <div className="flex-1 min-w-0" style={{ lineHeight: 1.7 }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{ fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                      {project.name}
                    </span>
                    <Badge variant={project.status} style={{ fontSize: '14px' }}>{project.status}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <MapPin size={14} className="text-[#9ca3af] flex-shrink-0" />
                    <span style={{ fontSize: '15px', color: '#6b7280' }}>{project.client} · {project.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} className="text-[#9ca3af] flex-shrink-0" />
                    <span style={{ fontSize: '14px', color: '#9ca3af' }}>
                      {formatDate(project.startDate)} ~ {formatDate(project.endDate)}
                    </span>
                  </div>
                </div>

                {/* 우측: 메뉴 + 화살표 */}
                <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === project.id ? null : project.id);
                      }}
                      className="flex items-center justify-center rounded-lg hover:bg-[#f3f4f6] transition-colors text-[#9ca3af]"
                      style={{ width: '44px', height: '44px' }}
                    >
                      <MoreHorizontal size={20} />
                    </button>
                    {openMenuId === project.id && (
                      <div className="absolute right-0 top-full mt-1 w-24 bg-white border border-[#e5e7eb] rounded-xl shadow-lg z-10 overflow-hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                          className="w-full px-4 py-3 text-left text-[#374151] hover:bg-[#f3f4f6] transition-colors"
                          style={{ fontSize: '15px' }}
                        >
                          수정
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                          className="w-full px-4 py-3 text-left text-[#6b7280] hover:bg-[#f3f4f6] transition-colors border-t border-[#f3f4f6]"
                          style={{ fontSize: '15px' }}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={22} className="text-[#d1d5db]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingProject(null); }}
        onSave={handleSaveProject}
        initialData={editingProject ?? undefined}
      />
    </div>
  );
}
