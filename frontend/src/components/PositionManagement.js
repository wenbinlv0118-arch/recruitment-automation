import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Button, Form, Input, Select, message, Table, Popconfirm, Space, Modal, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { API_ENDPOINTS } from '../config/api';
import { apiGet, apiPost, apiPut, apiDelete } from '../utils/apiClient';
import ModalBasePattern from './ModalBasePattern';

const { Option } = Select;
const { TextArea } = Input;

const PositionManagementContainer = styled.div`
  .position-table {
    margin-bottom: 16px;
    
    .ant-table-thead > tr > th {
      background-color: #fafafa;
      font-weight: 600;
    }
  }
  
  .actions-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
  }
  
  .position-description {
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .skill-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-width: 200px;
  }
`;

const PositionManagement = ({ visible, onClose, companyInfo }) => {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [addForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [filteredPositions, setFilteredPositions] = useState([]);
  const [currentFilters, setCurrentFilters] = useState({});

  // 获取岗位列表
  const fetchPositions = async () => {
    setLoading(true);
    try {
      const result = await apiGet(API_ENDPOINTS.POSITIONS.LIST);
      
      if (result.success) {
        setPositions(result.data || []);
        // 如果有筛选条件，应用筛选
        if (companyInfo && companyInfo.filters) {
          applyFilters(result.data || [], companyInfo.filters);
        } else {
          setFilteredPositions(result.data || []);
        }
      } else {
        throw new Error(result.error || '获取岗位列表失败');
      }
    } catch (error) {
      console.error('获取岗位列表失败:', error);
      message.error(`获取岗位列表失败: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 应用筛选条件
  const applyFilters = (allPositions, filters) => {
    let filtered = [...allPositions];
    
    if (filters.industry && filters.industry.length > 0) {
      filtered = filtered.filter(position => 
        position.department && filters.industry.some(industry => 
          position.department.toLowerCase().includes(industry.toLowerCase())
        )
      );
    }
    
    if (filters.location && filters.location.length > 0) {
      filtered = filtered.filter(position => 
        position.location && filters.location.some(location => 
          position.location.toLowerCase().includes(location.toLowerCase())
        )
      );
    }
    
    if (filters.companySize && filters.companySize.length > 0) {
      // 公司规模筛选逻辑可以根据实际需求调整
      console.log('应用公司规模筛选:', filters.companySize);
    }
    
    if (filters.salaryRange && filters.salaryRange.length > 0) {
      filtered = filtered.filter(position => 
        position.salary && filters.salaryRange.some(range => 
          position.salary.toLowerCase().includes(range.toLowerCase())
        )
      );
    }
    
    if (filters.experience && filters.experience.length > 0) {
      filtered = filtered.filter(position => 
        position.experience !== undefined && filters.experience.some(exp => {
          const expNum = parseInt(exp);
          return !isNaN(expNum) && position.experience >= expNum;
        })
      );
    }
    
    setFilteredPositions(filtered);
    setCurrentFilters(filters);
  };

  // 组件挂载时获取数据
  useEffect(() => {
    if (visible) {
      fetchPositions();
    }
  }, [visible]);

  // 当companyInfo变化时，重新应用筛选条件
  useEffect(() => {
    if (companyInfo && companyInfo.filters && positions.length > 0) {
      applyFilters(positions, companyInfo.filters);
    }
  }, [companyInfo, positions]);

  // 添加岗位
  const handleAddPosition = async (values) => {
    try {
      // 构建岗位数据
      const positionData = {
        name: values.name,
        description: values.description || '',
        department: values.department || '',
        location: values.location || '',
        salary: values.salary || '',
        education: values.education || '',
        experience: parseInt(values.experience) || 0,
        skills: values.skills || [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await apiPost(API_ENDPOINTS.POSITIONS.LIST, positionData);
      if (result.success) {
        message.success('岗位添加成功');
        setIsAddModalVisible(false);
        addForm.resetFields();
        fetchPositions(); // 重新获取岗位列表
      } else {
        throw new Error(result.error || '添加岗位失败');
      }
    } catch (error) {
      console.error('添加岗位失败:', error);
      message.error(`添加岗位失败: ${error.message}`);
    }
  };

  // 编辑岗位
  const handleEditPosition = async (values) => {
    try {
      const positionData = {
        ...values,
        experience: parseInt(values.experience) || 0,
        updatedAt: new Date().toISOString()
      };

      const result = await apiPut(`${API_ENDPOINTS.POSITIONS}/${editingPosition.id}`, positionData);
      if (result.success) {
        message.success('岗位更新成功');
        setIsEditModalVisible(false);
        setEditingPosition(null);
        editForm.resetFields();
        fetchPositions(); // 重新获取岗位列表
      } else {
        throw new Error(result.error || '更新岗位失败');
      }
    } catch (error) {
      console.error('更新岗位失败:', error);
      message.error(`更新岗位失败: ${error.message}`);
    }
  };

  // 删除岗位
  const handleDeletePosition = async (positionId) => {
    try {
      const result = await apiDelete(`${API_ENDPOINTS.POSITIONS}/${positionId}`);
      if (result.success) {
        message.success('岗位删除成功');
        fetchPositions(); // 重新获取岗位列表
      } else {
        throw new Error(result.error || '删除岗位失败');
      }
    } catch (error) {
      console.error('删除岗位失败:', error);
      message.error(`删除岗位失败: ${error.message}`);
    }
  };

  // 打开编辑弹窗
  const openEditModal = (position) => {
    setEditingPosition(position);
    editForm.setFieldsValue({
      name: position.name,
      description: position.description,
      department: position.department,
      location: position.location,
      salary: position.salary,
      education: position.education,
      experience: position.experience,
      skills: position.skills
    });
    setIsEditModalVisible(true);
  };

  // 表格列定义
  const columns = [
    {
      title: '岗位名称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text) => <strong>{text}</strong>
    },
    {
      title: '部门',
      dataIndex: 'department',
      key: 'department',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '工作地点',
      dataIndex: 'location',
      key: 'location',
      width: 100,
      render: (text) => text || '-'
    },
    {
      title: '薪资范围',
      dataIndex: 'salary',
      key: 'salary',
      width: 120,
      render: (text) => text || '面议'
    },
    {
      title: '学历要求',
      dataIndex: 'education',
      key: 'education',
      width: 80,
      render: (text) => text || '-'
    },
    {
      title: '经验要求',
      dataIndex: 'experience',
      key: 'experience',
      width: 80,
      render: (text) => text ? `${text}年` : '-'
    },
    {
      title: '技能要求',
      dataIndex: 'skills',
      key: 'skills',
      width: 200,
      render: (skills) => (
        <div className="skill-tags">
          {skills && skills.length > 0 ? (
            <>
              {skills.slice(0, 3).map((skill, index) => (
                <Tag key={index} size="small" color="blue">
                  {skill}
                </Tag>
              ))}
              {skills.length > 3 && (
                <Tag size="small" color="default">
                  +{skills.length - 3}
                </Tag>
              )}
            </>
          ) : (
            <span style={{ color: '#999' }}>-</span>
          )}
        </div>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 200,
      render: (text) => (
        <div className="position-description" title={text}>
          {text || '-'}
        </div>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 100,
      render: (text) => text ? new Date(text).toLocaleDateString() : '-'
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确认删除"
            description="删除后无法恢复，确定要删除这个岗位吗？"
            onConfirm={() => handleDeletePosition(record.id)}
            okText="删除"
            cancelText="取消"
            okType="danger"
          >
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <ModalBasePattern
      visible={visible}
      onClose={onClose}
      title={companyInfo ? `${companyInfo.company?.name || companyInfo.company?.companyName || '公司'} 职位搜索` : "岗位管理"}
      dataAttribute="position-management-modal"
      width={1200}
    >
      <PositionManagementContainer>
        {/* 显示筛选条件摘要 */}
        {companyInfo && companyInfo.filters && Object.keys(companyInfo.filters).length > 0 && (
          <div style={{ 
            background: '#e6f7ff', 
            padding: '16px', 
            borderRadius: '8px', 
            marginBottom: '20px',
            border: '1px solid #91d5ff'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              marginBottom: '12px',
              color: '#1890ff'
            }}>
              🎯 当前筛选条件
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {Object.entries(companyInfo.filters)
                .filter(([key, value]) => value && value.length > 0)
                .map(([key, value]) => {
                  const labels = {
                    'industry': '行业',
                    'location': '地区',
                    'companySize': '公司规模',
                    'salaryRange': '薪资范围',
                    'experience': '经验要求'
                  };
                  const label = labels[key] || key;
                  const displayValue = Array.isArray(value) ? value.join('、') : value;
                  
                  return (
                    <Tag key={key} color="blue" style={{ 
                      fontSize: '13px',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>
                      <strong>{label}</strong>: {displayValue}
                    </Tag>
                  );
                })}
            </div>
          </div>
        )}

        <div className="actions-header">
          <div className="title">
            {companyInfo ? '筛选结果' : '岗位列表'}
            {companyInfo && (
              <span style={{ 
                fontSize: '14px', 
                fontWeight: 'normal', 
                color: '#666',
                marginLeft: '12px'
              }}>
                (共 {filteredPositions.length} 个匹配岗位)
              </span>
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsAddModalVisible(true)}
          >
            添加岗位
          </Button>
        </div>

        <Table
          className="position-table"
          columns={columns}
          dataSource={companyInfo && companyInfo.filters ? filteredPositions : positions}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个岗位`
          }}
          scroll={{ x: 1000 }}
        />

        {/* 添加岗位弹窗 */}
        <Modal
          title="添加岗位"
          open={isAddModalVisible}
          onCancel={() => {
            setIsAddModalVisible(false);
            addForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={addForm}
            layout="vertical"
            onFinish={handleAddPosition}
          >
            <Form.Item
              name="name"
              label="岗位名称"
              rules={[{ required: true, message: '请输入岗位名称' }]}
            >
              <Input placeholder="请输入岗位名称" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="岗位描述"
            >
              <TextArea placeholder="请输入岗位描述" rows={3} />
            </Form.Item>

            <Form.Item
              name="department"
              label="所属部门"
            >
              <Input placeholder="请输入所属部门" />
            </Form.Item>

            <Form.Item
              name="location"
              label="工作地点"
            >
              <Input placeholder="请输入工作地点" />
            </Form.Item>

            <Form.Item
              name="salary"
              label="薪资范围"
            >
              <Input placeholder="如：8K-15K" />
            </Form.Item>
            
            <Form.Item
              name="education"
              label="学历要求"
            >
              <Select placeholder="选择学历要求" allowClear>
                <Option value="高中">高中</Option>
                <Option value="大专">大专</Option>
                <Option value="本科">本科</Option>
                <Option value="硕士">硕士</Option>
                <Option value="博士">博士</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="experience"
              label="工作经验要求（年）"
            >
              <Input type="number" placeholder="请输入工作经验要求" min={0} />
            </Form.Item>
            
            <Form.Item
              name="skills"
              label="技能要求"
            >
              <Select 
                mode="tags" 
                placeholder="请输入技能要求，按回车添加"
                tokenSeparators={[',']}
              />
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  添加岗位
                </Button>
                <Button onClick={() => {
                  setIsAddModalVisible(false);
                  addForm.resetFields();
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* 编辑岗位弹窗 */}
        <Modal
          title="编辑岗位"
          open={isEditModalVisible}
          onCancel={() => {
            setIsEditModalVisible(false);
            setEditingPosition(null);
            editForm.resetFields();
          }}
          footer={null}
          width={600}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEditPosition}
          >
            <Form.Item
              name="name"
              label="岗位名称"
              rules={[{ required: true, message: '请输入岗位名称' }]}
            >
              <Input placeholder="请输入岗位名称" />
            </Form.Item>
            
            <Form.Item
              name="description"
              label="岗位描述"
            >
              <TextArea placeholder="请输入岗位描述" rows={3} />
            </Form.Item>

            <Form.Item
              name="department"
              label="所属部门"
            >
              <Input placeholder="请输入所属部门" />
            </Form.Item>

            <Form.Item
              name="location"
              label="工作地点"
            >
              <Input placeholder="请输入工作地点" />
            </Form.Item>

            <Form.Item
              name="salary"
              label="薪资范围"
            >
              <Input placeholder="如：8K-15K" />
            </Form.Item>
            
            <Form.Item
              name="education"
              label="学历要求"
            >
              <Select placeholder="选择学历要求" allowClear>
                <Option value="高中">高中</Option>
                <Option value="大专">大专</Option>
                <Option value="本科">本科</Option>
                <Option value="硕士">硕士</Option>
                <Option value="博士">博士</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="experience"
              label="工作经验要求（年）"
            >
              <Input type="number" placeholder="请输入工作经验要求" min={0} />
            </Form.Item>
            
            <Form.Item
              name="skills"
              label="技能要求"
            >
              <Select 
                mode="tags" 
                placeholder="请输入技能要求，按回车添加"
                tokenSeparators={[',']}
              />
            </Form.Item>
            
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit">
                  更新岗位
                </Button>
                <Button onClick={() => {
                  setIsEditModalVisible(false);
                  setEditingPosition(null);
                  editForm.resetFields();
                }}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </PositionManagementContainer>
    </ModalBasePattern>
  );
};

export default PositionManagement;