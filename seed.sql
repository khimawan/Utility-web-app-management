-- =====================================================
-- SEED DATA - Initial Accounts & Checklist Templates
-- =====================================================

-- =====================================================
-- 1. INITIAL USERS (Admin & Member)
-- =====================================================

INSERT INTO users (name, username, password, position, job) VALUES
    ('Administrator', 'adminaja', 'adminaja', 'admin', NULL),
    ('Member 01', 'member01', 'member01', 'member', 'operator_wtp');

-- =====================================================
-- 2. MACHINES
-- =====================================================

INSERT INTO machines (name, job_type, description) VALUES
    ('WTP', 'operator_wtp', 'Water Treatment Plant'),
    ('Boiler', 'operator_wtp', 'Boiler System'),
    ('Kompressor 01', 'operator_wtp', 'Kompressor 01'),
    ('Kompressor 02', 'operator_wtp', 'Kompressor 02'),
    ('N2 Generator', 'operator_n2', 'Nitrogen Generator'),
    ('Kompressor 03', 'operator_n2', 'Kompressor 03'),
    ('Kompressor 04', 'operator_n2', 'Kompressor 04'),
    ('LVMDP', 'operator_n2', 'Low Voltage Main Distribution Panel'),
    ('Air Tandon', 'operator_n2', 'Air Tandon / Water Tank');

-- =====================================================
-- 3. CHECKLIST TEMPLATES - Default Parameters
-- =====================================================

-- CHECKLIST WTP
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('wtp', 'Tekanan Air Input', 'number', 'bar', 0, 10, 1),
    ('wtp', 'Tekanan Air Output', 'number', 'bar', 0, 10, 2),
    ('wtp', 'Flow Rate', 'number', 'm3/h', 0, 500, 3),
    ('wtp', 'Turbidity Input', 'number', 'NTU', 0, 100, 4),
    ('wtp', 'Turbidity Output', 'number', 'NTU', 0, 10, 5),
    ('wtp', 'pH Air Input', 'number', '', 0, 14, 6),
    ('wtp', 'pH Air Output', 'number', '', 0, 14, 7),
    ('wtp', 'Kondisi Pompa', 'text', '', NULL, NULL, 8),
    ('wtp', 'Kondisi Valve', 'text', '', NULL, NULL, 9),
    ('wtp', 'Level Chemical', 'text', '', NULL, NULL, 10),
    ('wtp', 'Catatan', 'text', '', NULL, NULL, 11);

-- CHECKLIST BOILER
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('boiler', 'Tekanan Uap', 'number', 'bar', 0, 20, 1),
    ('boiler', 'Suhu Air Input', 'number', 'C', 0, 100, 2),
    ('boiler', 'Suhu Air Output', 'number', 'C', 0, 200, 3),
    ('boiler', 'Level Air Boiler', 'number', '%', 0, 100, 4),
    ('boiler', 'Kondensi', 'text', '', NULL, NULL, 5),
    ('boiler', 'Pompa Feed Water', 'text', '', NULL, NULL, 6),
    ('boiler', 'Burner Status', 'text', '', NULL, NULL, 7),
    ('boiler', 'Kondisi Pipa', 'text', '', NULL, NULL, 8),
    ('boiler', 'Catatan', 'text', '', NULL, NULL, 9);

-- CHECKLIST KOMPRESSOR 01
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('kompressor01', 'Tekanan Output', 'number', 'bar', 0, 15, 1),
    ('boiler', 'Suhu Udara Output', 'number', 'C', 0, 100, 2),
    ('kompressor01', 'Level Oli', 'number', '%', 0, 100, 3),
    ('kompressor01', 'Suhu Oli', 'number', 'C', 0, 120, 4),
    ('kompressor01', 'Kondisi Filter', 'text', '', NULL, NULL, 5),
    ('kompressor01', 'Kondisi Belt/Pulley', 'text', '', NULL, NULL, 6),
    ('kompressor01', 'Drain Condensate', 'text', '', NULL, NULL, 7),
    ('kompressor01', 'Catatan', 'text', '', NULL, NULL, 8);

-- CHECKLIST KOMPRESSOR 02
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('kompressor02', 'Tekanan Output', 'number', 'bar', 0, 15, 1),
    ('kompressor02', 'Suhu Udara Output', 'number', 'C', 0, 100, 2),
    ('kompressor02', 'Level Oli', 'number', '%', 0, 100, 3),
    ('kompressor02', 'Suhu Oli', 'number', 'C', 0, 120, 4),
    ('kompressor02', 'Kondisi Filter', 'text', '', NULL, NULL, 5),
    ('kompressor02', 'Kondisi Belt/Pulley', 'text', '', NULL, NULL, 6),
    ('kompressor02', 'Drain Condensate', 'text', '', NULL, NULL, 7),
    ('kompressor02', 'Catatan', 'text', '', NULL, NULL, 8);

-- CHECKLIST KOMPRESSOR 03
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('kompressor03', 'Tekanan Output', 'number', 'bar', 0, 15, 1),
    ('kompressor03', 'Suhu Udara Output', 'number', 'C', 0, 100, 2),
    ('kompressor03', 'Level Oli', 'number', '%', 0, 100, 3),
    ('kompressor03', 'Suhu Oli', 'number', 'C', 0, 120, 4),
    ('kompressor03', 'Kondisi Filter', 'text', '', NULL, NULL, 5),
    ('kompressor03', 'Kondisi Belt/Pulley', 'text', '', NULL, NULL, 6),
    ('kompressor03', 'Drain Condensate', 'text', '', NULL, NULL, 7),
    ('kompressor03', 'Catatan', 'text', '', NULL, NULL, 8);

-- CHECKLIST KOMPRESSOR 04
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('kompressor04', 'Tekanan Output', 'number', 'bar', 0, 15, 1),
    ('kompressor04', 'Suhu Udara Output', 'number', 'C', 0, 100, 2),
    ('kompressor04', 'Level Oli', 'number', '%', 0, 100, 3),
    ('kompressor04', 'Suhu Oli', 'number', 'C', 0, 120, 4),
    ('kompressor04', 'Kondisi Filter', 'text', '', NULL, NULL, 5),
    ('kompressor04', 'Kondisi Belt/Pulley', 'text', '', NULL, NULL, 6),
    ('kompressor04', 'Drain Condensate', 'text', '', NULL, NULL, 7),
    ('kompressor04', 'Catatan', 'text', '', NULL, NULL, 8);

-- CHECKLIST N2 GENERATOR
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('n2_generator', 'Purity N2', 'number', '%', 90, 100, 1),
    ('n2_generator', 'Flow Rate N2', 'number', 'Nm3/h', 0, 500, 2),
    ('n2_generator', 'Tekanan Output N2', 'number', 'bar', 0, 10, 3),
    ('n2_generator', 'Tekanan Input Udara', 'number', 'bar', 0, 10, 4),
    ('n2_generator', 'Suhu Output N2', 'number', 'C', 0, 60, 5),
    ('n2_generator', 'Kondisi Membran/Zeolite', 'text', '', NULL, NULL, 6),
    ('n2_generator', 'Kondisi Valve', 'text', '', NULL, NULL, 7),
    ('n2_generator', 'Level Oli Separator', 'text', '', NULL, NULL, 8),
    ('n2_generator', 'Catatan', 'text', '', NULL, NULL, 9);

-- CHECKLIST LVMDP
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('lvmdp', 'Tegangan R (Volt)', 'number', 'V', 350, 450, 1),
    ('lvmdp', 'Tegangan S (Volt)', 'number', 'V', 350, 450, 2),
    ('lvmdp', 'Tegangan T (Volt)', 'number', 'V', 350, 450, 3),
    ('lvmdp', 'Arus R (Ampere)', 'number', 'A', 0, 2000, 4),
    ('lvmdp', 'Arus S (Ampere)', 'number', 'A', 0, 2000, 5),
    ('lvmdp', 'Arus T (Ampere)', 'number', 'A', 0, 2000, 6),
    ('lvmdp', 'Frekuensi', 'number', 'Hz', 49, 51, 7),
    ('lvmdp', 'Power Factor', 'number', '', 0, 1, 8),
    ('lvmdp', 'Kondisi Panel', 'text', '', NULL, NULL, 9),
    ('lvmdp', 'Suhu Panel', 'number', 'C', 0, 80, 10),
    ('lvmdp', 'Catatan', 'text', '', NULL, NULL, 11);

-- CHECKLIST AIR TANDON
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('air_tandon', 'Level Air Tandon', 'number', '%', 0, 100, 1),
    ('air_tandon', 'Tekanan Pompa', 'number', 'bar', 0, 10, 2),
    ('air_tandon', 'Kondisi Pompa', 'text', '', NULL, NULL, 3),
    ('air_tandon', 'Kondisi Pipa', 'text', '', NULL, NULL, 4),
    ('air_tandon', 'Kualitas Air', 'text', '', NULL, NULL, 5),
    ('air_tandon', 'Catatan', 'text', '', NULL, NULL, 6);

-- CHECKLIST PEMAKAIAN AIR
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('pemakaian_air', 'Meteran Air Awal', 'number', 'm3', 0, 999999, 1),
    ('pemakaian_air', 'Meteran Air Akhir', 'number', 'm3', 0, 999999, 2),
    ('pemakaian_air', 'Total Pemakaian', 'number', 'm3', 0, 999999, 3),
    ('pemakaian_air', 'Catatan', 'text', '', NULL, NULL, 4);

-- CHECKLIST PEMAKAIAN GAS
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('pemakaian_gas', 'Meteran Gas Awal', 'number', 'm3', 0, 999999, 1),
    ('pemakaian_gas', 'Meteran Gas Akhir', 'number', 'm3', 0, 999999, 2),
    ('pemakaian_gas', 'Total Pemakaian', 'number', 'm3', 0, 999999, 3),
    ('pemakaian_gas', 'Tekanan Gas', 'number', 'mbar', 0, 500, 4),
    ('pemakaian_gas', 'Catatan', 'text', '', NULL, NULL, 5);

-- CHECKLIST SUHU TRAFO
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('suhu_trafo', 'Suhu Trafo Fasa R', 'number', 'C', 0, 150, 1),
    ('suhu_trafo', 'Suhu Trafo Fasa S', 'number', 'C', 0, 150, 2),
    ('suhu_trafo', 'Suhu Trafo Fasa T', 'number', 'C', 0, 150, 3),
    ('suhu_trafo', 'Suhu Oil', 'number', 'C', 0, 100, 4),
    ('suhu_trafo', 'Kondisi Trafo', 'text', '', NULL, NULL, 5),
    ('suhu_trafo', 'Catatan', 'text', '', NULL, NULL, 6);

-- CHECKLIST LISTRIK TRAFO
INSERT INTO checklist_templates (category, parameter_name, parameter_type, unit, min_value, max_value, sort_order) VALUES
    ('listrik_trafo', 'Tegangan Primer', 'number', 'kV', 0, 30, 1),
    ('listrik_trafo', 'Tegangan Sekunder', 'number', 'V', 350, 450, 2),
    ('listrik_trafo', 'Arus Primer', 'number', 'A', 0, 1000, 3),
    ('listrik_trafo', 'Arus Sekunder', 'number', 'A', 0, 5000, 4),
    ('listrik_trafo', 'Daya (kVA)', 'number', 'kVA', 0, 5000, 5),
    ('listrik_trafo', 'Power Factor', 'number', '', 0, 1, 6),
    ('listrik_trafo', 'Frekuensi', 'number', 'Hz', 49, 51, 7),
    ('listrik_trafo', 'Kondisi Trafo', 'text', '', NULL, NULL, 8),
    ('listrik_trafo', 'Catatan', 'text', '', NULL, NULL, 9);

-- =====================================================
-- 4. JOB DESCRIPTIONS - Default
-- =====================================================

INSERT INTO job_descriptions (job_type, title, description, sort_order) VALUES
    ('operator_wtp', 'Operator WTP', 'Bertanggung jawab atas operasional Water Treatment Plant, Boiler, dan Kompressor.', 1),
    ('operator_n2', 'Operator N2', 'Bertanggung jawab atas operasional N2 Generator, Kompressor, LVMDP, dan Air Tandon.', 2),
    ('facility', 'Facility', 'Bertanggung jawab atas pemakaian air, gas, suhu trafo, listrik trafo, dan pekerjaan facility.', 3);

-- =====================================================
-- 5. UTILITY PROFILE - Default Content
-- =====================================================

INSERT INTO utility_profile (section, title, description, sort_order) VALUES
    ('team_profile', 'Profil Tim Utility', 'Tim utility bertanggung jawab untuk memastikan kelancaran operasional seluruh sistem pendukung di area produksi.', 1),
    ('jobdesk', 'Jobdesk Utility', 'Tim utility terdiri dari 3 job utama: Operator WTP, Operator N2, dan Facility.', 2);
