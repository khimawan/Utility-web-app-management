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
#    ├── parameter_type (number/text/boolean/status/select/select_oli/select_bocor)
#    ├── unit
#    ├── min_value
#    ├── max_value
#    ├── default_value
#    ├── is_active
#    └── sort_order

# 7. CHECKLIST_ENTRIES (Daily Checklist Submissions)
#    └── id (PK)
#    ├── category
#    ├── entry_date
#    ├── shift
#    ├── machine_id ──FK──► machines.id
#    ├── input_by ──FK──► users.id
#    ├── notes
#    └── photo_url

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

# 15. PEMINJAMAN_ALAT (Tool Borrowing)
#     └── id (PK)
#     ├── borrower_name
#     ├── division
#     ├── location
#     ├── borrow_time
#     ├── borrow_date
#     ├── items (JSON array of {id, name})
#     ├── duration_days
#     ├── duration_hours
#     ├── duration_minutes
#     ├── status (dipinjam/sudah_kembali)
#     ├── photo_url
#     └── input_by ──FK──► users.id

# 16. PEMAKAIAN_PART (Part & Material Usage)
#     └── id (PK)
#     ├── project_name
#     ├── member_ids (JSON array of user IDs)
#     ├── items (JSON array of {id, qty, name})
#     └── input_by ──FK──► users.id

# 17. WORKING_INSTRUCTIONS (PDF Files)
#     └── id (PK)
#     ├── title
#     ├── job_type
#     ├── related_machines
#     ├── file_url
#     ├── description
#     └── uploaded_by ──FK──► users.id

# 18. GALLERY_PHOTOS (Utility Profile Gallery)
#     └── id (PK)
#     ├── title
#     ├── photo_url
#     ├── caption
#     └── uploaded_by ──FK──► users.id

# 19. ACTIVITY_LOGS (Summary/Rangkuman Data)
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

# 20. OVERTIME_SUBMISSIONS
#     └── id (PK)
#     ├── overtime_date
#     ├── shift
#     ├── schedule_type
#     ├── job
#     ├── assigned_job
#     ├── status (pending/approved/rejected)
#     ├── submitted_by ──FK──► users.id
#     ├── admin_notes
#     └── created_at

# 21. OVERTIME_MEMBERS
#     └── id (PK)
#     ├── submission_id ──FK──► overtime_submissions.id (CASCADE DELETE)
#     └── member_id ──FK──► users.id (CASCADE DELETE)

# 22. UTILITY_REQUESTS (Public Utility Requests)
#     └── id (PK)
#     ├── requester_name
#     ├── position
#     ├── whatsapp
#     ├── work_area
#     ├── building
#     ├── issue
#     ├── priority (Low/Medium/High)
#     ├── photo_url
#     ├── status (open/in_progress/completed/closed/diluar_scope/on_hold)
#     ├── repair_notes
#     ├── repair_percentage
#     └── created_at

# 23. UTILITY_REQUEST_MEMBERS (Manpower Assignment)
#     └── id (PK)
#     ├── request_id ──FK──► utility_requests.id (CASCADE DELETE)
#     └── member_id ──FK──► users.id (CASCADE DELETE)

# 24. UTILITY_LANDING_CONTENT (Public Landing Page Content)
#     └── id (PK)
#     ├── content_key (UNIQUE)
#     ├── content_value
#     └── content_image

# Custom checklist tables: checklist_wtp, checklist_boiler, checklist_n2, checklist_kompressor

# =====================================================
# RELATIONSHIP SUMMARY
# =====================================================
#
# users ──1:N──► schedules
# users ──1:N──► checklist_entries
# users ──1:N──► warnings
# users ──1:N──► works
# users ──1:N──► spareparts
# users ──1:N──► peminjaman_alat
# users ──1:N──► pemakaian_part
# users ──1:N──► working_instructions
# users ──1:N──► gallery_photos
# users ──1:N──► activity_logs
# users ──1:N──► overtime_submissions
# users ──1:N──► overtime_members
# users ──1:N──► utility_request_members
#
# machines ──1:N──► checklist_entries
#
# checklist_templates ──1:N──► checklist_values
# checklist_entries ──1:N──► checklist_values
#
# warnings ──N:M──► users (via warning_members)
# works ──N:M──► users (via work_members)
# overtime_submissions ──N:M──► users (via overtime_members)
# utility_requests ──N:M──► users (via utility_request_members)
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
#    ├── Peminjaman Alat: peminjaman_alat, inventory_items
#    ├── Pemakaian Part & Bahan: pemakaian_part, inventory_items, users
#    ├── Utility Requests: utility_requests, utility_request_members
#    └── Member & Jadwal: users, schedules, overtime_submissions, overtime_members
#
# 3. HALAMAN JOB 1 (Operator WTP)
#    ├── Profile: job_descriptions, machines
#    ├── Checklist WTP: checklist_wtp
#    ├── Checklist Boiler: checklist_boiler
#    ├── Checklist Kompressor: checklist_kompressor
#    ├── Warning: warnings, warning_members
#    └── Working Instruction: working_instructions
#
# 4. HALAMAN JOB 2 (Operator N2)
#    ├── Profile: job_descriptions, machines
#    ├── Checklist N2 Generator: checklist_n2
#    ├── Checklist Kompressor: checklist_kompressor
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
#    ├── Checklist Energi Listrik: checklist_entries(category=energi_listrik), checklist_values
#    └── Pekerjaan: works, work_members
#
# 6. HALAMAN PEMINJAMAN ALAT
#    └── peminjaman_alat, inventory_items
#
# 7. HALAMAN PEMAKAIAN PART & BAHAN
#    └── pemakaian_part, inventory_items, users
#
# 8. HALAMAN RANGKUMAN
#    └── activity_logs, schedules, warnings, works
#
# 9. HALAMAN ALAT & BAHAN
#    └── inventory_items
#
# 10. HALAMAN ADMIN
#     └── users, schedules, checklist_templates
#
# =====================================================
# CHECKLIST CATEGORIES (14 Total)
# =====================================================
# 1.  wtp                  → Job 1 (Operator WTP)
# 2.  boiler               → Job 1 (Operator WTP)
# 3.  kompressor01         → Job 1 (Operator WTP) 
# 4.  kompressor02         → Job 1 (Operator WTP)
# 5.  n2_generator         → Job 2 (Operator N2)
# 6.  kompressor03         → Job 2 (Operator N2)
# 7.  kompressor04         → Job 2 (Operator N2)
# 8.  lvmdp                → Job 2 (Operator N2)
# 9.  air_tandon           → Job 2 (Operator N2)
# 10. pemakaian_air        → Job 3 (Facility)
# 11. pemakaian_gas        → Job 3 (Facility)
# 12. suhu_trafo           → Job 3 (Facility)
# 13. energi_listrik       → Job 3 (Facility)
# 14. listrik_trafo        → Legacy (migrated to energi_listrik)
# =====================================================
