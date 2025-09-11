import React, { useState, useCallback, useEffect } from 'react';
import { Form, Input, Select, Upload, Button, Space, Typography, Card, Tabs, message, Spin, Descriptions, List, Tag, Divider } from 'antd';
import { UploadOutlined, FileTextOutlined, InboxOutlined, UserOutlined, PhoneOutlined, MailOutlined, EnvironmentOutlined, CalendarOutlined, BuildOutlined, BookOutlined, TrophyOutlined } from '@ant-design/icons';
import ModalBasePattern from './ModalBasePattern';
import { API_ENDPOINTS } from '../config/api';
import { apiPost } from '../utils/apiClient';

const { Text, Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

/**
 * 简历上传弹窗组件
 * 支持文件上传和文本粘贴两种方式，自动解析简历信息
 * 使用弹窗基础模式实现右侧抽屉式弹窗
 */
const ResumeUploadModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('boss'); // 默认选择Boss直聘简历解析
  const [parsedResume, setParsedResume] = useState(null);
  
  // 监听Boss直聘简历文本字段的变化
  const bossResumeText = Form.useWatch('bossResumeText', form);
  
  // 简历来源选项
  const resumeSources = [
    { value: 'boss', label: 'Boss直聘' },
    { value: 'qcwy', label: '前程无忧' },
    { value: 'zlzp', label: '智联招聘' },
    { value: 'lagou', label: '拉勾网' },
    { value: 'liepin', label: '猎聘网' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'manual', label: '手动添加' }
  ];

  // 根据当前Tab设置简历来源默认值
  useEffect(() => {
    if (activeTab === 'file') {
      // 文件上传时默认为智联招聘
      form.setFieldsValue({ source: 'zlzp' });
    } else if (activeTab === 'boss') {
      // Boss直聘简历解析时默认为Boss直聘
      form.setFieldsValue({ source: 'boss' });
    }
  }, [activeTab, form]);

  // 处理文件上传
  const handleFileUpload = useCallback(async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await apiPost('/api/resume-library/upload', formData);
      
      if (result.success) {
        setParsedResume(result.data.parsedResume);
        message.success('文件上传成功，已自动解析简历信息');
      } else {
        message.error(result.error || '文件上传失败');
      }
    } catch (error) {
      console.error('文件上传失败:', error);
      message.error('文件上传失败，请重试');
    } finally {
      setLoading(false);
    }
    
    return false; // 阻止默认上传行为
  }, []);

  // 处理Boss直聘简历解析（使用大模型）
  const handleBossResumeParseText = useCallback(async () => {
    const textValue = form.getFieldValue('bossResumeText');
    if (!textValue || textValue.trim().length < 50) {
      message.warning('请输入足够的Boss直聘简历文本内容（至少50字符）');
      return;
    }
    
    setLoading(true);
    try {
      const result = await apiPost('/api/resume/parse-boss-resume', { text: textValue });
      
      if (result.success) {
        // 处理新的结构化JSON数据格式
        if (result.data.name && result.data.name !== '未知') {
          // 新格式：直接使用结构化数据
          setParsedResume({
            ...result.data,
            name: result.data.name || '大模型解析结果'
          });
          message.success('Boss直聘简历解析成功（结构化数据）');
        } else {
          // 旧格式：兼容Markdown格式
          setParsedResume({
            name: '大模型解析结果',
            parsedContent: result.data.parsedContent,
            parseMethod: 'llm',
            originalText: result.data.originalText || result.data.text,
            timestamp: result.data.timestamp
          });
          message.success('Boss直聘简历解析成功（Markdown格式）');
        }
      } else {
        message.error(result.error || 'Boss直聘简历解析失败');
      }
    } catch (error) {
      console.error('Boss直聘简历解析失败:', error);
      message.error('Boss直聘简历解析失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [form]);

  // 提交简历
  const handleSubmit = useCallback(async () => {
    try {
      const values = await form.validateFields();
      
      if (!parsedResume) {
        message.warning('请先上传文件或解析文本');
        return;
      }
      
      setLoading(true);
      
      const resumeData = {
        ...parsedResume,
        source: values.source,
        notes: values.notes
      };
      
      console.log('提交的简历数据:', resumeData);
      
      const result = await apiPost(API_ENDPOINTS.RESUME_LIBRARY, resumeData);
      console.log('服务器响应:', result);
      
      if (result.success) {
        message.success('简历添加成功');
        onSuccess && onSuccess(result.data);
        handleClose();
      } else {
        console.error('业务错误:', result.error);
        message.error(result.error || '简历添加失败');
      }
    } catch (error) {
      console.error('简历添加失败:', error);
      message.error('简历添加失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [form, parsedResume, onSuccess]);

  // 关闭弹窗并重置状态
  const handleClose = useCallback(() => {
    form.resetFields();
    setParsedResume(null);
    setActiveTab('file'); // 重置为文件上传Tab
    onClose();
  }, [form, onClose]);

  // 文件上传配置
  const uploadProps = {
    name: 'file',
    multiple: false,
    accept: '.pdf,.doc,.docx',
    beforeUpload: handleFileUpload,
    showUploadList: false
  };

  return (
    <ModalBasePattern
      visible={visible}
      onClose={handleClose}
      title="上传简历"
      dataAttribute="resume-upload-drawer"
    >
      <Spin spinning={loading} style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Form form={form} layout="vertical" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            style={{ flex: '1 0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            tabBarStyle={{ flexShrink: 0 }}
            items={[
              {
                key: 'file',
                label: (
                  <span>
                    <UploadOutlined />
                    文件上传
                  </span>
                ),
                children: (
                  <>
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6f8fa' }}>
                      <Text type="secondary">
                        支持上传PDF、DOC、DOCX格式的简历文件，系统将自动解析简历内容。上传的简历默认来源为"智联招聘"。
                      </Text>
                    </Card>
                    <Dragger {...uploadProps} style={{ marginBottom: 16, height: '200px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                      <p className="ant-upload-hint">
                        支持 PDF、DOC、DOCX 格式，文件大小不超过 10MB
                      </p>
                    </Dragger>
                  </>
                )
              },
              {
                key: 'boss',
                label: (
                  <span>
                    <FileTextOutlined />
                    Boss直聘简历解析
                  </span>
                ),
                children: (
                  <>
                    <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f6f8fa' }}>
                      <Text type="secondary">
                        请将Boss直聘上的候选人简历文本复制粘贴到下方文本框中，系统将使用大模型AI自动解析并以Markdown格式输出结构化简历。
                      </Text>
                    </Card>
                    
                    <Form.Item 
                      name="bossResumeText" 
                      label="Boss直聘简历文本"
                      rules={[{ required: true, message: '请输入Boss直聘简历文本' }]}
                    >
                      <TextArea 
                        rows={10} 
                        placeholder="请粘贴Boss直聘简历文本...\n\n示例格式：\n张伟 28岁 5年 本科 离职\n\n我是一名有着5年工作经验的解决方案经理...\n\n期望职位：解决方案经理\n工作地点：北京\n行业：互联网\n薪资：15k-25k/月\n\n岗位经验\n解决方案经理 5年\n\n工作经历\n2019-03-2024-10 北京科技有限公司 解决方案经理\n负责企业级解决方案的设计和实施..."
                      />
                    </Form.Item>
                    
                    <Button 
                      type="primary" 
                      onClick={handleBossResumeParseText}
                      loading={loading}
                      disabled={!bossResumeText?.trim()}
                    >
                      解析Boss直聘简历
                    </Button>
                  </>
                )
              }
            ]}
          />
          
          {parsedResume && (
            <Card 
              title={(
                <Space>
                  <UserOutlined />
                  <span>解析结果</span>

                  {parsedResume.qualityScore && (
                    <Tag color={parsedResume.qualityScore >= 80 ? 'success' : parsedResume.qualityScore >= 60 ? 'warning' : 'error'}>
                      质量评分: {parsedResume.qualityScore}分
                    </Tag>
                  )}
                </Space>
              )}
              size="small" 
              style={{ marginTop: 16, marginBottom: 16, maxHeight: '600px', overflow: 'auto' }}
              styles={{ body: { padding: '16px' } }}
            >
              {/* 大模型解析结果显示 */}
              {parsedResume.parseMethod === 'llm' ? (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary">解析时间: {new Date(parsedResume.timestamp).toLocaleString()}</Text>
                  </div>
                  <div style={{ 
                    backgroundColor: '#f6f8fa', 
                    padding: '16px', 
                    borderRadius: '6px',
                    border: '1px solid #e1e4e8',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    {parsedResume.parsedContent}
                  </div>
                </div>
              ) : (
                /* 原有的结构化显示 */
                <div>
                  <Descriptions column={1} size="small" styles={{ label: { width: '80px' } }}>
                    <Descriptions.Item label="姓名">
                      <Tag color="blue">{parsedResume.name || '未识别'}</Tag>
                    </Descriptions.Item>
                    {parsedResume.age && (
                      <Descriptions.Item label="年龄">
                        <Tag color="cyan">{parsedResume.age}</Tag>
                      </Descriptions.Item>
                    )}
                    {parsedResume.workYears && (
                      <Descriptions.Item label="工作年限">
                        <Tag color="orange">{parsedResume.workYears}年</Tag>
                      </Descriptions.Item>
                    )}
                    {(parsedResume.education || (parsedResume.educationExperience && parsedResume.educationExperience[0]?.degree)) && (
                      <Descriptions.Item label="学历">
                        <Tag color="green">
                          {parsedResume.education || parsedResume.educationExperience[0]?.degree}
                        </Tag>
                      </Descriptions.Item>
                    )}
                    {parsedResume.currentStatus && (
                      <Descriptions.Item label="目前状态">
                        <Tag color={parsedResume.currentStatus === '在职' ? 'success' : 'warning'}>
                          {parsedResume.currentStatus}
                        </Tag>
                      </Descriptions.Item>
                    )}
                    {parsedResume.phone && (
                      <Descriptions.Item label="电话">
                        <Space><PhoneOutlined />{parsedResume.phone}</Space>
                      </Descriptions.Item>
                    )}
                    {parsedResume.email && (
                      <Descriptions.Item label="邮箱">
                        <Space><MailOutlined />{parsedResume.email}</Space>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                  
                  {parsedResume.expectedPosition && (
                    parsedResume.expectedPosition.position || 
                    parsedResume.expectedPosition.location || 
                    parsedResume.expectedPosition.salary
                  ) && (
                    <>
                      <Divider orientation="left" style={{ margin: '12px 0 8px 0' }}>期望职位</Divider>
                      <Space wrap>
                        {parsedResume.expectedPosition.position && parsedResume.expectedPosition.position.trim() !== '' && (
                          <Tag color="purple">{parsedResume.expectedPosition.position}</Tag>
                        )}
                        {parsedResume.expectedPosition.location && parsedResume.expectedPosition.location.trim() !== '' && (
                          <Tag color="blue"><EnvironmentOutlined /> {parsedResume.expectedPosition.location}</Tag>
                        )}
                        {parsedResume.expectedPosition.salary && parsedResume.expectedPosition.salary.trim() !== '' && (
                          <Tag color="gold">{parsedResume.expectedPosition.salary}</Tag>
                        )}
                      </Space>
                    </>
                  )}
                  
                  {parsedResume.workExperience && parsedResume.workExperience.length > 0 && (
                    <>
                      <Divider orientation="left" style={{ margin: '12px 0 8px 0' }}>工作经历</Divider>
                      <List
                        size="small"
                        dataSource={parsedResume.workExperience.slice(0, 3)}
                        renderItem={(item, index) => (
                          <List.Item key={index}>
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <Text strong>{item.company}</Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  <CalendarOutlined /> {item.duration}
                                </Text>
                              </div>
                              <div style={{ marginBottom: '4px' }}>
                                <Tag color="blue">{item.position}</Tag>
                                {item.department && <Tag color="cyan">{item.department}</Tag>}
                              </div>
                              {item.description && (
                                <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>
                                  {item.description.length > 100 ? item.description.substring(0, 100) + '...' : item.description}
                                </Text>
                              )}
                            </div>
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                  
                  {parsedResume.educationExperience && parsedResume.educationExperience.length > 0 && (
                    <>
                      <Divider orientation="left" style={{ margin: '12px 0 8px 0' }}>教育经历</Divider>
                      <List
                        size="small"
                        dataSource={parsedResume.educationExperience.slice(0, 2)}
                        renderItem={(item, index) => (
                          <List.Item key={index}>
                            <div style={{ width: '100%' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <Text strong>{item.school}</Text>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  <CalendarOutlined /> {item.duration}
                                </Text>
                              </div>
                              <div>
                                <Tag color="green"><BookOutlined /> {item.degree}</Tag>
                                {item.major && <Tag color="blue">{item.major}</Tag>}
                              </div>
                            </div>
                          </List.Item>
                        )}
                      />
                    </>
                  )}
                  
                  {parsedResume.skills && parsedResume.skills.length > 0 && (
                    <>
                      <Divider orientation="left" style={{ margin: '12px 0 8px 0' }}>技能标签</Divider>
                      <Space wrap>
                        {parsedResume.skills.slice(0, 12).map((skill, index) => (
                          <Tag key={index} color="processing">{skill}</Tag>
                        ))}
                        {parsedResume.skills.length > 12 && (
                          <Tag>+{parsedResume.skills.length - 12}</Tag>
                        )}
                      </Space>
                    </>
                  )}
                </div>
              )}
            </Card>
          )}
          
          <Form.Item 
            name="source" 
            label="简历来源" 
            rules={[{ required: true, message: '请选择简历来源' }]}
            style={{ marginBottom: 16 }}
          >
            <Select 
              placeholder="请选择简历来源"
              options={resumeSources}
            />
          </Form.Item>
          
          <Form.Item name="notes" label="备注">
            <TextArea rows={2} placeholder="添加备注信息（可选）" />
          </Form.Item>
          
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid #f0f0f0', paddingTop: '16px', position: 'sticky', bottom: 0, background: 'white' }}>
            <Space>
              <Button onClick={handleClose}>取消</Button>
              <Button 
                type="primary" 
                onClick={handleSubmit}
                loading={loading}
                disabled={!parsedResume}
              >
                确认添加
              </Button>
            </Space>
          </div>
        </Form>
      </Spin>
    </ModalBasePattern>
  );
};

export default ResumeUploadModal;