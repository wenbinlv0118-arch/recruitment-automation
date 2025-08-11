import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, Input, Button, Space, Divider, message, Row, Col } from 'antd';
import { SearchOutlined, SettingOutlined, SaveOutlined, FilterOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Option } = Select;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: none;
    padding: 20px 24px;
  }
  
  .ant-modal-title {
    color: white;
    font-size: 18px;
    font-weight: 600;
  }
  
  .ant-modal-close {
    color: white;
  }
  
  .ant-modal-body {
    padding: 24px;
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .ant-form-item-label > label {
    font-weight: 500;
    color: #333;
  }
  
  .filter-section {
    margin-bottom: 24px;
  }
  
  .filter-section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    
    .anticon {
      margin-right: 8px;
      color: #667eea;
    }
  }
  
  .filter-row {
    display: flex;
    gap: 16px;
    margin-bottom: 16px;
    
    .ant-form-item {
      flex: 1;
      margin-bottom: 0;
    }
  }
  
  .action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
  
  .preset-filters {
    margin-bottom: 16px;
    
    .preset-tag {
      margin: 4px;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
    }
  }
  
  .filter-grid {
    .ant-form-item {
      margin-bottom: 16px;
    }
  }
`;

const CompanyFilterModal = ({ 
  visible, 
  onCancel, 
  onConfirm, 
  loading = false,
  initialValues = {} 
}) => {
  const [form] = Form.useForm();
  const [savedFilters, setSavedFilters] = useState([]);
  const [currentFilterName, setCurrentFilterName] = useState('');

  // 预设筛选条件
  const presetFilters = [
    { name: '互联网大厂', industry: ['互联网'], companySize: ['1000-9999人', '10000人以上'], salaryRange: ['15k-30k', '30k-50k'] },
    { name: '创业公司', companySize: ['0-20人', '20-99人'], experience: ['应届毕业生', '1-3年'] },
    { name: '外企', companyNature: ['外企'], companySize: ['500-9999人'], location: ['北京', '上海', '深圳'] },
    { name: '国企', companyNature: ['国企'], companySize: ['1000-9999人', '10000人以上'] }
  ];

  // 行业选项
  const industryOptions = [
    '不限', '互联网', '金融', '教育', '医疗', '制造业', '房地产', '电商', '游戏', 'AI/人工智能', 
    '区块链', '新能源', '生物科技', '咨询', '广告', '媒体', '旅游', '餐饮', '物流', '汽车',
    '通信', '软件', '硬件', '芯片', '半导体', '航空航天', '化工', '能源', '环保', '农业'
  ];

  // 地区选项
  const locationOptions = [
    '不限', '北京', '上海', '深圳', '广州', '杭州', '南京', '苏州', '成都', '武汉', '西安',
    '天津', '重庆', '青岛', '大连', '厦门', '无锡', '宁波', '佛山', '东莞', '长沙', '郑州',
    '济南', '合肥', '福州', '南昌', '太原', '石家庄', '哈尔滨', '长春', '沈阳', '呼和浩特'
  ];

  // 公司规模选项
  const companySizeOptions = [
    '不限', '0-20人', '20-99人', '100-499人', '500-999人', '1000-9999人', '10000人以上'
  ];

  // 薪资范围选项
  const salaryRangeOptions = [
    '不限', '3k以下', '3k-5k', '5k-10k', '10k-15k', '15k-30k', '30k-50k', '50k以上'
  ];

  // 经验要求选项
  const experienceOptions = [
    '不限', '应届毕业生', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'
  ];

  // 学历要求选项
  const educationOptions = [
    '不限', '大专', '本科', '硕士', '博士'
  ];

  // 公司性质选项
  const companyNatureOptions = [
    '不限', '国企', '外企', '合资', '民营', '上市公司', '创业公司', '事业单位', '政府机构'
  ];

  // 融资阶段选项
  const fundingStageOptions = [
    '不限', '未融资', '天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以上', '已上市'
  ];

  // 发布时间选项
  const publishTimeOptions = [
    '不限', '今天', '最近3天', '最近一周', '最近一个月', '最近三个月'
  ];

  // 职位类型选项
  const jobTypeOptions = [
    '不限', '全职', '兼职', '实习'
  ];

  // 福利待遇选项
  const benefitOptions = [
    '不限', '五险一金', '年终奖', '带薪年假', '免费班车', '免费培训', '股票期权', '弹性工作',
    '免费三餐', '免费住宿', '交通补贴', '通讯补贴', '餐补', '房补', '节日福利', '团建活动'
  ];

  useEffect(() => {
    if (visible) {
      form.setFieldsValue(initialValues);
      loadSavedFilters();
    }
  }, [visible, initialValues, form]);

  // 加载保存的筛选条件
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem('companySearchFilters');
      if (saved) {
        setSavedFilters(JSON.parse(saved));
      }
    } catch (error) {
      console.error('加载保存的筛选条件失败:', error);
    }
  };

  // 保存筛选条件
  const saveFilter = () => {
    const values = form.getFieldsValue();
    if (!currentFilterName.trim()) {
      message.warning('请输入筛选条件名称');
      return;
    }

    try {
      const newFilter = {
        name: currentFilterName.trim(),
        config: values,
        timestamp: Date.now()
      };

      const updated = [...savedFilters.filter(f => f.name !== newFilter.name), newFilter];
      setSavedFilters(updated);
      localStorage.setItem('companySearchFilters', JSON.stringify(updated));
      
      message.success('筛选条件保存成功');
      setCurrentFilterName('');
    } catch (error) {
      message.error('保存失败，请重试');
    }
  };

  // 应用预设筛选条件
  const applyPresetFilter = (preset) => {
    form.setFieldsValue(preset);
    message.success(`已应用预设筛选条件：${preset.name}`);
  };

  // 应用保存的筛选条件
  const applySavedFilter = (savedFilter) => {
    form.setFieldsValue(savedFilter.config);
    message.success(`已应用保存的筛选条件：${savedFilter.name}`);
  };

  // 删除保存的筛选条件
  const deleteSavedFilter = (filterName) => {
    const updated = savedFilters.filter(f => f.name !== filterName);
    setSavedFilters(updated);
    localStorage.setItem('companySearchFilters', JSON.stringify(updated));
    message.success('筛选条件已删除');
  };

  // 确认筛选条件
  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      // 处理"不限"选项，将"不限"转换为空数组或undefined
      const processedValues = {};
      Object.keys(values).forEach(key => {
        if (Array.isArray(values[key])) {
          // 过滤掉"不限"选项
          processedValues[key] = values[key].filter(item => item !== '不限');
        } else {
          processedValues[key] = values[key];
        }
      });
      onConfirm(processedValues);
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  // 重置筛选条件
  const handleReset = () => {
    form.resetFields();
    message.info('筛选条件已重置');
  };

  return (
    <StyledModal
      title="配置公司筛选条件"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          industry: ['不限'],
          location: ['不限'],
          companySize: ['不限'],
          salaryRange: ['不限'],
          experience: ['不限'],
          education: ['不限'],
          companyNature: ['不限'],
          fundingStage: ['不限'],
          publishTime: ['不限'],
          jobType: ['不限'],
          benefits: ['不限']
        }}
      >
        {/* 预设筛选条件 */}
        <div className="filter-section">
          <div className="filter-section-title">
            <SearchOutlined />
            快速筛选
          </div>
          <div className="preset-filters">
            {presetFilters.map((preset, index) => (
              <Button
                key={index}
                size="small"
                className="preset-tag"
                onClick={() => applyPresetFilter(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        <Divider />

        {/* 基础筛选条件 */}
        <div className="filter-section">
          <div className="filter-section-title">
            <FilterOutlined />
            基础筛选
          </div>
          <Row gutter={16} className="filter-grid">
            <Col span={12}>
              <Form.Item name="industry" label="所属行业">
                <Select
                  mode="multiple"
                  placeholder="选择行业领域"
                  maxTagCount={3}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {industryOptions.map(industry => (
                    <Option key={industry} value={industry}>{industry}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="工作地点">
                <Select
                  mode="multiple"
                  placeholder="选择工作地区"
                  maxTagCount={3}
                  showSearch
                  filterOption={(input, option) =>
                    option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {locationOptions.map(location => (
                    <Option key={location} value={location}>{location}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* 职位要求 */}
        <div className="filter-section">
          <div className="filter-section-title">
            <SettingOutlined />
            职位要求
          </div>
          <Row gutter={16} className="filter-grid">
            <Col span={8}>
              <Form.Item name="experience" label="工作经验">
                <Select
                  mode="multiple"
                  placeholder="选择经验要求"
                  maxTagCount={2}
                >
                  {experienceOptions.map(exp => (
                    <Option key={exp} value={exp}>{exp}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="education" label="学历要求">
                <Select
                  mode="multiple"
                  placeholder="选择学历要求"
                  maxTagCount={2}
                >
                  {educationOptions.map(edu => (
                    <Option key={edu} value={edu}>{edu}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="jobType" label="职位类型">
                <Select
                  mode="multiple"
                  placeholder="选择职位类型"
                  maxTagCount={2}
                >
                  {jobTypeOptions.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16} className="filter-grid">
            <Col span={12}>
              <Form.Item name="salaryRange" label="薪资范围">
                <Select
                  mode="multiple"
                  placeholder="选择薪资范围"
                  maxTagCount={2}
                >
                  {salaryRangeOptions.map(salary => (
                    <Option key={salary} value={salary}>{salary}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="publishTime" label="发布时间">
                <Select
                  mode="multiple"
                  placeholder="选择发布时间"
                  maxTagCount={2}
                >
                  {publishTimeOptions.map(time => (
                    <Option key={time} value={time}>{time}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* 公司信息 */}
        <div className="filter-section">
          <div className="filter-section-title">
            <SettingOutlined />
            公司信息
          </div>
          <Row gutter={16} className="filter-grid">
            <Col span={8}>
              <Form.Item name="companySize" label="公司规模">
                <Select
                  mode="multiple"
                  placeholder="选择公司规模"
                  maxTagCount={2}
                >
                  {companySizeOptions.map(size => (
                    <Option key={size} value={size}>{size}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="companyNature" label="公司性质">
                <Select
                  mode="multiple"
                  placeholder="选择公司性质"
                  maxTagCount={2}
                >
                  {companyNatureOptions.map(nature => (
                    <Option key={nature} value={nature}>{nature}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="fundingStage" label="融资阶段">
                <Select
                  mode="multiple"
                  placeholder="选择融资阶段"
                  maxTagCount={2}
                >
                  {fundingStageOptions.map(stage => (
                    <Option key={stage} value={stage}>{stage}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        {/* 福利待遇 */}
        <div className="filter-section">
          <div className="filter-section-title">
            <SettingOutlined />
            福利待遇
          </div>
          <Form.Item name="benefits" label="福利待遇">
            <Select
              mode="multiple"
              placeholder="选择福利待遇"
              maxTagCount={4}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
              }
            >
              {benefitOptions.map(benefit => (
                <Option key={benefit} value={benefit}>{benefit}</Option>
              ))}
            </Select>
          </Form.Item>
        </div>

        {/* 保存筛选条件 */}
        <div className="filter-section">
          <div className="filter-section-title">
            <SaveOutlined />
            保存筛选条件
          </div>
          <div className="filter-row">
            <Form.Item>
              <Input
                placeholder="输入筛选条件名称"
                value={currentFilterName}
                onChange={(e) => setCurrentFilterName(e.target.value)}
                onPressEnter={saveFilter}
              />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                icon={<SaveOutlined />}
                onClick={saveFilter}
                disabled={!currentFilterName.trim()}
              >
                保存
              </Button>
            </Form.Item>
          </div>
          
          {/* 已保存的筛选条件 */}
          {savedFilters.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ marginBottom: 8, fontSize: 14, color: '#666' }}>
                已保存的筛选条件：
              </div>
              <Space wrap>
                {savedFilters.map((filter, index) => (
                  <Button
                    key={index}
                    size="small"
                    onClick={() => applySavedFilter(filter)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      deleteSavedFilter(filter.name);
                    }}
                    title={`右键删除：${filter.name}`}
                  >
                    {filter.name}
                  </Button>
                ))}
              </Space>
            </div>
          )}
        </div>
      </Form>

      {/* 操作按钮 */}
      <div className="action-buttons">
        <Space>
          <Button onClick={handleReset}>重置</Button>
          <Button onClick={onCancel}>取消</Button>
        </Space>
        <Button 
          type="primary" 
          icon={<SearchOutlined />}
          onClick={handleConfirm}
          loading={loading}
        >
          开始搜索
        </Button>
      </div>
    </StyledModal>
  );
};

export default CompanyFilterModal;
