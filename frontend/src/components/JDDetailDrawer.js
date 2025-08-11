import React, { useState, useEffect } from 'react';
import { Typography, Divider, Tag, Space, Card, Button, Input, Select, message, Form, Modal, Progress, Steps } from 'antd';
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
  CheckCircleFilled,
  InfoCircleOutlined,
  FileTextOutlined,
  GiftOutlined,
  FileSearchOutlined
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

const JDDetailDrawer = ({ visible, onClose, positionData }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form] = Form.useForm();
  
  // 发布相关状态
  const [publishConfirmVisible, setPublishConfirmVisible] = useState(false);
  const [publishProgressVisible, setPublishProgressVisible] = useState(false);
  const [publishSuccessVisible, setPublishSuccessVisible] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [publishStatus, setPublishStatus] = useState('');
  const [publishResult, setPublishResult] = useState(null);

  useEffect(() => {
    if (positionData) {
      setEditData({ ...positionData });
      form.setFieldsValue(positionData);
    }
  }, [positionData, form]);

  if (!positionData || !editData) return null;

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
          description += `- ${item.trim()}\n`;
        });
        description += `\n`;
      }
    }
    
    return description;
  };

  // 更新完整描述
  const updateFullDescription = (data) => {
    const newFullDescription = generateFullDescription(data);
    setEditData(prev => ({ ...prev, fullDescription: newFullDescription }));
  };

  // 显示发布确认弹窗
  const showPublishConfirm = () => {
    setPublishConfirmVisible(true);
  };

  // 处理发布确认
  const handlePublishConfirm = async () => {
    setPublishConfirmVisible(false);
    setPublishProgressVisible(true);
    setPublishProgress(0);
    setCurrentStep(0);
    setPublishStatus('正在同步至招聘任务管理列表...');

    try {
      // 模拟发布流程
      for (let i = 0; i <= 4; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setPublishProgress((i + 1) * 20);
        setCurrentStep(i);
        
        const statusMessages = [
          '正在同步至招聘任务管理列表...',
          '正在进入智联招聘职位管理界面...',
          '正在填写职位详细信息...',
          '正在设置招聘筛选条件...',
          '正在发布职位到智联招聘平台...'
        ];
        
        setPublishStatus(statusMessages[i]);
      }
      
      // 模拟发布结果
      const result = {
        positionName: editData.title,
        platform: '智联招聘',
        publishTime: new Date().toLocaleString(),
        taskId: 'TASK-' + Math.random().toString(36).substr(2, 9).toUpperCase()
      };
      
      setPublishResult(result);
      setPublishProgressVisible(false);
      setPublishSuccessVisible(true);
    } catch (error) {
      console.error('发布失败:', error);
      message.error('发布失败，请重试');
      setPublishProgressVisible(false);
    }
  };

  // 查看任务
  const handleViewTask = () => {
    setPublishSuccessVisible(false);
    // 这里可以跳转到任务详情页面
    console.log('查看任务:', publishResult);
  };

  // 渲染基本信息项
  const renderInfoItem = (label, value, field) => (
    <InfoItem>
      <InfoLabel>{label}</InfoLabel>
      {isEditing ? (
        <Form.Item name={field} noStyle>
          <Input placeholder={`请输入${label}`} />
        </Form.Item>
      ) : (
        <InfoValue>{value || '待定'}</InfoValue>
      )}
    </InfoItem>
  );

  // 渲染技能标签
  const renderSkills = () => {
    if (isEditing) {
      return (
        <div>
          {editData.skills?.map((skill, index) => (
            <div key={index} style={{ display: 'flex', marginBottom: '8px' }}>
              <Input
                value={skill}
                onChange={(e) => updateSkill(index, e.target.value)}
                placeholder="请输入技能要求"
                style={{ flex: 1 }}
              />
              <Button
                icon={<DeleteOutlined />}
                onClick={() => removeSkill(index)}
                style={{ marginLeft: '8px' }}
              />
            </div>
          ))}
          <Button
            icon={<PlusOutlined />}
            onClick={addSkill}
            style={{ marginTop: '8px' }}
          >
            添加技能要求
          </Button>
        </div>
      );
    } else {
      return editData.skills?.filter(skill => skill && skill.trim()).map((skill, index) => (
        <SkillTag key={index} color="blue">
          {skill}
        </SkillTag>
      )) || <InfoValue>暂无技能要求</InfoValue>;
    }
  };

  // 渲染职责列表
  const renderResponsibilities = () => {
    const items = editData.responsibilities || [];
    
    if (isEditing) {
      return (
        <div>
          {items.map((item, index) => (
            <EditableItem key={index}>
              <Input.TextArea
                value={item}
                onChange={(e) => updateListItem('responsibilities', index, e.target.value)}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="请输入岗位职责"
                style={{ flex: 1, marginRight: '8px' }}
              />
              <div className="edit-controls">
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeListItem('responsibilities', index)}
                  size="small"
                  type="text"
                />
              </div>
            </EditableItem>
          ))}
          <AddItemButton
            icon={<PlusOutlined />}
            onClick={() => addListItem('responsibilities')}
          >
            添加职责
          </AddItemButton>
        </div>
      );
    } else {
      return items.filter(item => item && item.trim()).map((item, index) => (
        <ResponsibilityItem key={index}>
          <div style={{ flex: 1 }}>
            {item}
          </div>
        </ResponsibilityItem>
      )) || <InfoValue>暂无岗位职责</InfoValue>;
    }
  };

  // 渲染要求列表
  const renderRequirements = () => {
    const items = editData.requirements || [];
    
    if (isEditing) {
      return (
        <div>
          {items.map((item, index) => (
            <EditableItem key={index} bgColor="#f8f9fa" borderColor="#52c41a">
              <Input.TextArea
                value={item}
                onChange={(e) => updateListItem('requirements', index, e.target.value)}
                autoSize={{ minRows: 2, maxRows: 6 }}
                placeholder="请输入任职要求"
                style={{ flex: 1, marginRight: '8px' }}
              />
              <div className="edit-controls">
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeListItem('requirements', index)}
                  size="small"
                  type="text"
                />
              </div>
            </EditableItem>
          ))}
          <AddItemButton
            icon={<PlusOutlined />}
            onClick={() => addListItem('requirements')}
          >
            添加要求
          </AddItemButton>
        </div>
      );
    } else {
      return items.filter(item => item && item.trim()).map((item, index) => (
        <RequirementItem key={index}>
          <div style={{ flex: 1 }}>
            {item}
          </div>
        </RequirementItem>
      )) || <InfoValue>暂无任职要求</InfoValue>;
    }
  };

  // 渲染福利列表
  const renderBenefits = () => {
    const items = editData.benefits || [];
    
    if (isEditing) {
      return (
        <div>
          {items.map((item, index) => (
            <EditableItem key={index} bgColor="#fff7e6" borderColor="#fa8c16">
              <Input.TextArea
                value={item}
                onChange={(e) => updateListItem('benefits', index, e.target.value)}
                autoSize={{ minRows: 1, maxRows: 3 }}
                placeholder="请输入福利待遇"
                style={{ flex: 1, marginRight: '8px' }}
              />
              <div className="edit-controls">
                <Button
                  icon={<DeleteOutlined />}
                  onClick={() => removeListItem('benefits', index)}
                  size="small"
                  type="text"
                />
              </div>
            </EditableItem>
          ))}
          <AddItemButton
            icon={<PlusOutlined />}
            onClick={() => addListItem('benefits')}
          >
            添加福利
          </AddItemButton>
        </div>
      );
    } else {
      return items.filter(item => item && item.trim()).map((item, index) => (
        <BenefitItem key={index}>
          <div style={{ flex: 1 }}>
            {item}
          </div>
        </BenefitItem>
      )) || <InfoValue>暂无福利待遇</InfoValue>;
    }
  };

  // 渲染完整描述
  const renderFullDescription = () => {
    if (isEditing) {
      return (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '16px', 
          borderRadius: '6px',
          border: '1px dashed #d9d9d9'
        }}>
          <div style={{ 
            color: '#666', 
            fontSize: '14px', 
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <InfoCircleOutlined />
            完整描述将根据上方信息自动生成
          </div>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontSize: '14px',
            color: '#262626',
            margin: 0
          }}>
            {editData.fullDescription}
          </pre>
        </div>
      );
    } else {
      return (
        <Card size="small" style={{ background: '#f8f9fa' }}>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            fontSize: '14px',
            color: '#262626',
            margin: 0
          }}>
            {editData.fullDescription}
          </pre>
        </Card>
      );
    }
  };

  return (
    <JDDrawer visible={visible}>
      <DrawerHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileTextOutlined />
          <span style={{ fontSize: '18px', fontWeight: '600' }}>岗位详情</span>
        </div>
        <div>
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                icon={<SaveOutlined />}
                style={{ 
                  marginRight: '8px',
                  background: '#52c41a',
                  borderColor: '#52c41a',
                  color: 'white'
                }}
              >
                保存
              </Button>
              <Button
                onClick={handleCancel}
                style={{ 
                  marginRight: '8px',
                  color: 'white',
                  borderColor: 'white'
                }}
              >
                取消
              </Button>
            </>
          ) : (
            <EditButton
              onClick={() => setIsEditing(true)}
              icon={<EditOutlined />}
            >
              编辑
            </EditButton>
          )}
          <CloseButton
            onClick={onClose}
            icon={<CloseOutlined />}
          />
        </div>
      </DrawerHeader>
      
      <DrawerContent>
        <JobTitle level={3}>
          <UserOutlined />
          {editData.title || '岗位名称'}
        </JobTitle>
        
        <InfoCard>
          <Form form={form} layout="vertical">
            <SectionTitle level={5}>
              <InfoCircleOutlined />
              基本信息
            </SectionTitle>
            {renderInfoItem('所属部门', editData.department, 'department')}
            {renderInfoItem('工作地点', editData.location, 'location')}
            {renderInfoItem('薪资范围', editData.salary, 'salary')}
            
            <SectionTitle level={5}>
              <TrophyOutlined />
              任职要求
            </SectionTitle>
            <InfoItem>
              <InfoLabel>工作经验</InfoLabel>
              {isEditing ? (
                <Form.Item name="experience" noStyle>
                  <Select style={{ width: '120px' }}>
                    <Select.Option value="不限">不限</Select.Option>
                    <Select.Option value="1年以下">1年以下</Select.Option>
                    <Select.Option value="1-3年">1-3年</Select.Option>
                    <Select.Option value="3-5年">3-5年</Select.Option>
                    <Select.Option value="5-10年">5-10年</Select.Option>
                    <Select.Option value="10年以上">10年以上</Select.Option>
                  </Select>
                </Form.Item>
              ) : (
                <InfoValue>{editData.experience || '不限'}</InfoValue>
              )}
            </InfoItem>
            
            <InfoItem>
              <InfoLabel>学历要求</InfoLabel>
              {isEditing ? (
                <Form.Item name="education" noStyle>
                  <Select style={{ width: '120px' }}>
                    <Select.Option value="不限">不限</Select.Option>
                    <Select.Option value="高中">高中</Select.Option>
                    <Select.Option value="大专">大专</Select.Option>
                    <Select.Option value="本科">本科</Select.Option>
                    <Select.Option value="硕士">硕士</Select.Option>
                    <Select.Option value="博士">博士</Select.Option>
                  </Select>
                </Form.Item>
              ) : (
                <InfoValue>{editData.education || '不限'}</InfoValue>
              )}
            </InfoItem>
            
            <InfoItem>
              <InfoLabel>技能要求</InfoLabel>
              <div style={{ flex: 1 }}>
                {renderSkills()}
              </div>
            </InfoItem>
          </Form>
        </InfoCard>
        
        <SectionTitle level={5}>
          <FileTextOutlined />
          岗位职责
        </SectionTitle>
        {renderResponsibilities()}
        
        <SectionTitle level={5}>
          <CheckCircleOutlined />
          任职要求
        </SectionTitle>
        {renderRequirements()}
        
        <SectionTitle level={5}>
          <GiftOutlined />
          福利待遇
        </SectionTitle>
        {renderBenefits()}
        
        <SectionTitle level={5}>
          <FileSearchOutlined />
          完整描述
        </SectionTitle>
        {renderFullDescription()}
        
        <div style={{ 
          marginTop: '24px', 
          padding: '16px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <Button
            type="primary"
            size="large"
            icon={<RocketOutlined />}
            onClick={showPublishConfirm}
            style={{
              width: '100%',
              height: '48px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600'
            }}
          >
            🚀 一键发布到招聘平台
          </Button>
          <div style={{ 
            marginTop: '8px', 
            textAlign: 'center', 
            color: '#666', 
            fontSize: '12px' 
          }}>
            同步至任务管理列表 · 发布至智联招聘平台
          </div>
        </div>
      </DrawerContent>
      
      {/* 发布确认弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RocketOutlined style={{ color: '#1890ff' }} />
            确认发布
          </div>
        }
        open={publishConfirmVisible}
        onOk={handlePublishConfirm}
        onCancel={() => setPublishConfirmVisible(false)}
        okText="确认发布"
        cancelText="取消"
        okButtonProps={{
          style: {
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <p style={{ marginBottom: '16px', fontSize: '14px' }}>
            即将发布以下岗位到招聘平台：
          </p>
          <Card size="small" style={{ background: '#f8f9fa' }}>
            <div style={{ lineHeight: '2' }}>
              <div><strong>📋 岗位名称：</strong>{editData?.title}</div>
              <div><strong>🏢 所属部门：</strong>{editData?.department || '待定'}</div>
              <div><strong>📍 工作地点：</strong>{editData?.location || '待定'}</div>
              <div><strong>💰 薪资范围：</strong>{editData?.salary || '面议'}</div>
              <div><strong>⏰ 工作经验：</strong>{editData?.experience}年</div>
              <div><strong>🎓 学历要求：</strong>{editData?.education}</div>
            </div>
          </Card>
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: '#e6f7ff', 
            borderRadius: '6px',
            border: '1px solid #91d5ff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircleOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontSize: '14px', color: '#1890ff' }}>
                同时将同步至招聘任务管理列表
              </span>
            </div>
          </div>
        </div>
      </Modal>

      {/* 发布进度弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GlobalOutlined style={{ color: '#1890ff' }} />
            正在发布中...
          </div>
        }
        open={publishProgressVisible}
        footer={null}
        closable={false}
        maskClosable={false}
      >
        <div style={{ padding: '24px 0' }}>
          <Progress 
            percent={publishProgress} 
            status={publishProgress === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#667eea',
              '100%': '#764ba2',
            }}
          />
          
          <div style={{ marginTop: '24px' }}>
            <Steps
              current={currentStep}
              direction="vertical"
              size="small"
              items={[
                { title: '同步任务管理', description: '正在同步至招聘任务管理列表...' },
                { title: '进入职位管理', description: '正在进入智联招聘职位管理界面...' },
                { title: '填写职位信息', description: '正在填写职位详细信息...' },
                { title: '设置招聘条件', description: '正在设置招聘筛选条件...' },
                { title: '发布职位', description: '正在发布职位到智联招聘平台...' }
              ]}
            />
          </div>
          
          <div style={{ 
            marginTop: '16px', 
            textAlign: 'center', 
            color: '#666' 
          }}>
            {publishStatus}
          </div>
        </div>
      </Modal>

      {/* 发布成功弹窗 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircleFilled style={{ color: '#52c41a' }} />
            发布成功！
          </div>
        }
        open={publishSuccessVisible}
        onOk={handleViewTask}
        onCancel={() => setPublishSuccessVisible(false)}
        okText="查看任务"
        cancelText="关闭"
        okButtonProps={{
          style: {
            background: '#52c41a',
            border: 'none'
          }
        }}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ 
            textAlign: 'center', 
            marginBottom: '24px',
            padding: '24px',
            background: '#f6ffed',
            borderRadius: '8px',
            border: '1px solid #b7eb8f'
          }}>
            <CheckCircleFilled style={{ fontSize: '48px', color: '#52c41a', marginBottom: '16px' }} />
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#52c41a' }}>
              岗位已成功发布到招聘平台
            </div>
          </div>
          
          <Card size="small" style={{ background: '#f8f9fa' }}>
            <div style={{ lineHeight: '2' }}>
              <div><strong>📋 岗位名称：</strong>{publishResult?.positionName}</div>
              <div><strong>🌐 发布平台：</strong>{publishResult?.platform}</div>
              <div><strong>🕐 发布时间：</strong>{publishResult?.publishTime}</div>
              <div><strong>📊 任务ID：</strong>{publishResult?.taskId}</div>
            </div>
          </Card>
          
          <div style={{ 
            marginTop: '16px', 
            padding: '16px', 
            background: '#f0f9ff', 
            borderRadius: '6px',
            border: '1px solid #91d5ff'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>
              📊 招聘任务已同步至管理列表
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              您可以在以下位置查看：
            </div>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
              <li>招聘任务管理 → 查看任务详情</li>
              <li>智联招聘后台 → 职位管理</li>
            </ul>
          </div>
        </div>
      </Modal>
    </JDDrawer>
  );
};

export default JDDetailDrawer;