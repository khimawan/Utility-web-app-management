-- =====================================================
-- UTILITY MANAGEMENT WEBAPP - DATABASE SCHEMA
-- PostgreSQL
-- =====================================================

-- =====================================================
-- 1. AUTHENTICATION & MEMBER MANAGEMENT
-- =====================================================

CREATE TYPE user_position AS ENUM ('admin', 'member');
CREATE TYPE job_type AS ENUM ('operator_wtp', 'operator_n2', 'facility');
CREATE TYPE shift_type AS ENUM ('1', '2', '3');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    position user_position NOT NULL DEFAULT 'member',
    job job_type,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. PROFILE & CONTENT MANAGEMENT (Admin Editable)
-- =====================================================

CREATE TABLE utility_profile (
    id SERIAL PRIMARY KEY,
    section VARCHAR(100) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    photo_url VARCHAR(500),
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_descriptions (
    id SERIAL PRIMARY KEY,
    job_type job_type NOT NULL,
    title VARCHAR(255),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machines (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    job_type job_type NOT NULL,
    description TEXT,
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 3. SCHEDULE MANAGEMENT
-- =====================================================

CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    schedule_date DATE NOT NULL,
    shift shift_type NOT NULL,
    member_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    job job_type NOT NULL,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_date, shift, member_id)
);

-- =====================================================
-- 4. CHECKLIST SYSTEM
-- =====================================================

-- 13 jenis checklist
CREATE TYPE checklist_category AS ENUM (
    'wtp',
    'boiler',
    'kompressor01',
    'kompressor02',
    'kompressor03',
    'kompressor04',
    'n2_generator',
    'lvmdp',
    'air_tandon',
    'pemakaian_air',
    'pemakaian_gas',
    'suhu_trafo',
    'listrik_trafo'
);

CREATE TYPE parameter_type AS ENUM ('number', 'text', 'boolean', 'status');

CREATE TABLE checklist_templates (
    id SERIAL PRIMARY KEY,
    category checklist_category NOT NULL,
    parameter_name VARCHAR(255) NOT NULL,
    parameter_type parameter_type NOT NULL DEFAULT 'number',
    unit VARCHAR(50),
    min_value DECIMAL,
    max_value DECIMAL,
    default_value VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_entries (
    id SERIAL PRIMARY KEY,
    category checklist_category NOT NULL,
    entry_date DATE NOT NULL,
    shift shift_type NOT NULL,
    machine_id INTEGER REFERENCES machines(id),
    input_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_values (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER REFERENCES checklist_entries(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES checklist_templates(id),
    parameter_value VARCHAR(500),
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 5. WARNING SYSTEM
-- =====================================================

CREATE TYPE warning_status AS ENUM ('open', 'in_progress', 'completed');
CREATE TYPE machine_name AS ENUM (
    'wtp', 'boiler', 'n2_generator',
    'kompressor01', 'kompressor02', 'kompressor03', 'kompressor04'
);

CREATE TABLE warnings (
    id SERIAL PRIMARY KEY,
    warning_date DATE NOT NULL,
    machine_name machine_name NOT NULL,
    description TEXT NOT NULL,
    photo_url VARCHAR(500),
    repair_notes TEXT,
    repair_percentage DECIMAL(5,2) DEFAULT 0 CHECK (repair_percentage >= 0 AND repair_percentage <= 100),
    status warning_status DEFAULT 'open',
    input_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warning_members (
    id SERIAL PRIMARY KEY,
    warning_id INTEGER REFERENCES warnings(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(warning_id, member_id)
);

-- =====================================================
-- 6. WORK / PEKERJAAN SYSTEM (Facility)
-- =====================================================

CREATE TYPE work_status AS ENUM ('open', 'in_progress', 'completed');

CREATE TABLE works (
    id SERIAL PRIMARY KEY,
    work_date DATE NOT NULL,
    area VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    photo_url VARCHAR(500),
    repair_notes TEXT,
    repair_percentage DECIMAL(5,2) DEFAULT 0 CHECK (repair_percentage >= 0 AND repair_percentage <= 100),
    status work_status DEFAULT 'open',
    input_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE work_members (
    id SERIAL PRIMARY KEY,
    work_id INTEGER REFERENCES works(id) ON DELETE CASCADE,
    member_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(work_id, member_id)
);

-- =====================================================
-- 7. SPAREPART MANAGEMENT
-- =====================================================

CREATE TYPE item_category AS ENUM ('alat', 'part', 'bahan');
CREATE TYPE urgency_type AS ENUM ('urgent', 'tidak');
CREATE TYPE order_status AS ENUM ('belum_dipesan', 'sedang_dipesan', 'barang_sampai');

CREATE TABLE spareparts (
    id SERIAL PRIMARY KEY,
    request_date DATE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    specification TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    category item_category NOT NULL,
    urgency urgency_type NOT NULL DEFAULT 'tidak',
    photo_url VARCHAR(500),
    progress order_status DEFAULT 'belum_dipesan',
    input_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 8. INVENTORY (ALAT, PART, BAHAN)
-- =====================================================

CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    category item_category NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    specification TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 9. WORKING INSTRUCTIONS (PDF)
-- =====================================================

CREATE TABLE working_instructions (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    job_type job_type NOT NULL,
    related_machines TEXT,
    file_url VARCHAR(500) NOT NULL,
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 10. PHOTO GALLERY (Utility Profile)
-- =====================================================

CREATE TABLE gallery_photos (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255),
    photo_url VARCHAR(500) NOT NULL,
    caption TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 11. ACTIVITY LOGS (For Rangkuman/Summary)
-- =====================================================

CREATE TYPE activity_type AS ENUM (
    'checklist_submit',
    'warning_input',
    'work_input',
    'warning_update',
    'work_update',
    'sparepart_request'
);

CREATE TABLE activity_logs (
    id SERIAL PRIMARY KEY,
    activity_type activity_type NOT NULL,
    reference_id INTEGER,
    reference_table VARCHAR(100),
    member_id INTEGER REFERENCES users(id),
    shift shift_type,
    job job_type,
    description TEXT,
    activity_date DATE NOT NULL,
    activity_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 12. GENERIC FILE UPLOADS (Photos in tables/lists)
-- =====================================================

CREATE TABLE file_uploads (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255),
    file_url VARCHAR(500) NOT NULL,
    file_type VARCHAR(50),
    related_table VARCHAR(100),
    related_id INTEGER,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 13. BACKUP / IMPORT-EXPORT LOG
-- =====================================================

CREATE TABLE import_export_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    file_format VARCHAR(20),
    file_url VARCHAR(500),
    processed_by INTEGER REFERENCES users(id),
    record_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_position ON users(position);
CREATE INDEX idx_schedules_date ON schedules(schedule_date);
CREATE INDEX idx_schedules_shift ON schedules(shift);
CREATE INDEX idx_checklist_entries_date ON checklist_entries(entry_date);
CREATE INDEX idx_checklist_entries_category ON checklist_entries(category);
CREATE INDEX idx_checklist_values_entry ON checklist_values(entry_id);
CREATE INDEX idx_warnings_date ON warnings(warning_date);
CREATE INDEX idx_warnings_machine ON warnings(machine_name);
CREATE INDEX idx_warnings_status ON warnings(status);
CREATE INDEX idx_works_date ON works(work_date);
CREATE INDEX idx_works_status ON works(status);
CREATE INDEX idx_spareparts_urgency ON spareparts(urgency);
CREATE INDEX idx_spareparts_category ON spareparts(category);
CREATE INDEX idx_spareparts_progress ON spareparts(progress);
CREATE INDEX idx_inventory_category ON inventory_items(category);
CREATE INDEX idx_activity_logs_date ON activity_logs(activity_date);
CREATE INDEX idx_activity_logs_member ON activity_logs(member_id);
CREATE INDEX idx_activity_logs_type ON activity_logs(activity_type);
CREATE INDEX idx_working_instructions_job ON working_instructions(job_type);

-- =====================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_schedules_updated BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_checklist_templates_updated BEFORE UPDATE ON checklist_templates
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_checklist_entries_updated BEFORE UPDATE ON checklist_entries
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_warnings_updated BEFORE UPDATE ON warnings
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_works_updated BEFORE UPDATE ON works
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_spareparts_updated BEFORE UPDATE ON spareparts
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_inventory_updated BEFORE UPDATE ON inventory_items
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_working_instructions_updated BEFORE UPDATE ON working_instructions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_utility_profile_updated BEFORE UPDATE ON utility_profile
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_job_descriptions_updated BEFORE UPDATE ON job_descriptions
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_machines_updated BEFORE UPDATE ON machines
    FOR EACH ROW EXECUTE FUNCTION update_modified_column();
