import React, { useState, useEffect } from 'react';
import { Typography, Divider, Tag, Space, Card, Button, Input, Select, message, Form, Modal } from 'antd';
import { 
  UserOutlined, 
  BookOutlined, 
  TrophyOutlined, 
  CheckCircleOutlined,
  CloseOutlined,
  EditOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  RocketOutlined,
  GlobalOutlined,
  CheckCircleOutlined as CheckCircleIcon,
  ClockCircleOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;

// 抽屉式组件样式
const JDDrawer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'visible'
})`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 33.33%;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateX(${props => props.visible ? '0' : '100%'});
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
`;

const DrawerHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
`;

const DrawerContent = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
`;

const CloseButton = styled(Button)`
  border: none;
  background: transparent;
  color: white;
  box-shadow: none;
  
  &:hover, &:focus {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const EditButton = styled(Button)`
  border: none;
  background: transparent;
  color: white;
  box-shadow: none;
  margin-right: 8px;
  
  &:hover, &:focus {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const EditableCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  .ant-card-body {
    padding: 16px;
  }
  
  &.editing {
    border: 2px solid #1890ff;
  }
`;

const EditableItem = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'bgColor' && prop !== 'borderColor'
})`
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: ${props => props.bgColor || '#f8f9fa'};
  border-radius: 6px;
  border-left: 3px solid ${props => props.borderColor || '#52c41a'};
  position: relative;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.editing {
    background: #fff;
    border: 1px solid #1890ff;
    border-left: 3px solid ${props => props.borderColor || '#52c41a'};
  }
  
  .edit-controls {
    position: absolute;
    right: 8px;
    top: 8px;
    display: flex;
    gap: 4px;
  }
`;

const AddItemButton = styled(Button)`
  width: 100%;
  margin-top: 8px;
  border-style: dashed;
  height: 40px;
  
  &:hover {
    border-color: #1890ff;
    color: #1890ff;
  }
`;

const JobTitle = styled(Title)`
  color: #1890ff !important;
  margin-bottom: 16px !important;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SectionTitle = styled(Title)`
  color: #262626 !important;
  margin: 24px 0 16px 0 !important;
  font-size: 16px !important;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 4px solid #1890ff;
  padding-left: 12px;
`;

const InfoCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  .ant-card-body {
    padding: 16px;
  }
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled(Text)`
  font-weight: 600;
  color: #595959;
  min-width: 80px;
  margin-right: 12px;
`;

const InfoValue = styled(Text)`
  color: #262626;
`;

const SkillTag = styled(Tag)`
  margin: 4px;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
`;

const RequirementItem = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #52c41a;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const ResponsibilityItem = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #f0f8ff;
  border-radius: 6px;
  border-left: 3px solid #1890ff;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const BenefitItem = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  padding: 8px 12px;
  background: #fff7e6;
  border-radius: 6px;
  border-left: 3px solid #fa8c16;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const PublishButton = styled(Button)`
  width: 100%;
  height: 48px;
  margin-top: 24px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  
  &:hover, &:focus {
    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    color: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(102, 126, 234, 0.5);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const ProgressModal = styled(Modal)`
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
    padding: 32px 24px;
  }
`;

const ProgressStep = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'completed'
})`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: ${props => props.completed ? '#f6ffed' : '#fafafa'};
  border: 1px solid ${props => props.completed ? '#b7eb8f' : '#d9d9d9'};
  border-radius: 8px;
  transition: all 0.3s ease;
  
  .step-icon {
    margin-right: 12px;
    font-size: 18px;
    color: ${props => props.completed ? '#52c41a' : '#bfbfbf'};
  }
  
  .step-content {
    flex: 1;
  }
  
  .step-title {
    font-weight: 600;
    margin-bottom: 4px;
    color: ${props => props.completed ? '#262626' : '#8c8c8c'};
  }
  
  .step-description {
    font-size: 12px;
    color: ${props => props.completed ? '#595959' : '#bfbfbf'};
  }
`;

const SuccessModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-header {
    background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
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
    padding: 32px 24px;
  }
  
  .ant-modal-footer {
    border-top: none;
    padding: 0 24px 24px;
  }
`;

const SuccessInfo = styled.div`
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  
  .info-item {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-icon {
      margin-right: 8px;
      color: #52c41a;
    }
    
    .info-text {
      color: #262626;
    }
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  
  .ant-btn {
    height: 40px;
    border-radius: 6px;
    font-weight: 500;
  }
`;

const JDDetailDrawer = ({ visible, onClose, positionData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [form] = Form.useForm();
  
  // 发布相关状态
  const [publishModalVisible, setPublishModalVisible] = useState(false);
  const [progressModalVisible, setProgressModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [publishProgress, setPublishProgress] = useState({
    step1: false, // 同步至任务管理列表
    step2: false, // 发布至招聘平台
    step3: false, // 设置招聘条件
    step4: false  // 发布职位
  });
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (positionData) {
      setEditData({ ...positionData });
      form.setFieldsValue(positionData);
    }
  }, [positionData, form]);

  // 添加加载状态处理
  if (!positionData) {
    return (
      <JDDrawer visible={visible}>
        <DrawerHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOutlined />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              岗位JD详情
            </span>
          </div>
          <CloseButton 
            icon={<CloseOutlined />} 
            onClick={onClose}
            size="small"
          />
        </DrawerHeader>
        <DrawerContent>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Text type="secondary">正在加载岗位数据...</Text>
          </div>
        </DrawerContent>
      </JDDrawer>
    );
  }

  if (!editData) {
    return (
      <JDDrawer visible={visible}>
        <DrawerHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOutlined />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              岗位JD详情
            </span>
          </div>
          <CloseButton 
            icon={<CloseOutlined />} 
            onClick={onClose}
            size="small"
          />
        </DrawerHeader>
        <DrawerContent>
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <Text type="secondary">正在初始化编辑数据...</Text>
          </div>
        </DrawerContent>
      </JDDrawer>
    );
  }

  // 保存修改
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const updatedData = { ...editData, ...values };
      
      // 调用API更新岗位信息
      const response = await fetch(`/api/positions/${positionData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        setEditData(updatedData);
        setIsEditing(false);
        message.success('岗位信息更新成功');
      } else {
        message.error('更新失败，请重试');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditData({ ...positionData });
    form.setFieldsValue(positionData);
    setIsEditing(false);
  };

  // 添加技能标签
  const addSkill = () => {
    const newSkills = [...(editData.skills || []), ''];
    const updatedData = { ...editData, skills: newSkills };
    setEditData(updatedData);
    updateFullDescription(updatedData);
  };

  // 删除技能标签
  const removeSkill = (index) => {
    const newSkills = editData.skills.filter((_, i) => i !== index);
    const updatedData = { ...editData, skills: newSkills };
    setEditData(updatedData);
    updateFullDescription(updatedData);
  };

  // 更新技能标签
  const updateSkill = (index, value) => {
    const newSkills = [...editData.skills];
    newSkills[index] = value;
    const updatedData = { ...editData, skills: newSkills };
    setEditData(updatedData);
    updateFullDescription(updatedData);
  };

  // 添加列表项（职责、要求、福利）
  const addListItem = (field) => {
    const newList = [...(editData[field] || []), ''];
    const updatedData = { ...editData, [field]: newList };
    setEditData(updatedData);
    
    // 自动同步更新完整描述
    if (['responsibilities', 'requirements', 'benefits'].includes(field)) {
      updateFullDescription(updatedData);
    }
  };

  // 删除列表项
  const removeListItem = (field, index) => {
    const newList = editData[field].filter((_, i) => i !== index);
    const updatedData = { ...editData, [field]: newList };
    setEditData(updatedData);
    
    // 自动同步更新完整描述
    if (['responsibilities', 'requirements', 'benefits'].includes(field)) {
      updateFullDescription(updatedData);
    }
  };

  // 更新列表项
  const updateListItem = (field, index, value) => {
    const newList = [...editData[field]];
    newList[index] = value;
    const updatedData = { ...editData, [field]: newList };
    setEditData(updatedData);
    
    // 自动同步更新完整描述
    if (['responsibilities', 'requirements', 'benefits'].includes(field)) {
      updateFullDescription(updatedData);
    }
  };

  // 自动生成完整描述
  const generateFullDescription = (data) => {
    const { title, department, location, salary, experience, education, skills, responsibilities, requirements, benefits } = data;
    
    let description = `# ${title || '岗位名称'}\n\n`;
    
    // 基本信息
    description += `**部门：** ${department || '待定'}  \n`;
    description += `**工作地点：** ${location || '待定'}  \n`;
    description += `**薪资范围：** ${salary || '面议'}  \n`;
    description += `**工作经验：** ${experience || '不限'}  \n`;
    description += `**学历要求：** ${education || '不限'}  \n`;
    
    // 技能要求
    if (skills && skills.length > 0) {
      const validSkills = skills.filter(skill => skill && skill.trim());
      if (validSkills.length > 0) {
        description += `**技能要求：** ${validSkills.join('、')}  \n`;
      }
    }
    description += `\n`;
    
    // 岗位职责
    if (responsibilities && responsibilities.length > 0) {
      const validResponsibilities = responsibilities.filter(item => item && item.trim());
      if (validResponsibilities.length > 0) {
        description += `## 岗位职责\n`;
        validResponsibilities.forEach((item, index) => {
          description += `${index + 1}. ${item.trim()}\n`;
        });
        description += `\n`;
      }
    }
    
    // 任职要求
    if (requirements && requirements.length > 0) {
      const validRequirements = requirements.filter(item => item && item.trim());
      if (validRequirements.length > 0) {
        description += `## 任职要求\n`;
        validRequirements.forEach((item, index) => {
          description += `${index + 1}. ${item.trim()}\n`;
        });
        description += `\n`;
      }
    }
    
    // 福利待遇
    if (benefits && benefits.length > 0) {
      const validBenefits = benefits.filter(item => item && item.trim());
      if (validBenefits.length > 0) {
        description += `## 福利待遇\n`;
        validBenefits.forEach((item, index) => {
          description += `${index + 1}. ${item.trim()}\n`;
        });
      }
    }
    
    return description.trim();
  };

  // 更新完整描述
  const updateFullDescription = (data) => {
    const newDescription = generateFullDescription(data);
    setEditData(prevData => ({
      ...prevData,
      description: newDescription
    }));
  };

  // 处理一键发布
  const handlePublish = () => {
    setPublishModalVisible(true);
  };

  // 确认发布
  const confirmPublish = async () => {
    setPublishModalVisible(false);
    setProgressModalVisible(true);
    setPublishing(true);
    
    try {
      // 第一步：同步至任务管理列表
      await syncToTaskManagement();
      setPublishProgress(prev => ({ ...prev, step1: true }));
      
      // 第二步：模拟发布至招聘平台
      await simulatePlatformPublish();
      setPublishProgress(prev => ({ ...prev, step2: true }));
      
      // 第三步：模拟设置招聘条件
      await simulateSetConditions();
      setPublishProgress(prev => ({ ...prev, step3: true }));
      
      // 第四步：模拟发布职位
      await simulatePublishPosition();
      setPublishProgress(prev => ({ ...prev, step4: true }));
      
      // 发布完成
      setPublishing(false);
      setProgressModalVisible(false);
      setSuccessModalVisible(true);
      
    } catch (error) {
      console.error('发布失败:', error);
      message.error('发布失败，请重试');
      setPublishing(false);
      setProgressModalVisible(false);
    }
  };

  // 同步至任务管理列表
  const syncToTaskManagement = async () => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const taskData = {
        title: `招聘${positionData.title}`,
        position: positionData.title,
        description: positionData.description,
        status: '进行中',
        priority: '高',
        platforms: ['智联招聘'],
        candidates: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });
      
      if (!response.ok) {
        throw new Error('同步任务管理失败');
      }
      
      message.success('已同步至招聘任务管理列表');
    } catch (error) {
      console.error('同步任务管理失败:', error);
      throw error;
    }
  };

  // 模拟发布至招聘平台
  const simulatePlatformPublish = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    message.success('已进入智联招聘职位管理界面');
  };

  // 模拟设置招聘条件
  const simulateSetConditions = async () => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    message.success('已完成招聘条件设置');
  };

  // 模拟发布职位
  const simulatePublishPosition = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    message.success('职位发布成功');
  };

  // 查看任务管理
  const viewTaskManagement = () => {
    setSuccessModalVisible(false);
    // 这里可以添加跳转到任务管理页面的逻辑
    message.info('跳转到任务管理页面');
  };

  // 关闭成功弹窗
  const closeSuccessModal = () => {
    setSuccessModalVisible(false);
    // 重置发布进度
    setPublishProgress({
      step1: false,
      step2: false,
      step3: false,
      step4: false
    });
  };

  const renderBasicInfo = () => (
    <EditableCard className={isEditing ? 'editing' : ''}>
      <Form form={form} layout="vertical">
        <Space direction="vertical" style={{ width: '100%' }}>
          <InfoItem>
            <InfoLabel>岗位名称：</InfoLabel>
            {isEditing ? (
              <Form.Item name="title" style={{ margin: 0, flex: 1 }}>
                <Input 
                  value={editData.title}
                  onChange={e => {
                    const updatedData = {...editData, title: e.target.value};
                    setEditData(updatedData);
                    updateFullDescription(updatedData);
                  }}
                />
              </Form.Item>
            ) : (
              <InfoValue strong>{editData.title}</InfoValue>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>所属部门：</InfoLabel>
            {isEditing ? (
              <Form.Item name="department" style={{ margin: 0, flex: 1 }}>
                <Input 
                  value={editData.department || ''}
                  onChange={e => {
                    const updatedData = {...editData, department: e.target.value};
                    setEditData(updatedData);
                    updateFullDescription(updatedData);
                  }}
                  placeholder="请输入部门名称"
                />
              </Form.Item>
            ) : (
              <InfoValue>{editData.department || '待定'}</InfoValue>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>工作地点：</InfoLabel>
            {isEditing ? (
              <Form.Item name="location" style={{ margin: 0, flex: 1 }}>
                <Input 
                  value={editData.location || ''}
                  onChange={e => {
                    const updatedData = {...editData, location: e.target.value};
                    setEditData(updatedData);
                    updateFullDescription(updatedData);
                  }}
                  placeholder="请输入工作地点"
                />
              </Form.Item>
            ) : (
              <InfoValue>{editData.location || '待定'}</InfoValue>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>薪资范围：</InfoLabel>
            {isEditing ? (
              <Form.Item name="salary" style={{ margin: 0, flex: 1 }}>
                <Input 
                  value={editData.salary || ''}
                  onChange={e => {
                    const updatedData = {...editData, salary: e.target.value};
                    setEditData(updatedData);
                    updateFullDescription(updatedData);
                  }}
                  placeholder="请输入薪资范围"
                />
              </Form.Item>
            ) : (
              <InfoValue>{editData.salary || '面议'}</InfoValue>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>工作经验：</InfoLabel>
            {isEditing ? (
              <Form.Item name="experience" style={{ margin: 0, flex: 1 }}>
                <Input 
                  value={editData.experience}
                  onChange={e => {
                    const updatedData = {...editData, experience: e.target.value};
                    setEditData(updatedData);
                    updateFullDescription(updatedData);
                  }}
                  placeholder="请输入工作经验要求"
                />
              </Form.Item>
            ) : (
              <InfoValue>{editData.experience}年</InfoValue>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>学历要求：</InfoLabel>
            {isEditing ? (
              <Form.Item name="education" style={{ margin: 0, flex: 1 }}>
                <Select 
                  value={editData.education}
                  onChange={value => {
                    const updatedData = {...editData, education: value};
                    setEditData(updatedData);
                    updateFullDescription(updatedData);
                  }}
                  style={{ width: '100%' }}
                >
                  <Select.Option value="高中">高中</Select.Option>
                  <Select.Option value="大专">大专</Select.Option>
                  <Select.Option value="本科">本科</Select.Option>
                  <Select.Option value="硕士">硕士</Select.Option>
                  <Select.Option value="博士">博士</Select.Option>
                </Select>
              </Form.Item>
            ) : (
              <InfoValue>{editData.education}</InfoValue>
            )}
          </InfoItem>
          
          <InfoItem>
            <InfoLabel>技能要求：</InfoLabel>
            <div style={{ flex: 1 }}>
              {isEditing ? (
                <div>
                  {editData.skills && editData.skills.map((skill, index) => (
                    <div key={index} style={{ display: 'inline-block', margin: '2px' }}>
                      <Input
                        size="small"
                        value={skill}
                        onChange={e => updateSkill(index, e.target.value)}
                        style={{ width: '120px', marginRight: '4px' }}
                      />
                      <Button 
                        size="small"
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => removeSkill(index)}
                      />
                    </div>
                  ))}
                  <Button 
                    size="small"
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={addSkill}
                    style={{ marginTop: '4px' }}
                  >
                    添加技能
                  </Button>
                </div>
              ) : (
                <div>
                  {editData.skills && editData.skills.map((skill, index) => (
                    <SkillTag key={index} color="blue">{skill}</SkillTag>
                  ))}
                </div>
              )}
            </div>
          </InfoItem>
        </Space>
      </Form>
    </EditableCard>
  );

  const renderResponsibilities = () => {
    if (!editData.responsibilities || editData.responsibilities.length === 0) {
      if (!isEditing) return null;
    }

    return (
      <div>
        <SectionTitle level={4}>
          <CheckCircleOutlined />
          岗位职责
        </SectionTitle>
        {editData.responsibilities && editData.responsibilities.map((responsibility, index) => (
          <EditableItem 
            key={index} 
            bgColor="#f0f8ff" 
            borderColor="#1890ff"
            className={isEditing ? 'editing' : ''}
          >
            {isEditing ? (
              <>
                <Input.TextArea 
                  value={responsibility}
                  onChange={e => updateListItem('responsibilities', index, e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                />
                <div className="edit-controls">
                  <Button 
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeListItem('responsibilities', index)}
                  />
                </div>
              </>
            ) : (
              <Text style={{ marginLeft: 8 }}>{responsibility}</Text>
            )}
          </EditableItem>
        ))}
        {isEditing && (
          <AddItemButton 
            icon={<PlusOutlined />} 
            onClick={() => addListItem('responsibilities')}
          >
            添加岗位职责
          </AddItemButton>
        )}
      </div>
    );
  };

  const renderRequirements = () => {
    if (!editData.requirements || editData.requirements.length === 0) {
      if (!isEditing) return null;
    }

    return (
      <div>
        <SectionTitle level={4}>
          <UserOutlined />
          任职要求
        </SectionTitle>
        {editData.requirements && editData.requirements.map((requirement, index) => (
          <EditableItem 
            key={index} 
            bgColor="#f8f9fa" 
            borderColor="#52c41a"
            className={isEditing ? 'editing' : ''}
          >
            {isEditing ? (
              <>
                <Input.TextArea 
                  value={requirement}
                  onChange={e => updateListItem('requirements', index, e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                />
                <div className="edit-controls">
                  <Button 
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeListItem('requirements', index)}
                  />
                </div>
              </>
            ) : (
              <Text style={{ marginLeft: 8 }}>{requirement}</Text>
            )}
          </EditableItem>
        ))}
        {isEditing && (
          <AddItemButton 
            icon={<PlusOutlined />} 
            onClick={() => addListItem('requirements')}
          >
            添加任职要求
          </AddItemButton>
        )}
      </div>
    );
  };

  const renderBenefits = () => {
    if (!editData.benefits || editData.benefits.length === 0) {
      if (!isEditing) return null;
    }

    return (
      <div>
        <SectionTitle level={4}>
          <TrophyOutlined />
          福利待遇
        </SectionTitle>
        {editData.benefits && editData.benefits.map((benefit, index) => (
          <EditableItem 
            key={index} 
            bgColor="#fff7e6" 
            borderColor="#fa8c16"
            className={isEditing ? 'editing' : ''}
          >
            {isEditing ? (
              <>
                <Input.TextArea 
                  value={benefit}
                  onChange={e => updateListItem('benefits', index, e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{ width: '100%', border: 'none', background: 'transparent' }}
                />
                <div className="edit-controls">
                  <Button 
                    size="small"
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeListItem('benefits', index)}
                  />
                </div>
              </>
            ) : (
              <Text style={{ marginLeft: 8 }}>{benefit}</Text>
            )}
          </EditableItem>
        ))}
        {isEditing && (
          <AddItemButton 
            icon={<PlusOutlined />} 
            onClick={() => addListItem('benefits')}
          >
            添加福利待遇
          </AddItemButton>
        )}
      </div>
    );
  };

  const renderFullDescription = () => {
    if (!editData.description && !isEditing) {
      return null;
    }

    return (
      <div>
        <SectionTitle level={4}>
          <BookOutlined />
          完整描述
          {isEditing && (
            <Text 
              type="secondary" 
              style={{ fontSize: '12px', fontWeight: 'normal', marginLeft: '8px' }}
            >
              (自动根据上述内容生成，无需手动编辑)
            </Text>
          )}
        </SectionTitle>
        <Card 
          style={{ 
            background: isEditing ? '#f8f9fa' : '#fafafa',
            border: isEditing ? '1px dashed #d9d9d9' : '1px solid #d9d9d9'
          }}
        >
          <div style={{ 
            whiteSpace: 'pre-line',
            color: isEditing ? '#666' : '#000',
            fontStyle: isEditing ? 'italic' : 'normal'
          }}>
            {editData.description || '完整描述将根据上述信息自动生成...'}
          </div>
        </Card>
      </div>
    );
  };

  const renderPublishButton = () => (
    <div style={{ marginTop: '24px' }}>
      <PublishButton
        type="primary"
        icon={<RocketOutlined />}
        onClick={handlePublish}
        size="large"
      >
        🚀 一键发布到招聘平台
      </PublishButton>
    </div>
  );

  return (
    <>
      <JDDrawer visible={visible}>
        <DrawerHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOutlined />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              岗位JD详情 {isEditing && '(编辑模式)'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isEditing ? (
              <>
                <EditButton 
                  icon={<SaveOutlined />} 
                  onClick={handleSave}
                  size="small"
                >
                  保存
                </EditButton>
                <EditButton 
                  onClick={handleCancel}
                  size="small"
                >
                  取消
                </EditButton>
              </>
            ) : (
              <EditButton 
                icon={<EditOutlined />} 
                onClick={() => {
                  setIsEditing(true);
                  // 进入编辑模式时自动生成一次完整描述
                  updateFullDescription(editData);
                }}
                size="small"
              >
                编辑
              </EditButton>
            )}
            <CloseButton 
              icon={<CloseOutlined />} 
              onClick={onClose}
              size="small"
            />
          </div>
        </DrawerHeader>
        
        <DrawerContent>
          <JobTitle level={3}>
            <UserOutlined />
            {positionData.title}
          </JobTitle>
          
          {renderBasicInfo()}
          
          <Divider />
          
          {renderResponsibilities()}
          {renderRequirements()}
          {renderBenefits()}
          {renderFullDescription()}
          {renderPublishButton()}
        </DrawerContent>
      </JDDrawer>

      {/* 确认发布弹窗 */}
      <Modal
        title="确认发布"
        open={publishModalVisible}
        onOk={confirmPublish}
        onCancel={() => setPublishModalVisible(false)}
        okText="确认发布"
        cancelText="取消"
        okButtonProps={{ 
          style: { 
            background: '#667eea', 
            borderColor: '#667eea' 
          } 
        }}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <RocketOutlined style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', marginBottom: '16px' }}>
            即将发布以下岗位到招聘平台：
          </p>
          <Card style={{ textAlign: 'left', marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong>📋 岗位名称：</strong>{positionData.title}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>🏢 所属部门：</strong>{positionData.department || '待定'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>📍 工作地点：</strong>{positionData.location || '待定'}
            </div>
            <div style={{ marginBottom: '8px' }}>
              <strong>💰 薪资范围：</strong>{positionData.salary || '面议'}
            </div>
          </Card>
          <p style={{ color: '#666', fontSize: '14px' }}>
            同时将同步至招聘任务管理列表
          </p>
        </div>
      </Modal>

      {/* 发布进度弹窗 */}
      <ProgressModal
        title="正在发布中..."
        open={progressModalVisible}
        onCancel={() => setProgressModalVisible(false)}
        footer={null}
        closable={!publishing}
        maskClosable={!publishing}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <RocketOutlined style={{ fontSize: '48px', color: '#667eea', marginBottom: '16px' }} />
          <p style={{ fontSize: '16px', color: '#666' }}>
            正在执行发布流程，请稍候...
          </p>
        </div>

        <ProgressStep completed={publishProgress.step1}>
          <div className="step-icon">
            {publishProgress.step1 ? <CheckCircleIcon /> : <ClockCircleOutlined />}
          </div>
          <div className="step-content">
            <div className="step-title">同步至招聘任务管理列表</div>
            <div className="step-description">
              {publishProgress.step1 ? '✅ 任务管理同步完成' : '正在同步...'}
            </div>
          </div>
        </ProgressStep>

        <ProgressStep completed={publishProgress.step2}>
          <div className="step-icon">
            {publishProgress.step2 ? <CheckCircleIcon /> : <ClockCircleOutlined />}
          </div>
          <div className="step-content">
            <div className="step-title">发布至智联招聘平台</div>
            <div className="step-description">
              {publishProgress.step2 ? '✅ 已进入职位管理界面' : '正在进入...'}
            </div>
          </div>
        </ProgressStep>

        <ProgressStep completed={publishProgress.step3}>
          <div className="step-icon">
            {publishProgress.step3 ? <CheckCircleIcon /> : <ClockCircleOutlined />}
          </div>
          <div className="step-content">
            <div className="step-title">设置招聘条件</div>
            <div className="step-description">
              {publishProgress.step3 ? '✅ 已完成招聘条件设置' : '正在设置...'}
            </div>
          </div>
        </ProgressStep>

        <ProgressStep completed={publishProgress.step4}>
          <div className="step-icon">
            {publishProgress.step4 ? <CheckCircleIcon /> : <ClockCircleOutlined />}
          </div>
          <div className="step-content">
            <div className="step-title">发布职位</div>
            <div className="step-description">
              {publishProgress.step4 ? '✅ 发布成功！' : '正在发布...'}
            </div>
          </div>
        </ProgressStep>
      </ProgressModal>

      {/* 发布成功弹窗 */}
      <SuccessModal
        title="发布成功！"
        open={successModalVisible}
        onCancel={closeSuccessModal}
        footer={null}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <CheckCircleIcon style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
          <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            岗位已成功发布到招聘平台
          </p>
        </div>

        <SuccessInfo>
          <div className="info-item">
            <span className="info-icon">📋</span>
            <span className="info-text">岗位名称：{positionData.title}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🌐</span>
            <span className="info-text">发布平台：智联招聘</span>
          </div>
          <div className="info-item">
            <span className="info-icon">🕐</span>
            <span className="info-text">发布时间：{new Date().toLocaleString('zh-CN')}</span>
          </div>
          <div className="info-item">
            <span className="info-icon">📊</span>
            <span className="info-text">招聘任务已同步至管理列表</span>
          </div>
        </SuccessInfo>

        <div style={{ background: '#f0f9ff', border: '1px solid #91d5ff', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#1890ff' }}>
            您可以在以下位置查看：
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#595959' }}>
            <li>招聘任务管理 → 查看任务详情</li>
            <li>智联招聘后台 → 职位管理</li>
          </ul>
        </div>

        <ActionButtons>
          <Button onClick={closeSuccessModal}>
            关闭
          </Button>
          <Button 
            type="primary" 
            onClick={viewTaskManagement}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            查看任务
          </Button>
        </ActionButtons>
      </SuccessModal>
    </>
  );
};

export default JDDetailDrawer;
