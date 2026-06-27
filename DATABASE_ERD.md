# =====================================================
# DATABASE ERD DOCUMENTATION
# Utility Management Webapp
# =====================================================

# =====================================================
# RELATIONSHIP MAP
# =====================================================

# 1. USERS (Authentication & Member Management)
#    └── id (PK)
#    ├── name
#    ├── username (UNIQUE)
#    ├── password
#    ├── position (admin/member)
#    ├── job (operator_wtp/operator_n2/facility)
#    └── is_active

# 2. UTILITY_PROFILE (Landing Page Content - Admin Editable)
#    └── id (PK)
#    ├── section
#    ├── title
#    ├── description
#    ├── photo_url
#    └── sort_order

# 3. JOB_DESCRIPTIONS (Job Profiles - Admin Editable)
#    └── id (PK)
#    ├── job_type (operator_wtp/operator_n2/facility)
#    ├── title
#    ├── description
#    └── sort_order

# 4. MACHINES (Machine Profiles - Admin Editable)
#    └── id (PK)
#    ├── name (UNIQUE)
#    ├── job_type
#    ├── description
#    └── photo_url

# 5. SCHEDULES (Shift Management)
#    └── id (PK)
#    ├── schedule_date
#    ├── shift (1/2/3)
#    ├── member_id ──FK──► users.id
#    ├── job
#    └── created_by ──FK──► users.id

# 6. CHECKLIST_TEMPLATES (Parameter Definitions)
#    └── id (PK)
#    ├── category (wtp/boiler/kompressor01-04/n2/lvmdp/etc)
#    ├── parameter_name
#    ├── parameter_type (number/text/boolean/status)
#    ├── unit
#    ├── min_value
#    ├── max_value
#    └── sort_order

# 7. CHECKLIST_ENTRIES (Daily Checklist Submissions)
#    └── id (PK)
#    ├── category
#    ├── entry_date
#    ├── shift
#    ├── machine_id ──FK──► machines.id
#    └── input_by ──FK──► users.id

# 8. CHECKLIST_VALUES (Parameter Values)
#    └── id (PK)
#    ├── entry_id ──FK──► checklist_entries.id (CASCADE DELETE)
#    ├── template_id ──FK──► checklist_templates.id
#    ├── parameter_value
#    └── photo_url

# 9. WARNINGS (Machine Warnings)
#    └── id (PK)
#    ├── warning_date
#    ├── machine_name (wtp/boiler/n2_generator/kompressor01-04)
#    ├── description
#    ├── photo_url
#    ├── repair_notes
#    ├── repair_percentage (0-100)
#    ├── status (open/in_progress/completed)
#    └── input_by ──FK──► users.id

# 10. WARNING_MEMBERS (Junction: Warning ↔ Members)
#     └── id (PK)
#     ├── warning_id ──FK──► warnings.id (CASCADE DELETE)
#     └── member_id ──FK──► users.id (CASCADE DELETE)

# 11. WORKS (Facility Work Jobs)
#     └── id (PK)
#     ├── work_date
#     ├── area
#     ├── description
#     ├── photo_url
#     ├── repair_notes
#     ├── repair_percentage (0-100)
#     ├── status (open/in_progress/completed)
#     └── input_by ──FK──► users.id

# 12. WORK_MEMBERS (Junction: Work ↔ Members)
#     └── id (PK)
#     ├── work_id ──FK──► works.id (CASCADE DELETE)
#     └── member_id ──FK──► users.id (CASCADE DELETE)

# 13. SPAREPARTS (Sparepart Requests)
#     └── id (PK)
#     ├── request_date
#     ├── item_name
#     ├── specification
#     ├── quantity
#     ├── category (alat/part/bahan)
#     ├── urgency (urgent/tidak)
#     ├── photo_url
#     ├── progress (belum_dipesan/sedang_dipesan/barang_sampai)
#     └── input_by ──FK──► users.id

# 14. INVENTORY_ITEMS (Alat/Part/Bahan Stock)
#     └── id (PK)
#     ├── category (alat/part/bahan)
#     ├── item_name
#     ├── specification
#     ├── quantity
#     └── photo_url

# 15. WORKING_INSTRUCTIONS (PDF Files)
#     └── id (PK)
#     ├── title
#     ├── job_type
#     ├── related_machines
#     ├── file_url
#     ├── description
#     └── uploaded_by ──FK──► users.id

# 16. GALLERY_PHOTOS (Utility Profile Gallery)
#     └── id (PK)
#     ├── title
#     ├── photo_url
#     ├── caption
#     └── uploaded_by ──FK──► users.id

# 17. ACTIVITY_LOGS (Summary/Rangkuman Data)
#     └── id (PK)
#     ├── activity_type (checklist_submit/warning_input/work_input/etc)
#     ├── reference_id
#     ├── reference_table
#     ├── member_id ──FK──► users.id
#     ├── shift
#     ├── job
#     ├── description
#     ├── activity_date
#     └── activity_time

# 18. FILE_UPLOADS (Generic Photo Uploads)
#     └── id (PK)
#     ├── original_name
#     ├── file_url
#     ├── file_type
#     ├── related_table
#     ├── related_id
#     └── uploaded_by ──FK──► users.id

# 19. IMPORT_EXPORT_LOGS (Import/Export Tracking)
#     └── id (PK)
#     ├── action
#     ├── table_name
#     ├── file_format
#     ├── file_url
#     ├── processed_by ──FK──► users.id
#     └── record_count

# =====================================================
# RELATIONSHIP SUMMARY
# =====================================================
#
# users ──1:N──► schedules
# users ──1:N──► checklist_entries
# users ──1:N──► warnings
# users ──1:N──► works
# users ──1:N──► spareparts
# users ──1:N──► working_instructions
# users ──1:N──► gallery_photos
# users ──1:N──► activity_logs
# users ──1:N──► file_uploads
# users ──1:N──► import_export_logs
#
# machines ──1:N──► checklist_entries
#
# checklist_templates ──1:N──► checklist_values
# checklist_entries ──1:N──► checklist_values
#
# warnings ──N:M──► users (via warning_members)
# works ──N:M──► users (via work_members)
#
# =====================================================
# PAGE MAPPING TO TABLES
# =====================================================
#
# 1. HALAMAN LOGIN
#    └── users
#
# 2. HALAMAN AWAL
#    ├── Profile: utility_profile, gallery_photos
#    ├── Summary Data: checklist_entries, checklist_values, checklist_templates
#    ├── Warning & Pekerjaan: warnings, works, warning_members, work_members
#    ├── Sparepart: spareparts
#    └── Member & Jadwal: users, schedules
#
# 3. HALAMAN JOB 1 (Operator WTP)
#    ├── Profile: job_descriptions, machines
#    ├── Checklist WTP: checklist_entries(category=wtp), checklist_values
#    ├── Checklist Boiler: checklist_entries(category=boiler), checklist_values
#    ├── Checklist Kompressor 01-02: checklist_entries(category=kompressor01/02), checklist_values
#    ├── Warning: warnings, warning_members
#    └── Working Instruction: working_instructions
#
# 4. HALAMAN JOB 2 (Operator N2)
#    ├── Profile: job_descriptions, machines
#    ├── Checklist N2 Generator: checklist_entries(category=n2_generator), checklist_values
#    ├── Checklist Kompressor 03-04: checklist_entries(category=kompressor03/04), checklist_values
#    ├── Checklist LVMDP: checklist_entries(category=lvmdp), checklist_values
#    ├── Checklist Air Tandon: checklist_entries(category=air_tandon), checklist_values
#    ├── Warning: warnings, warning_members
#    └── Working Instruction: working_instructions
#
# 5. HALAMAN JOB 3 (Facility)
#    ├── Profile: job_descriptions, machines
#    ├── Checklist Pemakaian Air: checklist_entries(category=pemakaian_air), checklist_values
#    ├── Checklist Pemakaian Gas: checklist_entries(category=pemakaian_gas), checklist_values
#    ├── Checklist Suhu Trafo: checklist_entries(category=suhu_trafo), checklist_values
#    ├── Checklist Listrik Trafo: checklist_entries(category=listrik_trafo), checklist_values
#    └── Pekerjaan: works, work_members
#
# 6. HALAMAN RANGKUMAN
#    └── activity_logs, schedules, warnings, works
#
# 7. HALAMAN ALAT & BAHAN
#    └── inventory_items
#
# 8. HALAMAN ADMIN
#    └── users, schedules, checklist_templates
#
# =====================================================
# CHECKLIST CATEGORIES (13 Total)
# =====================================================
# 1.  wtp             → Job 1 (Operator WTP)
# 2.  boiler          → Job 1 (Operator WTP)
# 3.  kompressor01    → Job 1 (Operator WTP)
# 4.  kompressor02    → Job 1 (Operator WTP)
# 5.  n2_generator    → Job 2 (Operator N2)
# 6.  kompressor03    → Job 2 (Operator N2)
# 7.  kompressor04    → Job 2 (Operator N2)
# 8.  lvmdp           → Job 2 (Operator N2)
# 9.  air_tandon      → Job 2 (Operator N2)
# 10. pemakaian_air   → Job 3 (Facility)
# 11. pemakaian_gas   → Job 3 (Facility)
# 12. suhu_trafo      → Job 3 (Facility)
# 13. listrik_trafo   → Job 3 (Facility)
# =====================================================
