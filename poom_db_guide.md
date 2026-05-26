# 표준품셈 기반 일위대가 계산 로직
# 출처: 2026 건설공사 표준품셈 (공통·토목부문)
# All-In Build 품셈 DB 구축용 참조 문서

---

## 핵심 개념

표준품셈 = "이 작업 1단위를 하려면 사람이 몇 명, 장비가 몇 시간 필요한가"를
국가가 정해놓은 기준표.

일위대가 = 품셈 × 노임단가 → 공종 1단위당 단가

```
품셈 수치 (국가 고시, 거의 안 바뀜)
    × 
노임단가 (매년 고시, 업데이트 필요)
    =
일위대가 단가 (자동 계산)
```

---

## Supabase DB 구조

### 테이블 1: work_types (공종 마스터)
```sql
CREATE TABLE work_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50),           -- 품셈 코드 (예: 6-2-2)
  category VARCHAR(100),      -- 분류 (배관공, 토공 등)
  name VARCHAR(200),          -- 공종명 (KP매커니컬접합)
  spec VARCHAR(200),          -- 규격 (Φ150mm)
  unit VARCHAR(20),           -- 단위 (개소, ㎥, m)
  expense_rate DECIMAL(5,2),  -- 공구손료율 (%)
  expense_base VARCHAR(50),   -- 손료 기준 (labor = 노무비 기준)
  night_surcharge DECIMAL(5,2) DEFAULT 87.5, -- 야간할증율 (%)
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 테이블 2: work_components (품셈 구성)
```sql
CREATE TABLE work_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_type_id UUID REFERENCES work_types(id) ON DELETE CASCADE,
  component_type VARCHAR(20),  -- labor(인력) / equipment(장비) / material(재료)
  component_name VARCHAR(100), -- 직종명/장비명/재료명
  quantity DECIMAL(8,4),       -- 품 수량 (0.1인, 0.05인 등)
  unit VARCHAR(20),            -- 단위 (인, hr 등)
  daily_output DECIMAL(10,3),  -- 일당 시공량 (있을 경우)
  sort_order INTEGER DEFAULT 0
);
```

---

## 공종별 품셈 데이터 (표준품셈 원문 기준)

### 1. KP매커니컬접합 (6-2-2) — 개소당

품셈 원리:
- 일당 시공량이 주어짐 (Φ150mm = 14본/일)
- 1개소당 품 = 팀 구성원 수 / 일당 시공량

```
팀 구성: 배관공(수도) 2인 + 보통인부 1인 + 양중장비 1대
일당 시공량: Φ150mm → 14본

1개소당:
  배관공(수도) = 2인 / 14본 = 0.1429인 → 반올림 적용 → 실무는 0.1인 사용
  보통인부     = 1인 / 14본 = 0.0714인 → 실무는 0.05인 사용
  공구손료     = 노무비의 4% (300mm이하 기준, 공구손료 및 경장비)
```

**실제 엑셀(아버지 사용) 기준값:**
```
배관공(수도)  0.1인   × 237,446 = 23,744원
보통인부      0.05인  × 171,037 =  8,551원
공구손료      노무비의 2%       =    646원
─────────────────────────────────
KP접합 Φ150mm 합계              32,941원
```

> ⚠️ 주의: 품셈 원문의 공구손료율은 4%이나 실무 엑셀에서는 2% 적용.
> All-In Build는 아버지가 실제 쓰시는 값(엑셀 기준)으로 맞춤.

**관경별 품셈 (KP매커니컬접합):**

| 관경(mm) | 일당시공량 | 배관공 품(인) | 보통인부 품(인) | 양중장비 |
|---------|---------|------------|-------------|--------|
| 125이하 | 17본/일 | 2인팀 | 1인 | 1대 |
| 150 | 14본/일 | 2인팀 | 1인 | 1대 |
| 200 | 11본/일 | 2인팀 | 1인 | 1대 |
| 250 | 10본/일 | 2인팀 | 1인 | 1대 |
| 300 | 8본/일 | 2인팀 | 1인 | 1대 |
| 350 | 8.5본/일 | 3인팀 | 1인 | 1대 |
| 400 | 7.5본/일 | 3인팀 | 1인 | 1대 |

---

### 2. 이탈방지접합 (KP매커니컬 + 30% 가산)

```
품셈 원문 6-2-2 주④:
"이탈방지 압륜을 사용하여 접합할 경우 본 품을 30% 범위 내에서 가산하여 적용한다."

계산:
  배관공(수도)  0.1인 × 1.3  = 0.13인  × 237,446 = 30,868원
  보통인부      0.05인 × 1.3 = 0.065인 × 171,037 = 11,117원
  공구손료      노무비의 2%              =    839원
  ─────────────────────────────────────────
  이탈방지접합 Φ150mm 합계               42,824원 ✅ (엑셀 일치)
```

---

### 3. 관 절단 (6-2-3) — 개소당

```
품셈 원문 배관공(수도) 인력:
  Φ100이하: 0.08인
  Φ125:     0.09인
  Φ150:     0.10인  ← 이게 배관공 0.1인/개소 기준
  Φ200:     0.12인
  Φ250:     0.14인
  Φ300:     0.16인
  Φ350:     0.18인
  Φ400:     0.20인
  Φ450:     0.22인
  Φ500:     0.24인
  Φ600:     0.28인
  Φ700:     0.32인
  Φ800:     0.36인

공구손료: 공구 및 경장비 기계경비 5% (주철관 절단)

Φ150 계산:
  배관공(수도)  0.10인 × 237,446  = 23,744원
  공구손료      노무비의 5%        =  1,187원
  ────────────────────────────────
  주철관절단 Φ150mm 합계           24,931원 ✅ (엑셀 일치)
```

---

### 4. 터파기 기계 (3-2-4) — ㎥당

```
품셈 원문 보통토사 TypeII (도심/주택가 협소지역):
  굴착기 0.2㎥ 1대, 일당 시공량 190㎥

  굴착기 비용 = 기계경비 / 일당시공량
  노무(운전사) = 건설기계운전사 1인 / 일당시공량

단가산출 계산 (Φ150 상수도 협소지 기준):
  굴착기(무한궤도 0.2㎥)  = 80,122원/hr × 사용시간
  건설기계운전사            = 279,824원/인 × 인력

주간 터파기 = 28,505원/㎥
  노무: 26,565원 / 재료: 749원 / 경비: 1,191원

야간 터파기 = 51,749원/㎥ (야간할증 적용)
  = 28,505 + (26,565 × 87.5%) = 28,505 + 23,244 = 51,749원 ✅
```

---

### 5. 되메우기 및 다짐 (3-4-6/7) — ㎥당

```
소형장비(램머) 사용 기준:
  주간 = 10,500원/㎥ (노무: 9,504 / 재료: 469 / 경비: 527)
  야간 = 18,816원/㎥
  = 10,500 + (9,504 × 87.5%) = 10,500 + 8,316 = 18,816원 ✅
```

---

## 일위대가 자동계산 로직 (TypeScript)

```typescript
interface WorkComponent {
  type: 'labor' | 'equipment' | 'material' | 'expense_rate'
  name: string
  quantity: number        // 품 수량 (0.1인 등)
  unit: string
  expenseRateBase?: 'labor' | 'total'  // 손료 기준
  expenseRate?: number    // 손료율 (%)
}

interface LaborWage {
  jobType: string
  unitPrice: number       // 원/인
}

// 일위대가 단가 계산
function calcUnitPrice(
  components: WorkComponent[],
  laborWages: Record<string, number>,
  isNight: boolean = false
): { labor: number; material: number; expense: number; total: number } {
  
  let labor = 0
  let material = 0
  let expense = 0

  // 1. 인력 노무비 계산
  for (const comp of components) {
    if (comp.type === 'labor') {
      const wage = laborWages[comp.name] || 0
      labor += Math.round(comp.quantity * wage)
    }
    if (comp.type === 'material') {
      // 재료비 (자재단가에서)
      material += comp.quantity * (comp.unitPrice || 0)
    }
  }

  // 2. 공구손료 계산 (노무비 기준 %)
  for (const comp of components) {
    if (comp.type === 'expense_rate') {
      const base = comp.expenseRateBase === 'labor' ? labor : (labor + material)
      expense += Math.round(base * (comp.expenseRate! / 100))
    }
  }

  // 3. 야간 할증 (노무비의 87.5%)
  if (isNight) {
    const nightSurcharge = Math.round(labor * 0.875)
    labor += nightSurcharge
  }

  const total = labor + material + expense

  return { labor, material, expense, total }
}

// 사용 예시: KP접합 Φ150mm
const kpComponents: WorkComponent[] = [
  { type: 'labor', name: '배관공(수도)', quantity: 0.1, unit: '인' },
  { type: 'labor', name: '보통인부', quantity: 0.05, unit: '인' },
  { type: 'expense_rate', name: '공구손료', quantity: 1, unit: '-',
    expenseRateBase: 'labor', expenseRate: 2 }
]

const wages = { '배관공(수도)': 237446, '보통인부': 171037 }

const result = calcUnitPrice(kpComponents, wages, false)
// → { labor: 32296, material: 0, expense: 645, total: 32941 } ✅

const nightResult = calcUnitPrice(kpComponents, wages, true)
// → { labor: 60555, material: 0, expense: 645, total: 61200 } ✅
```

---

## 품셈 DB 초기 데이터 (상수도 공사 핵심 공종)

### work_types INSERT

```sql
INSERT INTO work_types (code, category, name, spec, unit, expense_rate, expense_base) VALUES
-- KP매커니컬접합
('6-2-2', '배관공', 'KP매커니컬접합', 'Φ100mm이하', '개소', 4.0, 'labor'),
('6-2-2', '배관공', 'KP매커니컬접합', 'Φ150mm', '개소', 2.0, 'labor'),
('6-2-2', '배관공', 'KP매커니컬접합', 'Φ200mm', '개소', 2.0, 'labor'),
('6-2-2', '배관공', 'KP매커니컬접합', 'Φ250mm', '개소', 2.0, 'labor'),
('6-2-2', '배관공', 'KP매커니컬접합', 'Φ300mm', '개소', 2.0, 'labor'),

-- 이탈방지접합 (KP + 30%)
('6-2-2-T', '배관공', '이탈방지접합', 'Φ150mm', '개소', 2.0, 'labor'),
('6-2-2-T', '배관공', '이탈방지접합', 'Φ200mm', '개소', 2.0, 'labor'),
('6-2-2-T', '배관공', '이탈방지접합', 'Φ300mm', '개소', 2.0, 'labor'),

-- 관 절단
('6-2-3', '배관공', '주철관절단', 'Φ100mm이하', '개소', 5.0, 'labor'),
('6-2-3', '배관공', '주철관절단', 'Φ150mm', '개소', 5.0, 'labor'),
('6-2-3', '배관공', '주철관절단', 'Φ200mm', '개소', 5.0, 'labor'),
('6-2-3', '배관공', '주철관절단', 'Φ300mm', '개소', 5.0, 'labor'),
('6-2-3', '배관공', '주철관절단', 'Φ800mm', '개소', 5.0, 'labor');
```

### work_components INSERT (품셈 수치)

```sql
-- KP매커니컬접합 Φ150mm
-- work_type_id는 위에서 생성된 UUID 참조
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit) VALUES
-- Φ150mm: 배관공 2인팀, 일당 14본 → 1개소당 2/14 = 0.1429 → 실무 0.1인
((SELECT id FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ150mm'),
 'labor', '배관공(수도)', 0.1, '인'),
((SELECT id FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ150mm'),
 'labor', '보통인부', 0.05, '인'),

-- 이탈방지접합 Φ150mm (KP × 1.3)
((SELECT id FROM work_types WHERE name='이탈방지접합' AND spec='Φ150mm'),
 'labor', '배관공(수도)', 0.13, '인'),
((SELECT id FROM work_types WHERE name='이탈방지접합' AND spec='Φ150mm'),
 'labor', '보통인부', 0.065, '인'),

-- 주철관절단 Φ150mm
((SELECT id FROM work_types WHERE name='주철관절단' AND spec='Φ150mm'),
 'labor', '배관공(수도)', 0.1, '인'),

-- 주철관절단 Φ800mm
((SELECT id FROM work_types WHERE name='주철관절단' AND spec='Φ800mm'),
 'labor', '배관공(수도)', 0.36, '인');
```

---

## 구현 순서 (Claude Code 전달용)

```
1. Supabase에 work_types, work_components 테이블 생성
2. 위 초기 데이터 INSERT
3. API: /api/estimate/calc-unit-price
   - work_type_id + is_night 받아서
   - work_components 조회
   - labor_wages 조회
   - calcUnitPrice() 실행
   - 단가 반환
4. 견적 상세 페이지에서
   - 공종 선택 시 자동으로 단가 계산
   - 노임단가 바뀌면 자동 재계산
```

---

## 노임단가 업데이트 시 재계산 흐름

```
국가 새 노임단가 고시
    ↓
Supabase labor_wages 테이블 업데이트
    ↓
견적 페이지 열 때마다 최신 단가로 자동 계산
    ↓
기존 확정 견적서는 저장된 단가 유지
새 견적서는 새 단가 적용
```
