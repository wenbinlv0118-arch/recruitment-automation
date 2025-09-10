import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  Input,
  Select,
  Space,
  Tag,
  Modal,
  message,
  Popconfirm,
  Tooltip,
  Badge,
  Progress,
  Avatar,
  Typography,
  Divider,
  Checkbox
} from 'antd';
import { API_ENDPOINTS } from '../config/api';
import { apiGet, apiDelete } from '../utils/apiClient';
import {
  PlusOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  UserOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import TaskForm from './TaskForm';
import TaskDetail from './TaskDetail';
import './TaskManagement.css';

const { Text, Title } = Typography;
const { Option } = Select;

const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('全部');
  const [priorityFilter, setPriorityFilter] = useState('全部');
  const [platformFilter, setPlatformFilter] = useState('全部');
  const [recruitmentStatusFilter, setRecruitmentStatusFilter] = useState('全部'); // 智能寻聘状态筛选
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [taskFormVisible, setTaskFormVisible] = useState(false);
  const [taskDetailVisible, setTaskDetailVisible] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });

  // 获取任务列表
  const fetchTasks = async (params = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: params.page || pagination.current,
        limit: params.pageSize || pagination.pageSize,
        search: searchText,
        status: statusFilter,
        priority: priorityFilter,
        platform: platformFilter,
        recruitmentStatus: recruitmentStatusFilter, // 添加智能寻聘状态筛选
        ...params
      });

      const response = await fetch(`/api/tasks?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setTasks(result.data);
        setPagination(prev => ({
          ...prev,
          current: result.pagination.current,
          total: result.pagination.total
        }));
      } else {
        message.error(result.message || '获取任务列表失败');
      }
    } catch (error) {
      console.error('获取任务列表失败:', error);
      message.error('获取任务列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取任务统计
  const fetchStats = async () => {
    try {
      const result = await apiGet(API_ENDPOINTS.TASKS.STATS);

      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('获取任务统计失败:', error);
    }
  };

  // 删除任务
  const handleDeleteTask = async (id) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();

      if (result.success) {
        message.success('任务删除成功');
        fetchTasks();
        fetchStats();
      } else {
        message.error(result.message || '删除任务失败');
      }
    } catch (error) {
      console.error('删除任务失败:', error);
      message.error('删除任务失败');
    }
  };

  // 批量删除任务
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的任务');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个任务吗？`,
      onOk: async () => {
          try {
            const result = await apiDelete(API_ENDPOINTS.TASKS.LIST, {
              body: JSON.stringify({ ids: selectedRowKeys }),
              headers: {
                'Content-Type': 'application/json'
              }
            });

          if (result.success) {
            message.success(result.message);
            setSelectedRowKeys([]);
            fetchTasks();
            fetchStats();
          } else {
            message.error(result.message || '批量删除失败');
          }
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error('批量删除失败');
        }
      }
    });
  };

  // 查看任务详情
  const handleViewTask = (task) => {
    setCurrentTask(task);
    setTaskDetailVisible(true);
  };

  // 编辑任务
  const handleEditTask = (task) => {
    setCurrentTask(task);
    setTaskFormVisible(true);
  };

  // 处理智能寻聘状态切换
  const handleSmartRecruitmentToggle = async (taskId, enabled) => {
    console.log('开始切换智能寻聘状态:', { taskId, enabled });
    
    try {
      const requestBody = {
        smartRecruitment: enabled,
        recruitmentStatus: enabled ? '进行中' : '未开始'
      };
      
      console.log('请求体:', requestBody);
      console.log('请求URL:', `/api/tasks/${taskId}`);
      
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('响应状态:', response.status);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));

      const result = await response.json();
      console.log('响应内容:', result);
      
      if (result.success) {
        console.log('切换成功，开始刷新数据');
        message.success(enabled ? '已开启智能寻聘' : '已关闭智能寻聘');
        await fetchTasks(); // 刷新任务列表
        await fetchStats(); // 刷新统计数据
        console.log('数据刷新完成');
      } else {
        console.error('切换失败:', result.message);
        message.error(result.message || '操作失败');
      }
    } catch (error) {
      console.error('切换智能寻聘状态失败:', error);
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      message.error('操作失败，请重试');
    }
  };

  // 创建新任务
  const handleCreateTask = () => {
    setCurrentTask(null);
    setTaskFormVisible(true);
  };

  // 任务表单提交成功
  const handleTaskFormSuccess = () => {
    setTaskFormVisible(false);
    fetchTasks();
    fetchStats();
  };

  // 搜索和筛选
  const handleSearch = () => {
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTasks({ page: 1 });
  };

  const handleReset = () => {
    setSearchText('');
    setStatusFilter('全部');
    setPriorityFilter('全部');
    setPlatformFilter('全部');
    setPagination(prev => ({ ...prev, current: 1 }));
    fetchTasks({ page: 1 });
  };

  // 表格分页变化
  const handleTableChange = (paginationInfo) => {
    setPagination(prev => ({ ...prev, current: paginationInfo.current }));
    fetchTasks({ page: paginationInfo.current });
  };

  // 获取状态图标和颜色
  const getStatusConfig = (status) => {
    const configs = {
      '进行中': { icon: <ClockCircleOutlined />, color: 'processing', text: '进行中' },
      '已完成': { icon: <CheckCircleOutlined />, color: 'success', text: '已完成' },
      '已暂停': { icon: <PauseCircleOutlined />, color: 'warning', text: '已暂停' },
      '已取消': { icon: <CloseCircleOutlined />, color: 'default', text: '已取消' }
    };
    return configs[status] || configs['进行中'];
  };

  // 获取优先级配置
  const getPriorityConfig = (priority) => {
    const configs = {
      '高': { color: 'red', text: '高优先级' },
      '中': { color: 'orange', text: '中优先级' },
      '低': { color: 'green', text: '低优先级' }
    };
    return configs[priority] || configs['中'];
  };

  // 获取招聘平台配置
  const getPlatformConfig = (platform) => {
    const configs = {
      '前程无忧': { color: 'green', icon: '🟢' },
      'BOSS直聘': { color: 'orange', icon: '🟠' },
      '拉勾网': { color: 'purple', icon: '🟣' },
      '猎聘网': { color: 'red', icon: '🔴' },
      '脉脉': { color: 'cyan', icon: '🔷' },
      'LinkedIn': { color: 'geekblue', icon: '🔶' }
    };
    return configs[platform] || { color: 'default', icon: '🌍' };
  };

  // 获取智能寻聘状态配置
  const getRecruitmentStatusConfig = (status) => {
    const configs = {
      '未开始': { color: 'default', text: '未开始', icon: '⏸️' },
      '进行中': { color: 'processing', text: '进行中', icon: '🔄' },
      '已完成': { color: 'success', text: '已完成', icon: '✅' },
      '已暂停': { color: 'warning', text: '已暂停', icon: '⏸️' }
    };
    return configs[status] || configs['未开始'];
  };

  // 表格列定义
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      render: (text, record) => (
        <div>
          <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.position}
          </Text>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        const config = getStatusConfig(status);
        return (
          <Badge
            status={config.color}
            text={config.text}
            icon={config.icon}
          />
        );
      }
    },
    {
      title: '智能寻聘',
      dataIndex: 'smartRecruitment',
      key: 'smartRecruitment',
      width: 120,
      render: (enabled, record) => {
        const statusConfig = getRecruitmentStatusConfig(record.recruitmentStatus || '未开始');
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Checkbox
              checked={enabled}
              onChange={(e) => handleSmartRecruitmentToggle(record.id, e.target.checked)}
              style={{ marginRight: 8 }}
            />
            <Tag color={statusConfig.color} icon={statusConfig.icon}>
              {statusConfig.text}
            </Tag>
          </div>
        );
      }
    },
    {
      title: '招聘平台',
      dataIndex: 'platforms',
      key: 'platforms',
      width: 150,
      render: (platforms) => (
        <div>
          {platforms && platforms.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {platforms.slice(0, 3).map((platform, index) => {
                const config = getPlatformConfig(platform);
                return (
                  <Tooltip key={index} title={platform}>
                    <Tag color={config.color} icon={<GlobalOutlined />}>
                      {config.icon} {platform}
                    </Tag>
                  </Tooltip>
                );
              })}
              {platforms.length > 3 && (
                <Tooltip title={`还有 ${platforms.length - 3} 个平台`}>
                  <Tag color="default">+{platforms.length - 3}</Tag>
                </Tooltip>
              )}
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              未发布
            </Text>
          )}
        </div>
      )
    },
    {
      title: '候选人',
      dataIndex: 'candidates',
      key: 'candidates',
      width: 120,
      render: (candidates) => (
        <div>
          <Avatar.Group max={{ count: 3 }} size="small">
                    {candidates?.map((candidate, index) => (
                      <Tooltip key={index} title={candidate.name}>
                        <Avatar icon={<UserOutlined />} />
                      </Tooltip>
                    ))}
                  </Avatar.Group>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            {candidates?.length || 0} 人
          </div>
        </div>
      )
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress) => (
        <Progress
          percent={progress}
          size="small"
          status={progress === 100 ? 'success' : 'active'}
        />
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date) => (
        <div>
          <CalendarOutlined style={{ marginRight: 4 }} />
          {new Date(date).toLocaleDateString()}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewTask(record)}
            />
          </Tooltip>
          <Tooltip title="编辑任务">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditTask(record)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个任务吗？"
            onConfirm={() => handleDeleteTask(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除任务">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  useEffect(() => {
    fetchTasks();
    fetchStats();
  }, []);

  return (
    <div className="task-management">
      <div className="task-header">
        <Title level={2}>招聘任务管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateTask}
        >
          创建任务
        </Button>
      </div>

      {/* 统计面板 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats.total || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="进行中"
              value={stats.inProgress || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed || 0}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="智能寻聘中"
              value={stats.recruitmentInProgress || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 搜索和筛选 */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Input
              placeholder="搜索任务名称、职位、候选人..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onPressEnter={handleSearch}
              prefix={<SearchOutlined />}
            />
          </Col>
          <Col span={4}>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="全部">全部状态</Option>
              <Option value="进行中">进行中</Option>
              <Option value="已完成">已完成</Option>
              <Option value="已暂停">已暂停</Option>
              <Option value="已取消">已取消</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              value={recruitmentStatusFilter}
              onChange={setRecruitmentStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="全部">全部寻聘状态</Option>
              <Option value="未开始">未开始</Option>
              <Option value="进行中">进行中</Option>
              <Option value="已完成">已完成</Option>
              <Option value="已暂停">已暂停</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Select
              value={platformFilter}
              onChange={setPlatformFilter}
              style={{ width: '100%' }}
              placeholder="选择招聘平台"
            >
              <Option value="全部">全部平台</Option>
              <Option value="智联招聘">智联招聘</Option>
              <Option value="前程无忧">前程无忧</Option>
              <Option value="BOSS直聘">BOSS直聘</Option>
              <Option value="拉勾网">拉勾网</Option>
              <Option value="猎聘网">猎聘网</Option>
              <Option value="脉脉">脉脉</Option>
              <Option value="LinkedIn">LinkedIn</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Space>
              <Button type="primary" onClick={handleSearch}>
                搜索
              </Button>
              <Button onClick={handleReset}>
                重置
              </Button>
              <Button icon={<ReloadOutlined />} onClick={() => fetchTasks()}>
                刷新
              </Button>
              {selectedRowKeys.length > 0 && (
                <Popconfirm
                  title={`确定要删除选中的 ${selectedRowKeys.length} 个任务吗？`}
                  onConfirm={handleBatchDelete}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    批量删除
                  </Button>
                </Popconfirm>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 任务列表 */}
      <Card>
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          onChange={handleTableChange}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys
          }}
          scroll={{ x: 1000, y: 600 }}
        />
      </Card>

      {/* 任务表单模态框 */}
      <TaskForm
        visible={taskFormVisible}
        task={currentTask}
        onCancel={() => setTaskFormVisible(false)}
        onSuccess={handleTaskFormSuccess}
      />

      {/* 任务详情模态框 */}
      <TaskDetail
        visible={taskDetailVisible}
        task={currentTask}
        onCancel={() => setTaskDetailVisible(false)}
        onRefresh={() => {
          fetchTasks();
          fetchStats();
        }}
      />
    </div>
  );
};

export default TaskManagement;