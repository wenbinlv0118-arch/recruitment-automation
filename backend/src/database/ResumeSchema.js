/**
 * 简历数据库表结构定义
 * 定义了标准化简历数据的数据库表结构
 */
class ResumeSchema {
  /**
   * 验证简历数据完整性
   * @param {Object} resumeData - 简历数据
   * @returns {Object} 验证结果
   */
  static validateResumeData(resumeData) {
    const errors = [];
    const warnings = [];
    
    // 基本验证
    if (!resumeData.id) {
      errors.push('缺少简历ID');
    }
    
    // 基本信息验证
    if (!resumeData.basicInfo || !resumeData.basicInfo.name) {
      warnings.push('缺少候选人姓名');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  /**
   * 获取标准简历数据结构
   * @returns {Object} 标准简历数据结构
   */
  static getStandardResumeStructure() {
    return {
      id: '',
      filename: '',
      source: 'manual',
      basicInfo: {
        name: '',
        gender: '',
        age: null,
        phone: '',
        email: '',
        address: '',
        currentStatus: '',
        selfEvaluation: ''
      },
      jobIntention: {
        expectedPosition: '',
        expectedSalary: '',
        expectedLocation: '',
        jobType: ''
      },
      workExperiences: [],
      projectExperiences: [],
      educationExperiences: [],
      languageSkills: [],
      skills: [],
      certificates: [],
      volunteerExperiences: []
    };
  }
  
  /**
   * 获取创建表的SQL语句数组
   * @returns {Array<string>} SQL语句数组
   */
  static getCreateTableSQL() {
    return [
      // 主简历表
      `CREATE TABLE IF NOT EXISTS resumes (
        id TEXT PRIMARY KEY,
        filename TEXT,
        file_path TEXT,
        source TEXT DEFAULT 'manual',
        quality_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // 基本信息表
      `CREATE TABLE IF NOT EXISTS resume_basic_info (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        name TEXT,
        gender TEXT,
        age INTEGER,
        phone TEXT,
        email TEXT,
        address TEXT,
        current_status TEXT,
        self_evaluation TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 求职意向表
      `CREATE TABLE IF NOT EXISTS resume_job_intention (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        expected_position TEXT,
        expected_salary TEXT,
        expected_location TEXT,
        job_type TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 工作经历表
      `CREATE TABLE IF NOT EXISTS resume_work_experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        company TEXT,
        position TEXT,
        start_date TEXT,
        end_date TEXT,
        description TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 项目经历表
      `CREATE TABLE IF NOT EXISTS resume_project_experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        name TEXT,
        role TEXT,
        start_date TEXT,
        end_date TEXT,
        description TEXT,
        technologies TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 教育经历表
      `CREATE TABLE IF NOT EXISTS resume_education_experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        school TEXT,
        major TEXT,
        degree TEXT,
        start_date TEXT,
        end_date TEXT,
        gpa TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 语言技能表
      `CREATE TABLE IF NOT EXISTS resume_language_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        language TEXT,
        proficiency TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 专业技能表
      `CREATE TABLE IF NOT EXISTS resume_skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        name TEXT,
        level TEXT,
        category TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 证书表
      `CREATE TABLE IF NOT EXISTS resume_certificates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        name TEXT,
        issuer TEXT,
        issue_date TEXT,
        expiry_date TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`,
      
      // 志愿经历表
      `CREATE TABLE IF NOT EXISTS resume_volunteer_experiences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resume_id TEXT NOT NULL,
        organization TEXT,
        role TEXT,
        start_date TEXT,
        end_date TEXT,
        description TEXT,
        FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
      )`
    ];
  }
}

module.exports = ResumeSchema;