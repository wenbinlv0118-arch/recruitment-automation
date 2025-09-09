-- Supabase 初始数据库架构
-- 从 SQLite 迁移到 PostgreSQL

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 公司表
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 知识库文档表
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  upload_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'processing',
  metadata JSONB
);

-- 文档分块表
CREATE TABLE IF NOT EXISTS document_chunks (
  id SERIAL PRIMARY KEY,
  document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INTEGER,
  tags TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 检索日志表
CREATE TABLE IF NOT EXISTS retrieval_logs (
  id SERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  retrieved_chunks TEXT,
  response_quality INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 简历主表
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT,
  file_path TEXT,
  source TEXT DEFAULT 'manual',
  quality_score INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 简历基本信息表
CREATE TABLE IF NOT EXISTS resume_basic_info (
  id SERIAL PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  name TEXT,
  gender TEXT,
  age INTEGER,
  phone TEXT,
  email TEXT,
  address TEXT,
  current_status TEXT,
  self_evaluation TEXT
);

-- 求职意向表
CREATE TABLE IF NOT EXISTS resume_job_intention (
  id SERIAL PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  expected_position TEXT,
  expected_salary TEXT,
  expected_location TEXT,
  job_type TEXT
);

-- 工作经历表
CREATE TABLE IF NOT EXISTS resume_work_experiences (
  id SERIAL PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  company_name TEXT,
  position TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  achievements TEXT
);

-- 教育背景表
CREATE TABLE IF NOT EXISTS resume_education (
  id SERIAL PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  school_name TEXT,
  major TEXT,
  degree TEXT,
  start_date DATE,
  end_date DATE,
  gpa TEXT,
  description TEXT
);

-- 项目经历表
CREATE TABLE IF NOT EXISTS resume_projects (
  id SERIAL PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  project_name TEXT,
  role TEXT,
  start_date DATE,
  end_date DATE,
  description TEXT,
  technologies TEXT,
  achievements TEXT
);

-- 技能表
CREATE TABLE IF NOT EXISTS resume_skills (
  id SERIAL PRIMARY KEY,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  skill_name TEXT,
  skill_level TEXT,
  category TEXT
);

-- 任务表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  platform TEXT,
  recruitment_status TEXT,
  assigned_to TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 职位表
CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  company TEXT,
  location TEXT,
  salary_range TEXT,
  requirements TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公司搜索历史表
CREATE TABLE IF NOT EXISTS company_search_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  search_query TEXT NOT NULL,
  search_filters JSONB,
  results_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公司分析报告表
CREATE TABLE IF NOT EXISTS company_analysis_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  industry TEXT,
  size TEXT,
  analysis_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_resumes_source ON resumes(source);
CREATE INDEX IF NOT EXISTS idx_resumes_status ON resumes(status);
CREATE INDEX IF NOT EXISTS idx_resumes_quality_score ON resumes(quality_score);
CREATE INDEX IF NOT EXISTS idx_resume_basic_info_resume_id ON resume_basic_info(resume_id);
CREATE INDEX IF NOT EXISTS idx_resume_basic_info_name ON resume_basic_info(name);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要自动更新时间的表创建触发器
CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON resumes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON positions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_analysis_reports_updated_at BEFORE UPDATE ON company_analysis_reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 插入默认公司数据
INSERT INTO companies (name, description) VALUES 
('默认公司', '系统默认公司，用于测试和演示')
ON CONFLICT DO NOTHING;

-- 创建 RLS (Row Level Security) 策略（可选）
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

COMMIT;