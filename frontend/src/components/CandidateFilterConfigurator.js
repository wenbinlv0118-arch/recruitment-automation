import React, { useState } from 'react';
import { Card, Form, Input, Select, Button, Row, Col, Typography, Divider, Space, message } from 'antd';
import { 
  SearchOutlined, 
  FilterOutlined, 
  ClearOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;
const { Option } = Select;

// 样式组件
const FilterContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const FilterSection = styled(Card)`
  margin-bottom: 16px;
  
  .ant-card-head {
    background: #f8f9fa;
    border-bottom: 1px solid #e8e8e8;
  }
  
  .ant-card-head-title {
    font-weight: 600;
    color: #1890ff;
  }
`;

const ActionButton = styled(Button)`
  height: 40px;
  font-weight: 500;
  min-width: 120px;
`;

const CandidateFilterConfigurator = ({ onFilterApply, onFilterSave }) => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [savedFilters, setSavedFilters] = useState([]);

  // 职位类型选项
  const jobTypes = [
    '技术', '产品', '设计', '运营', '市场', '销售', '人事', '财务', '法务', '其他'
  ];

  // 工作经验选项
  const experienceOptions = [
    '应届毕业生', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'
  ];

  // 学历要求选项
  const educationOptions = [
    '不限', '大专', '本科', '硕士', '博士'
  ];

  // 薪资范围选项
  const salaryOptions = [
    '不限', '3K以下', '3-5K', '5-10K', '10-15K', '15-20K', '20-30K', '30-50K', '50K以上'
  ];

  // 城市选项（主要城市）
  const cityOptions = [
    '北京', '上海', '广州', '深圳', '杭州', '南京', '成都', '武汉', '西安', '苏州',
    '天津', '重庆', '青岛', '大连', '宁波', '厦门', '无锡', '长沙', '郑州', '济南'
  ];

  // 公司规模选项
  const companySizeOptions = [
    '不限', '0-20人', '20-99人', '100-499人', '500-999人', '1000-9999人', '10000人以上'
  ];

  // 融资阶段选项
  const fundingStageOptions = [
    '不限', '未融资', '天使轮', 'A轮', 'B轮', 'C轮', 'D轮及以上', '已上市'
  ];

  // 处理筛选条件应用
  const handleFilterApply = async (values) => {
    try {
      setIsLoading(true);
      
      // 构建筛选条件对象
      const filterConfig = {
        keyword: values.keyword || '',
        jobType: values.jobType || [],
        experience: values.experience || [],
        education: values.education || [],
        salary: values.salary || [],
        city: values.city || [],
        companySize: values.companySize || [],
        fundingStage: values.fundingStage || [],
        skills: values.skills || [],
        companyType: values.companyType || [],
        workMode: values.workMode || [],
        benefits: values.benefits || []
      };

      // 验证是否有筛选条件
      const hasFilters = Object.values(filterConfig).some(value => 
        Array.isArray(value) ? value.length > 0 : value !== ''
      );

      if (!hasFilters) {
        message.warning('请至少设置一个筛选条件');
        return;
      }

      message.success('筛选条件已应用，正在启动搜索流程...');
      
      // 调用父组件的筛选应用回调
      if (onFilterApply) {
        await onFilterApply(filterConfig);
      }
      
    } catch (error) {
      console.error('应用筛选条件失败:', error);
      message.error(`应用筛选条件失败: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 保存筛选条件
  const handleFilterSave = async (values) => {
    try {
      const filterName = values.filterName || '未命名筛选器';
      const filterConfig = {
        name: filterName,
        config: {
          keyword: values.keyword || '',
          jobType: values.jobType || [],
          experience: values.experience || [],
          education: values.education || [],
          salary: values.salary || [],
          city: values.city || [],
          companySize: values.companySize || [],
          fundingStage: values.fundingStage || [],
          skills: values.skills || [],
          companyType: values.companyType || [],
          workMode: values.workMode || [],
          benefits: values.benefits || []
        },
        createTime: new Date().toISOString()
      };

      // 添加到已保存的筛选器列表
      setSavedFilters(prev => [...prev, filterConfig]);
      
      message.success(`筛选器"${filterName}"已保存`);
      
      // 调用父组件的保存回调
      if (onFilterSave) {
        await onFilterSave(filterConfig);
      }
      
    } catch (error) {
      console.error('保存筛选条件失败:', error);
      message.error(`保存筛选条件失败: ${error.message}`);
    }
  };

  // 清空筛选条件
  const handleFilterClear = () => {
    form.resetFields();
    message.info('筛选条件已清空');
  };

  // 加载已保存的筛选器
  const handleLoadSavedFilter = (filter) => {
    form.setFieldsValue(filter.config);
    message.success(`已加载筛选器"${filter.name}"`);
  };

  // 删除已保存的筛选器
  const handleDeleteSavedFilter = (filterName) => {
    setSavedFilters(prev => prev.filter(f => f.name !== filterName));
    message.success(`筛选器"${filterName}"已删除`);
  };

  return (
    <FilterContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <FilterOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          候选人筛选条件配置
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          配置 Boss 直聘的搜索条件，精准定位目标候选人
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleFilterApply}
        initialValues={{
          jobType: [],
          experience: [],
          education: [],
          salary: [],
          city: [],
          companySize: [],
          fundingStage: [],
          skills: [],
          companyType: [],
          workMode: [],
          benefits: []
        }}
      >
        {/* 基础搜索条件 */}
        <FilterSection title="基础搜索条件" size="small">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="keyword"
                label="关键词搜索"
                extra="支持职位名称、技能、公司名称等关键词"
              >
                <Input 
                  placeholder="例如：前端工程师、React、腾讯" 
                  prefix={<SearchOutlined />}
                  size="large"
                />
              </Form.Item>
            </Col>
          </Row>
        </FilterSection>

        {/* 职位要求 */}
        <FilterSection title="职位要求" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="jobType"
                label="职位类型"
              >
                <Select
                  mode="multiple"
                  placeholder="选择职位类型"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {jobTypes.map(type => (
                    <Option key={type} value={type}>{type}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="experience"
                label="工作经验"
              >
                <Select
                  mode="multiple"
                  placeholder="选择工作经验"
                  allowClear
                >
                  {experienceOptions.map(exp => (
                    <Option key={exp} value={exp}>{exp}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="education"
                label="学历要求"
              >
                <Select
                  mode="multiple"
                  placeholder="选择学历要求"
                  allowClear
                >
                  {educationOptions.map(edu => (
                    <Option key={edu} value={edu}>{edu}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="salary"
                label="薪资范围"
              >
                <Select
                  mode="multiple"
                  placeholder="选择薪资范围"
                  allowClear
                >
                  {salaryOptions.map(salary => (
                    <Option key={salary} value={salary}>{salary}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </FilterSection>

        {/* 地理位置 */}
        <FilterSection title="地理位置" size="small">
          <Row gutter={16}>
            <Col span={24}>
              <Form.Item
                name="city"
                label="工作城市"
              >
                <Select
                  mode="multiple"
                  placeholder="选择工作城市"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                >
                  {cityOptions.map(city => (
                    <Option key={city} value={city}>{city}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </FilterSection>

        {/* 公司信息 */}
        <FilterSection title="公司信息" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="companySize"
                label="公司规模"
              >
                <Select
                  mode="multiple"
                  placeholder="选择公司规模"
                  allowClear
                >
                  {companySizeOptions.map(size => (
                    <Option key={size} value={size}>{size}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="fundingStage"
                label="融资阶段"
              >
                <Select
                  mode="multiple"
                  placeholder="选择融资阶段"
                  allowClear
                >
                  {fundingStageOptions.map(stage => (
                    <Option key={stage} value={stage}>{stage}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </FilterSection>

        {/* 操作按钮 */}
        <Card style={{ marginTop: 24 }}>
          <Row gutter={16} justify="center">
            <Col>
              <ActionButton
                type="primary"
                icon={<SearchOutlined />}
                htmlType="submit"
                loading={isLoading}
              >
                应用筛选条件
              </ActionButton>
            </Col>
            <Col>
              <ActionButton
                icon={<SaveOutlined />}
                onClick={() => {
                  const values = form.getFieldsValue();
                  if (Object.values(values).some(v => Array.isArray(v) ? v.length > 0 : v !== '')) {
                    handleFilterSave(values);
                  } else {
                    message.warning('请先设置筛选条件');
                  }
                }}
              >
                保存筛选器
              </ActionButton>
            </Col>
            <Col>
              <ActionButton
                icon={<ClearOutlined />}
                onClick={handleFilterClear}
              >
                清空条件
              </ActionButton>
            </Col>
            <Col>
              <ActionButton
                icon={<ReloadOutlined />}
                onClick={() => form.resetFields()}
              >
                重置表单
              </ActionButton>
            </Col>
          </Row>
        </Card>
      </Form>

      {/* 已保存的筛选器 */}
      {savedFilters.length > 0 && (
        <FilterSection title="已保存的筛选器" size="small" style={{ marginTop: 24 }}>
          <Row gutter={16}>
            {savedFilters.map((filter, index) => (
              <Col span={8} key={index}>
                <Card size="small" style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{filter.name}</Text>
                    <Space>
                      <Button 
                        size="small" 
                        type="link"
                        onClick={() => handleLoadSavedFilter(filter)}
                      >
                        加载
                      </Button>
                      <Button 
                        size="small" 
                        type="link" 
                        danger
                        onClick={() => handleDeleteSavedFilter(filter.name)}
                      >
                        删除
                      </Button>
                    </Space>
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {new Date(filter.createTime).toLocaleDateString()}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>
        </FilterSection>
      )}
    </FilterContainer>
  );
};

export default CandidateFilterConfigurator;

