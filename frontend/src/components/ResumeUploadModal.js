import React, { useState, useCallback } from 'react';
import { Form, Input, Select, Upload, Button, Space, Typography, Card, Tabs, message, Spin } from 'antd';
import { UploadOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons';
import ModalBasePattern from './ModalBasePattern';

const { Text } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;
const { Dragger } = Upload;

/**
 * 简历上传弹窗组件
 * 支持文件上传和文本粘贴两种方式，自动解析简历信息
 * 使用弹窗基础模式实现右侧抽屉式弹窗
 */
const ResumeUploadModal = ({ visible, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('file');
  const [parsedResume, setParsedResume] = useState(null);
  
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

  // 处理文件上传
  const handleFileUpload = useCallback(async (file) => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/resume-library/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
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

  // 处理文本解析
  const handleTextParse = useCallback(async () => {
    const textValue = form.getFieldValue('resumeText');
    if (!textValue || textValue.trim().length < 50) {
      message.warning('请输入足够的简历文本内容（至少50字符）');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('/api/resume-library/parse-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: textValue })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setParsedResume(result.data);
        message.success('简历文本解析成功');
      } else {
        message.error(result.error || '文本解析失败');
      }
    } catch (error) {
      console.error('文本解析失败:', error);
      message.error('文本解析失败，请重试');
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
      
      const response = await fetch('/api/resume-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resumeData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('简历添加成功');
        onSuccess && onSuccess(result.data);
        handleClose();
      } else {
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
    setActiveTab('file');
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
      <Spin spinning={loading}>
        <Form form={form} layout="vertical">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane 
              tab={
                <span>
                  <UploadOutlined />
                  文件上传
                </span>
              } 
              key="file"
            >
              <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持 PDF、DOC、DOCX 格式，文件大小不超过 10MB
                </p>
              </Dragger>
            </TabPane>
            
            <TabPane 
              tab={
                <span>
                  <FileTextOutlined />
                  文本粘贴
                </span>
              } 
              key="text"
            >
              <Form.Item 
                name="resumeText" 
                label="简历文本"
                rules={[{ required: true, message: '请输入简历文本' }]}
              >
                <TextArea 
                  rows={8} 
                  placeholder="请粘贴简历文本内容，系统将自动解析关键信息..."
                />
              </Form.Item>
              
              <Button 
                type="primary" 
                onClick={handleTextParse}
                loading={loading}
              >
                解析文本
              </Button>
            </TabPane>
          </Tabs>
          
          {parsedResume && (
            <Card title="解析结果" size="small" style={{ marginTop: 16, marginBottom: 16 }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Text><strong>姓名：</strong>{parsedResume.name || '未识别'}</Text>
                <Text><strong>电话：</strong>{parsedResume.phone || '未识别'}</Text>
                <Text><strong>邮箱：</strong>{parsedResume.email || '未识别'}</Text>
                <Text><strong>应聘职位：</strong>{parsedResume.position || '未识别'}</Text>
                <Text><strong>工作经验：</strong>{parsedResume.experience || '未识别'}</Text>
                <Text><strong>学历：</strong>{parsedResume.education || '未识别'}</Text>
                <Text><strong>技能：</strong>{parsedResume.skills?.join(', ') || '未识别'}</Text>
              </Space>
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
          
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
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
        </Form>
      </Spin>
    </ModalBasePattern>
  );
};

export default ResumeUploadModal;