-- ============================================================
-- work_types : 공종 마스터 (품셈 코드 + 손료율)
-- work_components : 품셈 구성 (인력/장비/재료 품 수량)
-- ============================================================

CREATE TABLE IF NOT EXISTS work_types (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  code           VARCHAR(50),
  category       VARCHAR(100),
  name           VARCHAR(200),
  spec           VARCHAR(200),
  unit           VARCHAR(20),
  expense_rate   DECIMAL(5,2) DEFAULT 0,
  expense_base   VARCHAR(50)  DEFAULT 'labor',
  night_surcharge DECIMAL(5,2) DEFAULT 87.5,
  notes          TEXT,
  created_at     TIMESTAMP    DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_components (
  id              UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  work_type_id    UUID         REFERENCES work_types(id) ON DELETE CASCADE,
  component_type  VARCHAR(20),
  component_name  VARCHAR(100),
  quantity        DECIMAL(8,4),
  unit            VARCHAR(20),
  daily_output    DECIMAL(10,3),
  sort_order      INTEGER      DEFAULT 0
);

-- ============================================================
-- 공종 마스터 데이터
-- ============================================================
INSERT INTO work_types (code, category, name, spec, unit, expense_rate, expense_base) VALUES
  -- KP매커니컬접합 (품셈 6-2-2)
  ('6-2-2', '배관공', 'KP매커니컬접합', 'Φ100mm이하', '개소', 4.0, 'labor'),
  ('6-2-2', '배관공', 'KP매커니컬접합', 'Φ150mm',     '개소', 2.0, 'labor'),
  ('6-2-2', '배관공', 'KP매커니컬접합', 'Φ200mm',     '개소', 2.0, 'labor'),
  ('6-2-2', '배관공', 'KP매커니컬접합', 'Φ250mm',     '개소', 2.0, 'labor'),
  ('6-2-2', '배관공', 'KP매커니컬접합', 'Φ300mm',     '개소', 2.0, 'labor'),
  -- 이탈방지접합 (KP × 1.3, 품셈 6-2-2 주④)
  ('6-2-2-T', '배관공', '이탈방지접합', 'Φ150mm', '개소', 2.0, 'labor'),
  ('6-2-2-T', '배관공', '이탈방지접합', 'Φ200mm', '개소', 2.0, 'labor'),
  ('6-2-2-T', '배관공', '이탈방지접합', 'Φ300mm', '개소', 2.0, 'labor'),
  -- 주철관 절단 (품셈 6-2-3)
  ('6-2-3', '배관공', '주철관절단', 'Φ100mm이하', '개소', 5.0, 'labor'),
  ('6-2-3', '배관공', '주철관절단', 'Φ150mm',     '개소', 5.0, 'labor'),
  ('6-2-3', '배관공', '주철관절단', 'Φ200mm',     '개소', 5.0, 'labor'),
  ('6-2-3', '배관공', '주철관절단', 'Φ300mm',     '개소', 5.0, 'labor'),
  ('6-2-3', '배관공', '주철관절단', 'Φ800mm',     '개소', 5.0, 'labor');

-- ============================================================
-- 품셈 구성 데이터 (인력 품 수량)
-- ============================================================

-- KP매커니컬접합 Φ100mm이하 (17본/일, 2인팀 → 2/17≈0.12인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.12, '인', 0 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ100mm이하';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.06, '인', 1 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ100mm이하';

-- KP매커니컬접합 Φ150mm (14본/일, 2인팀 → 실무 0.1인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.10, '인', 0 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ150mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.05, '인', 1 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ150mm';

-- KP매커니컬접합 Φ200mm (11본/일, 2인팀 → 2/11≈0.18인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.18, '인', 0 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ200mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.09, '인', 1 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ200mm';

-- KP매커니컬접합 Φ250mm (10본/일, 2인팀 → 0.2인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.20, '인', 0 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ250mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.10, '인', 1 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ250mm';

-- KP매커니컬접합 Φ300mm (8본/일, 2인팀 → 0.25인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.25, '인', 0 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ300mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.13, '인', 1 FROM work_types WHERE name='KP매커니컬접합' AND spec='Φ300mm';

-- 이탈방지접합 Φ150mm (KP × 1.3 → 배관공 0.1×1.3=0.13인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.130, '인', 0 FROM work_types WHERE name='이탈방지접합' AND spec='Φ150mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.065, '인', 1 FROM work_types WHERE name='이탈방지접합' AND spec='Φ150mm';

-- 이탈방지접합 Φ200mm (KP × 1.3 → 0.18×1.3=0.234인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.234, '인', 0 FROM work_types WHERE name='이탈방지접합' AND spec='Φ200mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.117, '인', 1 FROM work_types WHERE name='이탈방지접합' AND spec='Φ200mm';

-- 이탈방지접합 Φ300mm (KP × 1.3 → 0.25×1.3=0.325인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.325, '인', 0 FROM work_types WHERE name='이탈방지접합' AND spec='Φ300mm';
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '보통인부',     0.169, '인', 1 FROM work_types WHERE name='이탈방지접합' AND spec='Φ300mm';

-- 주철관절단 Φ100mm이하 (배관공 0.08인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.08, '인', 0 FROM work_types WHERE name='주철관절단' AND spec='Φ100mm이하';

-- 주철관절단 Φ150mm (배관공 0.10인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.10, '인', 0 FROM work_types WHERE name='주철관절단' AND spec='Φ150mm';

-- 주철관절단 Φ200mm (배관공 0.12인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.12, '인', 0 FROM work_types WHERE name='주철관절단' AND spec='Φ200mm';

-- 주철관절단 Φ300mm (배관공 0.16인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.16, '인', 0 FROM work_types WHERE name='주철관절단' AND spec='Φ300mm';

-- 주철관절단 Φ800mm (배관공 0.36인)
INSERT INTO work_components (work_type_id, component_type, component_name, quantity, unit, sort_order)
SELECT id, 'labor', '배관공(수도)', 0.36, '인', 0 FROM work_types WHERE name='주철관절단' AND spec='Φ800mm';
