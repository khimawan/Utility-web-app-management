# =====================================================
# UTILITY MANAGEMENT WEBAPP
# Database Setup Guide
# =====================================================

# =====================================================
# PREREQUISITES
# =====================================================
# - PostgreSQL 14+ installed
# - psql command line tool or pgAdmin

# =====================================================
# SETUP INSTRUCTIONS
# =====================================================

# 1. CREATE DATABASE
# ---------------------------------------------------
# psql -U postgres
# CREATE DATABASE utility_management;
# \q

# 2. RUN SCHEMA
# ---------------------------------------------------
# psql -U postgres -d utility_management -f database.sql

# 3. RUN SEED DATA
# ---------------------------------------------------
# psql -U postgres -d utility_management -f seed.sql

# =====================================================
# DEFAULT ACCOUNTS
# =====================================================
# ADMIN:
#   Username: adminaja
#   Password: adminaja
#
# MEMBER:
#   Username: member01
#   Password: member01

# =====================================================
# TABLE SUMMARY
# =====================================================
# Total Tables: 19
#
# 1.  users                - Authentication & Members
# 2.  utility_profile      - Landing Page Content
# 3.  job_descriptions     - Job Profiles
# 4.  machines             - Machine Profiles
# 5.  schedules            - Shift Schedules
# 6.  checklist_templates  - Checklist Parameter Definitions
# 7.  checklist_entries    - Daily Checklist Submissions
# 8.  checklist_values     - Parameter Values
# 9.  warnings             - Machine Warnings
# 10. warning_members      - Warning ↔ Member Junction
# 11. works                - Facility Work Jobs
# 12. work_members         - Work ↔ Member Junction
# 13. spareparts           - Sparepart Requests
# 14. inventory_items      - Alat/Part/Bahan Stock
# 15. working_instructions - PDF Working Instructions
# 16. gallery_photos       - Utility Photo Gallery
# 17. activity_logs        - Activity Logs for Summary
# 18. file_uploads         - Generic File Uploads
# 19. import_export_logs   - Import/Export Tracking

# =====================================================
# CHECKLIST CATEGORIES (13 Total)
# =====================================================
# Job 1 (Operator WTP):
#   1.  wtp
#   2.  boiler
#   3.  kompressor01
#   4.  kompressor02
#
# Job 2 (Operator N2):
#   5.  n2_generator
#   6.  kompressor03
#   7.  kompressor04
#   8.  lvmdp
#   9.  air_tandon
#
# Job 3 (Facility):
#   10. pemakaian_air
#   11. pemakaian_gas
#   12. suhu_trafo
#   13. listrik_trafo

# =====================================================
# CUSTOM ENUM TYPES
# =====================================================
# user_position:    admin, member
# job_type:         operator_wtp, operator_n2, facility
# shift_type:       1, 2, 3
# parameter_type:   number, text, boolean, status
# checklist_category: (13 values above)
# machine_name:     wtp, boiler, n2_generator, kompressor01-04
# warning_status:   open, in_progress, completed
# work_status:      open, in_progress, completed
# item_category:    alat, part, bahan
# urgency_type:     urgent, tidak
# order_status:     belum_dipesan, sedang_dipesan, barang_sampai
# activity_type:    checklist_submit, warning_input, work_input, etc.

# =====================================================
# FILE STRUCTURE
# =====================================================
# database.sql      - Main schema (CREATE TABLE, INDEXES, TRIGGERS)
# seed.sql          - Initial data (Users, Machines, Templates)
# DATABASE_ERD.md   - ERD text documentation
# ERD_DIAGRAM.md    - Mermaid ERD diagram
# README.md         - This file
# =====================================================
