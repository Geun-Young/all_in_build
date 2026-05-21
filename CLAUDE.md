@AGENTS.md

# All-In Build 프로젝트 규칙

## 디자인 원칙
- 배경: 흰색(#ffffff), 섹션 구분은 #f8fafc
- 포인트 컬러: 네이비 단일 (#1e3a5f)
- 텍스트: 주요 #111827 / 보조 #6b7280
- 보더: #e5e7eb (얇고 연하게)
- 그림자: shadow-sm 이하만 사용
- 여백 넉넉하게, 답답하지 않게
- 색은 흰색 + 네이비 + 회색 계열만 사용, 추가 금지

## 기술 스택
- Next.js 15 App Router + TypeScript
- Tailwind CSS만 사용 (외부 UI 라이브러리 금지)
- 아이콘: lucide-react만 사용

## 코드 규칙
- 컴포넌트는 src/components/ 아래에 위치
- 페이지는 src/app/ 아래에 위치
- 타입은 src/types/index.ts에 정의
- DB 연결 전까지는 더미 데이터로 UI 구현
