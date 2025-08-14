const fs = require('fs-extra');
const path = require('path');

/**
 * 简历解析服务
 * 负责解析各种格式的简历文件和文本，提取关键信息
 */
class ResumeParserService {
  constructor() {
    // 支持的文件类型
    this.supportedFileTypes = ['.pdf', '.doc', '.docx'];
    
    // 正则表达式模式
    this.patterns = {
      // 手机号模式
      phone: /1[3-9]\d{9}/g,
      // 邮箱模式
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // 姓名模式（常见中文姓名）
      name: /[\u4e00-\u9fa5]{2,4}(?=\s*[\u4e00-\u9fa5]*[：:])/g,
      // 学历模式
      education: /(?:学历|教育背景|毕业院校)[:：]\s*([\u4e00-\u9fa5]+)/g,
      // 工作经验模式
      experience: /(?:工作经验|工作年限|工作经历)[:：]\s*(\d+)[\u4e00-\u9fa5]*/g,
      // 技能模式
      skills: /(?:技能|专长|擅长)[:：]\s*([^\n]+)/g,
      // 职位模式
      position: /(?:应聘职位|求职意向|期望职位)[:：]\s*([\u4e00-\u9fa5\w\s]+)/g
    };
  }

  /**
   * 解析PDF简历文件
   * @param {Buffer} buffer - PDF文件缓冲区
   * @returns {Object} 解析结果
   */
  async parsePDFResume(buffer) {
    try {
      // 这里需要安装 pdf-parse 包
      // const pdfParse = require('pdf-parse');
      // const data = await pdfParse(buffer);
      // const text = data.text;
      
      // 由于pdf-parse需要额外安装，这里先用模拟数据
      const text = this.extractTextFromPDF(buffer);
      return this.parseResumeText(text);
    } catch (error) {
      console.error('PDF解析失败:', error);
      throw new Error('PDF文件解析失败');
    }
  }

  /**
   * 解析DOCX简历文件
   * @param {Buffer} buffer - DOCX文件缓冲区
   * @returns {Object} 解析结果
   */
  async parseDOCXResume(buffer) {
    try {
      // 这里需要安装 mammoth 包
      // const mammoth = require('mammoth');
      // const result = await mammoth.extractRawText({ buffer });
      // const text = result.value;
      
      // 由于mammoth需要额外安装，这里先用模拟数据
      const text = this.extractTextFromDOCX(buffer);
      return this.parseResumeText(text);
    } catch (error) {
      console.error('DOCX解析失败:', error);
      throw new Error('DOCX文件解析失败');
    }
  }

  /**
   * 解析文本简历（Boss直聘结构）
   * @param {string} text - 简历文本内容
   * @returns {Object} 解析结果
   */
  parseResumeText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('无效的文本内容');
    }

    const result = {
      // 基础信息
      name: this.extractName(text),
      age: this.extractAge(text),
      workYears: this.extractWorkYears(text),
      education: this.extractEducation(text),
      currentStatus: this.extractCurrentStatus(text),
      
      // 联系方式（可选）
      phone: this.extractPhone(text),
      email: this.extractEmail(text),
      
      // 个人简介
      selfIntroduction: this.extractSelfIntroduction(text),
      summary: this.extractSelfIntroduction(text), // 兼容性字段
      
      // 期望职位信息
      expectedPosition: this.extractExpectedPosition(text),
      
      // 岗位经验（修复：确保只调用一次）
      positionExperience: this.extractPositionExperience(text),
      
      // 工作经历（多条）
      workExperience: this.extractWorkExperience(text),
      
      // 教育经历
      educationExperience: this.extractEducationExperience(text),
      
      // 资格证书（可选）- 优化为识别资格证书类技能
      certificates: this.extractCertificates(text),
      
      // 志愿经历（可选）
      volunteerExperience: this.extractVolunteerExperience(text),
      
      // 技能（保留原有逻辑）
      skills: this.extractSkills(text),
      
      parseStatus: 'completed',
      qualityScore: this.calculateQualityScore(text)
    };

    return result;
  }

  /**
   * 提取姓名
   * @param {string} text - 文本内容
   * @returns {string} 姓名
   */
  extractName(text) {
    // 尝试多种姓名提取模式
    const patterns = [
      // 标准格式：姓名: xxx
      /(?:姓名|名字)[:：]\s*([\u4e00-\u9fa5a-zA-Z]{2,10})/,
      // 简历开头的姓名（中英文混合）
      /^\s*([\u4e00-\u9fa5]{1,3}(?:先生|女士)?[a-zA-Z]*[\u4e00-\u9fa5]*)/m,
      // 姓名后跟年龄
      /([\u4e00-\u9fa5]{2,4}(?:先生|女士)?[a-zA-Z]*)\s*\n?\s*\d+岁/,
      // 行首的中文姓名
      /^\s*([\u4e00-\u9fa5]{2,4}(?:先生|女士)?[a-zA-Z]*)\s*$/m
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let name = match[1].trim();
        // 过滤掉一些常见的非姓名词汇
        if (!['工作', '经验', '教育', '技能', '项目', '公司', '学院', '大学'].some(word => name.includes(word))) {
          return name;
        }
      }
    }

    return null;
  }

  /**
   * 提取手机号
   * @param {string} text - 文本内容
   * @returns {string} 手机号
   */
  extractPhone(text) {
    const match = text.match(this.patterns.phone);
    return match ? match[0] : null;
  }

  /**
   * 提取邮箱
   * @param {string} text - 文本内容
   * @returns {string} 邮箱
   */
  extractEmail(text) {
    const match = text.match(this.patterns.email);
    return match ? match[0] : null;
  }

  /**
   * 提取年龄
   * @param {string} text - 文本内容
   * @returns {string} 年龄
   */
  extractAge(text) {
    // 尝试多种年龄提取模式
    const agePatterns = [
      // 标准格式：年龄: xx岁
      /(?:年龄)[:：]\s*(\d{1,2})岁?/,
      // 直接的年龄描述
      /(\d{1,2})岁/,
      // 年龄范围
      /(\d{1,2})-\d{1,2}岁/,
      // 姓名后跟年龄
      /[\u4e00-\u9fa5]{2,4}(?:先生|女士)?[a-zA-Z]*\s*\n?\s*(\d{1,2})岁/
    ];

    for (const pattern of agePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const age = parseInt(match[1]);
        // 验证年龄范围合理性（18-70岁）
        if (age >= 18 && age <= 70) {
          return `${age}岁`;
        }
      }
    }

    return null;
  }

  /**
   * 提取工作年限
   * @param {string} text - 文本内容
   * @returns {string} 工作年限
   */
  extractWorkYears(text) {
    const workYearPatterns = [
      // 标准格式：工作年限: x年
      /(?:工作年限|工作经验)[:：]\s*(\d+)年/,
      // 直接描述：x年工作经验
      /(\d+)年工作经验/,
      // 经验年限
      /经验[:：]\s*(\d+)年/,
      // 工作x年
      /工作(\d+)年/,
      // x年以上经验
      /(\d+)年以上/
    ];

    for (const pattern of workYearPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return `${match[1]}年`;
      }
    }

    return null;
  }

  /**
   * 提取目前状态
   * @param {string} text - 文本内容
   * @returns {string} 目前状态
   */
  extractCurrentStatus(text) {
    const statusPatterns = [
      // 标准格式
      /(?:目前状态|当前状态|工作状态)[:：]\s*([^\n]+)/,
      // 直接状态描述
      /(离职|在职|待业|求职中|可立即到岗|需要\d+个月)/,
      // 离职时间相关
      /(已离职|正在离职|考虑机会)/
    ];

    for (const pattern of statusPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * 提取个人简介
   * @param {string} text - 文本内容
   * @returns {string} 个人简介
   */
  extractSelfIntroduction(text) {
    // Boss直聘格式：基本信息后到"最近关注"之前的内容就是个人简介
    const bossPattern = /(?:离职|在职|待业)[-\s]*(?:随时到岗|\d+天后到岗)?\s*\n([\s\S]*?)(?=最近关注|期望职位|岗位经验|工作经历|$)/;
    const bossMatch = text.match(bossPattern);
    
    if (bossMatch && bossMatch[1]) {
      let intro = bossMatch[1].trim();
      // 清理内容，移除多余的空行和数字编号
      intro = intro.replace(/^\s*\d+\.?\s*/gm, '').replace(/\n\s*\n/g, '\n').trim();
      
      if (intro.length > 20) {
        return intro;
      }
    }
    
    // 标准格式备用
    const standardPatterns = [
      /(?:个人简介|自我介绍|个人描述|简介)[:：]\s*([\s\S]*?)(?=\n\n|期望职位|工作经历|教育经历|$)/,
      // 段落形式的简介（通常在基本信息后）
      /(?:年龄|学历|状态)[^\n]*\n\s*([\s\S]{50,300}?)(?=\n\n|期望|工作|教育|$)/
    ];

    for (const pattern of standardPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const intro = match[1].trim();
        // 过滤掉太短或明显不是简介的内容
        if (intro.length > 20 && !intro.includes('工作经历') && !intro.includes('教育经历') && !intro.includes('期望职位')) {
          return intro;
        }
      }
    }

    return null;
  }

  /**
   * 提取期望职位信息
   * @param {string} text - 文本内容
   * @returns {Object} 期望职位信息
   */
  extractExpectedPosition(text) {
    const expectedPos = {
      position: null,
      location: null,
      industry: null,
      salary: null
    };

    // 提取期望职位 - 优化：从"最近关注"部分提取期望职位
    const recentFocusMatch = text.match(/最近关注[\s\S]*?深圳[\s\S]*?([\u4e00-\u9fa5]{2,10}(?:销售|经理|专员|主管|总监|工程师|顾问|支持|师|员))[\s\S]*?行业不限/);
    if (recentFocusMatch && recentFocusMatch[1]) {
      expectedPos.position = recentFocusMatch[1].trim();
    } else {
      // 备用模式
      const positionPatterns = [
        /(?:期望职位|目标职位|应聘职位)[:：]\s*([^\n]+)/,
        /(?:最近关注)[:：]?\s*([\u4e00-\u9fa5\w\s]{2,20}(?:经理|专员|主管|总监|工程师|顾问|支持|师|员))/,
        /最近关注[\s\S]*?([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持|师|员))/
      ];

      for (const pattern of positionPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          expectedPos.position = match[1].trim();
          break;
        }
      }
    }

    // 优化：从最近关注/期望职位与岗位经验之间提取地点、岗位、薪资
    const betweenSectionMatch = text.match(/(?:最近关注|期望职位)[\s\S]*?([\s\S]*?)(?=岗位经验|工作经历|$)/);
    if (betweenSectionMatch) {
      const betweenContent = betweenSectionMatch[1];
      
      // 提取工作地点 - 优化算法
      const locationPatterns = [
        /(?:工作地点|期望地点|地点)[:：]\s*([^\n]+)/,
        /(北京|上海|广州|深圳|杭州|南京|成都|武汉|西安|重庆|天津|苏州|青岛|大连|厦门|宁波|无锡|长沙|郑州|济南|福州|合肥|昆明|南昌|贵阳|太原|石家庄|哈尔滨|长春|沈阳|乌鲁木齐|兰州|银川|西宁|拉萨|呼和浩特|南宁|海口|三亚)[市]?/,
        /([\u4e00-\u9fa5]{2,6}[市区县])/
      ];

      for (const pattern of locationPatterns) {
        const match = betweenContent.match(pattern);
        if (match && match[1]) {
          expectedPos.location = match[1].trim();
          break;
        }
      }

      // 提取期望薪资 - 优化算法
      const salaryPatterns = [
        /(?:期望薪资|薪资要求|薪资)[:：]\s*([^\n]+)/,
        /(\d+[-~]\d+K)/i,
        /(\d+k?-?\d*k?)\s*\/月/,
        /月薪\s*(\d+k?-?\d*k?)/,
        /(\d+)k?[-~至](\d+)k?/,
        /(\d{1,2})k[-~至](\d{1,2})k/
      ];

      for (const pattern of salaryPatterns) {
        const match = betweenContent.match(pattern);
        if (match && match[1]) {
          expectedPos.salary = match[1].trim();
          break;
        }
      }

      // 提取行业 - 优化算法
      const industryPatterns = [
        /(?:期望行业|行业)[:：]\s*([^\n]+)/,
        /(行业不限)/,
        /(互联网|金融|教育|医疗|制造业|房地产|零售|咨询|媒体|游戏|电商|物流|汽车|能源|通信|航空|旅游|餐饮|农业|科技|软件|硬件|电子|机械|化工|生物|环保)/
      ];

      for (const pattern of industryPatterns) {
        const match = betweenContent.match(pattern);
        if (match && match[1]) {
          expectedPos.industry = match[1].trim();
          break;
        }
      }
    }

    return expectedPos;
  }

  /**
   * 提取岗位经验
   * @param {string} text - 文本内容
   * @returns {Array} 岗位经验列表
   */
  extractPositionExperience(text) {
    const experiences = [];
    const seenPositions = new Set(); // 防止重复
    
    // 匹配岗位经验部分
    const expSectionMatch = text.match(/岗位经验[\s\S]*?(?=工作经历|教育经历|$)/);
    if (!expSectionMatch) return null;
    
    const expSection = expSectionMatch[0];
    
    // 优化：提取各个岗位经验，避免重复
    const expPatterns = [
      // 职位名称 + 年限（详细）
      /([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持|师|员))\s*(\d+)年(\d+)个月/g,
      // 职位名称 + 年限（简化）
      /([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持|师|员))\s*(\d+)年/g
    ];

    for (const pattern of expPatterns) {
      let match;
      while ((match = pattern.exec(expSection)) !== null) {
        const position = match[1];
        const duration = match[3] ? `${match[2]}年${match[3]}个月` : `${match[2]}年`;
        
        // 只基于职位名称去重，避免同一职位的不同时长被重复添加
        if (!seenPositions.has(position)) {
          seenPositions.add(position);
          experiences.push({
            position,
            duration
          });
        }
      }
    }

    return experiences.length > 0 ? experiences : null;
  }

  /**
   * 提取应聘职位（保留原有逻辑作为备用）
   * @param {string} text - 文本内容
   * @returns {string} 职位
   */
  extractPosition(text) {
    // 尝试多种职位提取模式，按优先级排序
    const posPatterns = [
      // 标准格式（最高优先级）
      /(?:应聘职位|求职意向|期望职位|目标职位)[:：]\s*([\u4e00-\u9fa5\w\s]+)/,
      // 最近关注的职位
      /最近关注[\s\S]*?([\u4e00-\u9fa5]{2,10}(?:经理|专员|主管|总监|工程师|顾问|支持))/,
      // 工作经历中最新的职位（优先级高于岗位经验）- 更精确的匹配
      /工作经历[\s\S]*?公司[\s\S]*?([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持))/,
      // 岗位经验中的职位
      /岗位经验[\s\S]*?([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持))\s*\d+年/,
      // 直接的职位描述
      /([\u4e00-\u9fa5]{2,10}(?:技术支持|解决方案|售前|客户))/
    ];

    for (const pattern of posPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * 提取工作经历（多条）
   * @param {string} text - 文本内容
   * @returns {Array} 工作经历列表
   */
  extractWorkExperience(text) {
    const workExperiences = [];
    
    // 匹配工作经历部分
    const workSectionMatch = text.match(/工作经历[\s\S]*?(?=教育经历)/);
    if (!workSectionMatch) {
      const fallbackMatch = text.match(/工作经历[\s\S]*?(?=资格证书|志愿经历|技能|$)/);
      if (!fallbackMatch) return null;
      var workSection = fallbackMatch[0];
    } else {
      var workSection = workSectionMatch[0];
    }
    
    // 新的解析策略：按公司分组
    // 1. 先找到所有公司名称（包含"公司"、"集团"、"科技"等关键词的行）
    const companyLines = [];
    const lines = workSection.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // 匹配公司名称（更精确的匹配规则）
      if (line.match(/^[\u4e00-\u9fa5\w\s]+(?:公司|集团|科技|有限公司|股份有限公司|企业|机构|网|信息技术有限公司|信息科技有限公司)\s*$/) ||
          line.match(/^[\u4e00-\u9fa5]{2,}网\s*$/) || // 匹配如"美团网"
          line.match(/^[\u4e00-\u9fa5\w\s]{3,}(?:科技|信息|技术|动力).*公司\s*$/)) {
        companyLines.push({ index: i, company: line });
      }
    }
    
    // 2. 为每个公司提取职位、时间和描述
    for (let i = 0; i < companyLines.length; i++) {
      const currentCompany = companyLines[i];
      const nextCompanyIndex = i + 1 < companyLines.length ? companyLines[i + 1].index : lines.length;
      
      // 获取当前公司的所有相关行
      const companySection = lines.slice(currentCompany.index, nextCompanyIndex).join('\n');
      
      // 提取职位（通常在公司名称的下一行）
      let position = '';
      if (currentCompany.index + 1 < lines.length) {
        const nextLine = lines[currentCompany.index + 1].trim();
        // 如果下一行不是时间格式，则认为是职位
        if (nextLine && !nextLine.match(/\d{4}[-\/]\d{1,2}/)) {
          position = nextLine;
        }
      }
      
      // 提取时间范围（支持点号、斜杠、横杠分隔）
      const timeMatch = companySection.match(/(\d{4}[-./]\d{1,2})\s*[-~至到]\s*(\d{4}[-./]\d{1,2}|至今|现在)/);
      const duration = timeMatch ? `${timeMatch[1]} - ${timeMatch[2]}` : '';
      
      // 提取描述（时间行之后的内容，跳过公司介绍部分）
      let description = '';
      if (timeMatch) {
        // 找到时间行在当前公司段落中的位置
        const timeLineIndex = companySection.indexOf(timeMatch[0]);
        if (timeLineIndex !== -1) {
          // 获取时间行之后的所有内容
          let afterTimeLine = companySection.substring(timeLineIndex + timeMatch[0].length).trim();
          
          // 如果内容以公司介绍开始（通常是简短的公司描述），跳过它
          const lines = afterTimeLine.split('\n');
          let descriptionStartIndex = 0;
          
          // 查找实际工作描述的开始位置
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            // 跳过空行和公司介绍行（通常较短且描述公司性质）
            if (line === '') continue;
            
            // 如果行包含数字编号或明显的工作内容标识，认为是工作描述开始
            if (line.match(/^\d+[.、]/) || 
                line.includes('负责') || line.includes('主导') || line.includes('参与') ||
                line.includes('协调') || line.includes('管理') || line.includes('完成') ||
                line.includes('制定') || line.includes('执行') || line.includes('支持') ||
                line.includes('客户') || line.includes('项目') || line.includes('团队') ||
                line.length > 50) { // 较长的行通常是工作描述
              descriptionStartIndex = i;
              break;
            }
            
            // 如果前面的行都是公司介绍（较短且描述公司），跳过
            if (i < 3 && line.length < 100 && 
                (line.includes('公司') || line.includes('平台') || line.includes('服务') ||
                 line.includes('技术') || line.includes('提供') || line.includes('专注'))) {
              continue;
            } else {
              descriptionStartIndex = i;
              break;
            }
          }
          
          // 从找到的位置开始提取描述
          if (descriptionStartIndex < lines.length) {
            description = lines.slice(descriptionStartIndex).join('\n').trim();
            
            // 清理描述内容
            if (description) {
              // 移除多余的空行，但保留段落结构
              description = description.replace(/\n\s*\n\s*\n/g, '\n\n').trim();
              // 移除开头的换行符
              description = description.replace(/^\n+/, '');
            }
          }
        }
      }
      
      if (currentCompany.company && position && duration) {
        workExperiences.push({
          company: currentCompany.company.trim(),
          position: position.trim(),
          duration: duration.trim(),
          description: description.trim()
        });
      }
    }
    
    // 如果新算法没有匹配到，使用原有的模式作为备用
    if (workExperiences.length === 0) {
      const workPatterns = [
        // 公司 + 职位 + 时间格式（支持点号、斜杠、横杠分隔）
        /([\u4e00-\u9fa5\w\s]+(?:公司|集团|科技|有限公司|股份|企业))\s*([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持))\s*(\d{4}[-./]\d{1,2}\s*[-~至]\s*(?:\d{4}[-./]\d{1,2}|至今|现在))/g,
        // 时间 + 公司 + 职位格式（支持点号、斜杠、横杠分隔）
        /(\d{4}[-./]\d{1,2}\s*[-~至]\s*(?:\d{4}[-./]\d{1,2}|至今|现在))\s*([\u4e00-\u9fa5\w\s]+(?:公司|集团|科技|有限公司|股份|企业))\s*([\u4e00-\u9fa5]{2,15}(?:经理|专员|主管|总监|工程师|顾问|支持))/g
      ];

      for (const pattern of workPatterns) {
        let match;
        while ((match = pattern.exec(workSection)) !== null) {
          let company, position, duration;
          
          if (match[1] && match[1].includes('公司')) {
            // 第一种格式：公司 + 职位 + 时间
            company = match[1].trim();
            position = match[2].trim();
            duration = match[3].trim();
          } else {
            // 第二种格式：时间 + 公司 + 职位
            duration = match[1].trim();
            company = match[2].trim();
            position = match[3].trim();
          }
          
          // 提取该工作经历的详细描述
          const descriptionMatch = workSection.match(new RegExp(`${company}[\s\S]*?${position}[\s\S]*?([\s\S]{20,500}?)(?=\d{4}|$)`));
          const description = descriptionMatch ? descriptionMatch[1].trim() : null;
          
          workExperiences.push({
            company,
            position,
            duration,
            description
          });
        }
      }
    }

    return workExperiences.length > 0 ? workExperiences : null;
  }

  /**
   * 提取教育经历
   * @param {string} text - 文本内容
   * @returns {Array} 教育经历列表
   */
  extractEducationExperience(text) {
    const educationExperiences = [];
    
    // 优化：着重识别"教育经历"文字，确保正确提取候选人的教育经历
    const eduSectionPatterns = [
      /教育经历[\s\S]*?(?=资格证书|志愿经历|技能|$)/,
      /教育背景[\s\S]*?(?=资格证书|志愿经历|技能|$)/,
      /学历信息[\s\S]*?(?=资格证书|志愿经历|技能|$)/
    ];
    
    let eduSection = null;
    for (const pattern of eduSectionPatterns) {
      const match = text.match(pattern);
      if (match) {
        eduSection = match[0];
        break;
      }
    }
    
    if (!eduSection) return null;
    
    // 新的解析策略：按行分析教育经历
    const lines = eduSection.split('\n').map(line => line.trim()).filter(line => line);
    
    // 查找学校、专业、学历、时间
    let school = '', major = '', degree = '', duration = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 匹配学校（包含"学院"、"大学"等关键词）
      if (line.match(/[\u4e00-\u9fa5\w\s]+(?:学院|大学|学校|职业技术学院)/)) {
        school = line;
        
        // 查找后续的专业、学历、时间
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const nextLine = lines[j];
          
          // 匹配专业（通常包含"技术"、"应用"、"管理"等）
          if (!major && nextLine.match(/[\u4e00-\u9fa5\w\s]*(?:技术|应用|管理|工程|科学|设计|开发|系统|信息|计算机)/)) {
            major = nextLine;
          }
          
          // 匹配学历
          if (!degree && nextLine.match(/(博士|硕士|本科|大专|专科)/)) {
            degree = nextLine;
          }
          
          // 匹配时间
          if (!duration && nextLine.match(/(\d{4})\s*[-~至到]\s*(\d{4})/)) {
            duration = nextLine;
          }
        }
        
        // 如果找到了基本信息，添加到结果中
        if (school && (major || degree || duration)) {
          educationExperiences.push({
            school: school.trim(),
            major: major.trim() || '未知专业',
            degree: degree.trim() || '未知学历',
            duration: duration.trim() || '未知时间',
            description: ''
          });
          
          // 重置变量，准备查找下一个教育经历
          school = '';
          major = '';
          degree = '';
          duration = '';
        }
      }
    }
    
    // 如果新算法没有匹配到，尝试传统格式
    if (educationExperiences.length === 0) {
      const standardPatterns = [
        // 学校 + 专业 + 学历 + 时间
        /([\u4e00-\u9fa5]+(?:大学|学院|学校))\s*([\u4e00-\u9fa5\w\s]+专业|[\u4e00-\u9fa5\w\s]+学)\s*(博士|硕士|本科|大专)\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s*[-~至]\s*(?:\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|至今|现在))/g,
        // 时间 + 学校 + 专业 + 学历
        /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s*[-~至]\s*(?:\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|至今|现在))\s*([\u4e00-\u9fa5]+(?:大学|学院|学校))\s*([\u4e00-\u9fa5\w\s]+专业|[\u4e00-\u9fa5\w\s]+学)\s*(博士|硕士|本科|大专)/g
      ];
      
      let match;
      for (const pattern of standardPatterns) {
        while ((match = pattern.exec(eduSection)) !== null) {
          let school, major, degree, duration;
          
          if (match[1] && match[1].includes('大学')) {
            // 第一种格式：学校 + 专业 + 学历 + 时间
            school = match[1].trim();
            major = match[2].trim();
            degree = match[3].trim();
            duration = match[4].trim();
          } else {
            // 第二种格式：时间 + 学校 + 专业 + 学历
            duration = match[1].trim();
            school = match[2].trim();
            major = match[3].trim();
            degree = match[4].trim();
          }
          
          educationExperiences.push({
            school,
            major,
            degree,
            duration,
            description: ''
          });
        }
      }
    }

    return educationExperiences.length > 0 ? educationExperiences : null;
  }

  /**
   * 提取资格证书（优化：主要识别资格证书类技能）
   * @param {string} text - 文本内容
   * @returns {Array} 资格证书列表
   */
  extractCertificates(text) {
    const certificates = [];
    
    // 匹配资格证书部分
    const certSectionPatterns = [
      /资格证书[\s\S]*?(?=志愿经历|技能|$)/,
      /证书[\s\S]*?(?=志愿经历|技能|$)/,
      /认证[\s\S]*?(?=志愿经历|技能|$)/
    ];
    
    let certSection = null;
    for (const pattern of certSectionPatterns) {
      const match = text.match(pattern);
      if (match) {
        certSection = match[0];
        break;
      }
    }
    
    if (!certSection) {
      // 如果没有专门的证书部分，在全文中搜索常见的资格证书
      certSection = text;
    }
    
    // 优化：提取常见的资格证书类技能，减少误识别
     const certPatterns = [
       // 专业技术证书（带时间）
       /([\u4e00-\u9fa5\w\s]*(?:工程师|架构师|分析师|设计师|管理师)证书?)\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|\d{4}年\d{1,2}月|\d{4}-\d{1,2})/g,
       // IT相关证书
       /(PMP|CISSP|CISA|CISM|CCNA|CCNP|CCIE|AWS|Azure|Oracle|Java|Python|Linux|Red Hat|Microsoft|Cisco|VMware)[\u4e00-\u9fa5\w\s]*(?:认证|证书)?/gi,
       // 财务会计证书
       /(CPA|CFA|FRM|ACCA|CIA|注册会计师|会计师|审计师|税务师)[\u4e00-\u9fa5\w\s]*(?:证书|资格)?/gi,
       // 项目管理证书
       /(项目管理专业人士认证|PMP项目管理|项目管理|敏捷|Scrum|Prince2)[\u4e00-\u9fa5\w\s]*(?:认证|证书)?/gi,
       // 语言证书
       /(托福|雅思|GRE|GMAT|CET-[46]|专业[四八]级|BEC|商务英语)[\u4e00-\u9fa5\w\s]*(?:证书)?/gi
     ];

    for (const pattern of certPatterns) {
      let match;
      while ((match = pattern.exec(certSection)) !== null) {
        let certName = match[1].trim();
        const obtainDate = match[2] ? match[2].trim() : null;
        
        // 清理证书名称，去除数字前缀和无意义字符
        certName = certName.replace(/^\d+\s*/, '').trim();
        
        // 过滤掉过短或无意义的匹配，增强验证逻辑
        if (certName.length >= 2 && 
            !certName.match(/^[\d\s]+$/) && 
            !certificates.some(cert => cert.name === certName) &&
            !['工作', '经验', '教育', '技能', '项目', '公司', '学院', '大学'].some(word => certName.includes(word))) {
          certificates.push({
            name: certName,
            obtainDate,
            type: this.categorizeCertificate(certName)
          });
        }
      }
    }

    return certificates.length > 0 ? certificates : null;
  }

  /**
   * 对证书进行分类
   * @param {string} certName - 证书名称
   * @returns {string} 证书类型
   */
  categorizeCertificate(certName) {
    const categories = {
      'IT技术': ['Java', 'Python', 'AWS', 'Azure', 'Oracle', 'Linux', 'Microsoft', 'Cisco', 'VMware', 'Red Hat'],
      '项目管理': ['PMP', '项目管理', 'Scrum', 'Prince2', '敏捷'],
      '财务会计': ['CPA', 'CFA', 'FRM', 'ACCA', 'CIA', '会计师', '审计师', '税务师'],
      '安全认证': ['CISSP', 'CISA', 'CISM'],
      '语言能力': ['托福', '雅思', 'GRE', 'GMAT', 'CET', '专业', 'BEC', '商务英语'],
      '网络技术': ['CCNA', 'CCNP', 'CCIE']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => certName.includes(keyword))) {
        return category;
      }
    }
    
    return '其他';
  }

  /**
   * 提取志愿经历
   * @param {string} text - 文本内容
   * @returns {Array} 志愿经历列表
   */
  extractVolunteerExperience(text) {
    const volunteerExperiences = [];
    
    // 匹配志愿经历部分
    const volunteerSectionMatch = text.match(/志愿经历[\s\S]*?$/);
    if (!volunteerSectionMatch) return null;
    
    const volunteerSection = volunteerSectionMatch[0];
    
    // 新的解析策略：按行分析志愿经历
    const lines = volunteerSection.split('\n').map(line => line.trim()).filter(line => line && line !== '志愿经历');
    
    // 查找志愿活动信息
    let organization = '', role = '', duration = '', serviceDuration = '', description = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 匹配志愿活动标题（通常包含年份和志愿者等关键词）
      if (line.match(/\d{4}年.*?志愿者/)) {
        organization = line;
        
        // 查找后续的时间、服务时长、描述
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const nextLine = lines[j];
          
          // 匹配时间范围
          if (!duration && nextLine.match(/(\d{4}[-\/]\d{1,2})\s*[-~至到]\s*(\d{4}[-\/]\d{1,2})/)) {
            duration = nextLine;
          }
          
          // 匹配服务时长
          if (!serviceDuration && nextLine.match(/服务时长/)) {
            serviceDuration = nextLine;
            // 下一行可能是具体时长
            if (j + 1 < lines.length) {
              const durationLine = lines[j + 1];
              if (durationLine.match(/\d+[个月天]/)) {
                serviceDuration += ' ' + durationLine;
              }
            }
          }
          
          // 匹配内容描述
          if (!description && nextLine.match(/内容/)) {
            // 下一行是具体描述
            if (j + 1 < lines.length) {
              description = lines[j + 1];
            }
          }
        }
        
        // 如果找到了基本信息，添加到结果中
        if (organization) {
          volunteerExperiences.push({
            organization: organization.trim(),
            activity: role || '志愿服务',
            duration: duration || '',
            serviceDuration: serviceDuration || '',
            description: description || ''
          });
        }
      }
    }
    
    // 如果Boss格式没匹配到，尝试原有格式
    if (volunteerExperiences.length === 0) {
      const volunteerPatterns = [
        // 组织 + 活动 + 时间
        /([\u4e00-\u9fa5\w\s]+(?:组织|基金会|协会|中心))\s*([\u4e00-\u9fa5\w\s]+活动|[\u4e00-\u9fa5\w\s]+服务)\s*(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s*[-~至]\s*(?:\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|至今|现在))/g,
        // 时间 + 组织 + 活动
        /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2}\s*[-~至]\s*(?:\d{4}[-\/]\d{1,2}[-\/]\d{1,2}|至今|现在))\s*([\u4e00-\u9fa5\w\s]+(?:组织|基金会|协会|中心))\s*([\u4e00-\u9fa5\w\s]+活动|[\u4e00-\u9fa5\w\s]+服务)/g
      ];

      for (const pattern of volunteerPatterns) {
        let match;
        while ((match = pattern.exec(volunteerSection)) !== null) {
          let organization, activity, duration;
          
          if (match[1] && (match[1].includes('组织') || match[1].includes('基金会'))) {
            // 第一种格式：组织 + 活动 + 时间
            organization = match[1].trim();
            activity = match[2].trim();
            duration = match[3].trim();
          } else {
            // 第二种格式：时间 + 组织 + 活动
            duration = match[1].trim();
            organization = match[2].trim();
            activity = match[3].trim();
          }
          
          volunteerExperiences.push({
            organization,
            activity,
            duration
          });
        }
      }
    }

    return volunteerExperiences.length > 0 ? volunteerExperiences : null;
  }

  /**
   * 提取工作经验（保留原有逻辑作为备用）
   * @param {string} text - 文本内容
   * @returns {string} 工作经验
   */
  extractExperience(text) {
    // 尝试多种经验提取模式
    const expPatterns = [
      // 标准格式
      /(?:工作经验|工作年限|工作经历)[:：]\s*(\d+)[\u4e00-\u9fa5]*/,
      // 直接的年限描述
      /(\d+)年以上/,
      /(\d+)年工作经验/,
      /(\d+)[\u4e00-\u9fa5]*工作经验/,
      /工作(\d+)[\u4e00-\u9fa5]/,
      /(\d+)年经验/,
      // 岗位经验格式
      /岗位经验[\s\S]*?(\d+)年(\d+)个月/,
      // 简单的年限
      /^\s*(\d+)年以上\s*$/m
    ];

    for (const pattern of expPatterns) {
      const expMatch = text.match(pattern);
      if (expMatch && expMatch[1]) {
        return `${expMatch[1]}年以上`;
      }
    }

    return null;
  }

  /**
   * 提取学历
   * @param {string} text - 文本内容
   * @returns {string} 学历
   */
  extractEducation(text) {
    // 尝试多种学历提取模式
    const eduPatterns = [
      // 标准格式
      /(?:学历|教育背景|毕业院校|最高学历)[:：]\s*([\u4e00-\u9fa5]+)/,
      // 学校名称 + 专业 + 学历
      /([\u4e00-\u9fa5]+学院|[\u4e00-\u9fa5]+大学)[\s\S]*?(博士|硕士|本科|大专)/,
      // 专业名称 + 学历
      /([\u4e00-\u9fa5]+专业|[\u4e00-\u9fa5]+技术)\s*(博士|硕士|本科|大专)/,
      // 直接的学历描述
      /(博士|硕士|本科|大专)(?:学历|毕业)?/
    ];

    for (const pattern of eduPatterns) {
      const match = text.match(pattern);
      if (match) {
        // 如果匹配到学历关键词，返回学历
        if (match[2] && ['博士', '硕士', '本科', '大专'].includes(match[2])) {
          return match[2];
        }
        if (match[1] && ['博士', '硕士', '本科', '大专'].includes(match[1])) {
          return match[1];
        }
      }
    }

    // 查找常见学历关键词
    const educationKeywords = ['博士', '硕士', '本科', '大专', '高中'];
    for (const keyword of educationKeywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }

    return null;
  }

  /**
   * 提取技能
   * @param {string} text - 文本内容
   * @returns {Array} 技能列表
   */
  extractSkills(text) {
    // 尝试多种技能提取模式
    const skillPatterns = [
      // 标准格式
      /(?:技能|专长|擅长|核心技能|专业技能)[:：]\s*([^\n]+)/,
      // 技能列表格式
      /(?:技能|专长|擅长)[\s\S]*?([\u4e00-\u9fa5\w\s,，、]+)/,
      // 从描述中提取技能关键词
      /擅长[:：]\s*([^\n。]+)/
    ];

    let extractedSkills = [];
    
    for (const pattern of skillPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        // 分割技能字符串
        const skillsText = match[1];
        const skills = skillsText.split(/[,，、\s]+/).filter(skill => skill.trim() && skill.length > 1);
        extractedSkills = extractedSkills.concat(skills);
      }
    }

    // 从文本中提取常见技能关键词
    const commonSkills = [
      // 技术技能
      'JavaScript', 'Python', 'Java', 'C++', 'React', 'Vue', 'Angular',
      'Node.js', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Git', 'Linux',
      'APP', 'SaaS', 'ERP', 'OA', 'CRM', 'IoT', '物联网', '人工智能', 'AI',
      '云计算', '大数据', '自动化测试', '兼容性测试', '安全测试',
      // 业务技能
      '项目管理', '团队协作', '沟通能力', '学习能力', '方案撰写',
      '客户沟通', '需求分析', '技术支持', '售前支持', '解决方案',
      '商务谈判', '风险管理', '质量保证', '持续改进', '市场分析',
      '竞品分析', '招投标', '技术培训', '跨部门协调', '应变能力'
    ];

    const foundSkills = [];
    for (const skill of commonSkills) {
      if (text.includes(skill) && !foundSkills.includes(skill)) {
        foundSkills.push(skill);
      }
    }

    // 合并提取的技能
    const allSkills = [...new Set([...extractedSkills, ...foundSkills])];
    return allSkills.length > 0 ? allSkills : null;
  }

  /**
   * 计算简历质量评分（Boss直聘结构）
   * @param {string} text - 文本内容
   * @returns {number} 质量评分（0-100）
   */
  calculateQualityScore(text) {
    let score = 0;
    
    // 基础信息完整性评分（必填项）
    if (this.extractName(text)) score += 15;
    if (this.extractAge(text)) score += 10;
    if (this.extractWorkYears(text)) score += 10;
    if (this.extractEducation(text)) score += 10;
    if (this.extractCurrentStatus(text)) score += 5;
    
    // 个人简介评分
    if (this.extractSelfIntroduction(text)) score += 10;
    
    // 期望职位信息评分
    const expectedPosition = this.extractExpectedPosition(text);
    if (expectedPosition && expectedPosition.position) score += 10;
    if (expectedPosition && expectedPosition.location) score += 5;
    
    // 岗位经验评分
    if (this.extractPositionExperience(text)) score += 10;
    
    // 工作经历评分
    const workExp = this.extractWorkExperience(text);
    if (workExp && workExp.length > 0) {
      score += 10;
      // 多条工作经历额外加分
      if (workExp.length > 1) score += 5;
    }
    
    // 教育经历评分
    if (this.extractEducationExperience(text)) score += 10;
    
    // 技能信息评分
    const skills = this.extractSkills(text);
    if (skills && skills.length > 0) {
      score += Math.min(skills.length * 1, 5);
    }
    
    // 可选项目加分（不影响基础评分）
    if (this.extractCertificates(text)) score += 3;
    if (this.extractVolunteerExperience(text)) score += 2;
    
    // 文本长度评分
    if (text.length > 300) score += 2;
    if (text.length > 800) score += 3;
    
    return Math.min(score, 100);
  }

  /**
   * 从PDF缓冲区提取文本（模拟实现）
   * @param {Buffer} buffer - PDF文件缓冲区
   * @returns {string} 文本内容
   */
  extractTextFromPDF(buffer) {
    // 这里是模拟实现，实际应该使用pdf-parse库
    return `张三
电话：13800138000
邮箱：zhangsan@example.com
应聘职位：前端工程师
工作经验：3年
学历：本科
技能：JavaScript, React, Vue, Node.js, MySQL
教育背景：某某大学 计算机科学与技术 本科
工作经历：
2021-至今 某某公司 前端工程师
- 负责公司前端产品开发
- 使用React和Vue框架
- 参与项目架构设计`;
  }

  /**
   * 从DOCX缓冲区提取文本（模拟实现）
   * @param {Buffer} buffer - DOCX文件缓冲区
   * @returns {string} 文本内容
   */
  extractTextFromDOCX(buffer) {
    // 这里是模拟实现，实际应该使用mammoth库
    return `李四
联系电话：13900139000
电子邮箱：lisi@example.com
求职意向：后端工程师
工作年限：5年
最高学历：硕士
专业技能：Java, Spring Boot, MySQL, Redis, Docker
教育经历：某某大学 软件工程 硕士
工作经历：
2019-至今 某某科技公司 后端工程师
- 负责后端系统开发
- 使用Java和Spring Boot
- 数据库设计和优化`;
  }
}

module.exports = new ResumeParserService();