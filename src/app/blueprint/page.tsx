'use client';

import BlueprintAI from '@/components/features/BlueprintAI';

export default function BlueprintPage() {
  // 공사 선택 없이도 도면을 만들 수 있는 독립 진입점
  return (
    <div className="min-h-screen bg-white">
      <BlueprintAI projectId="standalone" />
    </div>
  );
}
