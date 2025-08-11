import React, { useState } from 'react';
import {
  Modal,
  Card,
  Row,
  Col,
  Tag,
  Button,
  Space,
  Typography,
  List,
  Avatar,
  Progress,
  Timeline,
  Input,
  message,
  Select,
  Badge
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PauseCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const TaskDetail = ({ visible, task, onCancel, onRefresh }) => {
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);

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
      '智联招聘': { color: 'blue', icon: '💼' },
      '前程无忧': { color: 'green', icon: '📋' },
      'BOSS直聘': { color: 'orange', icon: '👔' },
      '拉勾网': { color: 'purple', icon: '🔗' },
      '猎聘网': { color: 'red', icon: '🎯' },
      '脉脉': { color: 'cyan', icon: '💬' },
      'LinkedIn': { color: 'geekblue', icon: '🌐' }
    };
    return configs[platform] || { color: 'default', icon: '🌍' };
  };

  // 获取候选人状态配置
  const getCandidateStatusConfig = (status) => {
    const configs = {
      '待联系': { color: 'default', text: '待联系' },
      '已联系': { color: 'processing', text: '已联系' },
      '面试中': { color: 'warning', text: '面试中' },
      '已录用': { color: 'success', text: '已录用' },
      '已拒绝': { color: 'error', text: '已拒绝' }
    };
    return configs[status] || configs['待联系'];
  };

  // 更新候选人状态
  const updateCandidateStatus = async (candidateId, status) => {
    try {
      console.log(`正在更新候选人状态:`, { taskId: task.id, candidateId, status });
      
      const response = await fetch(`/api/tasks/${task.id}/candidates/${candidateId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      console.log('API响应状态:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API错误响应:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('API响应结果:', result);

      if (result.success) {
        message.success('候选人状态更新成功');
        onRefresh();
      } else {
        message.error(result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新候选人状态失败:', error);
      message.error(`更新候选人状态失败: ${error.message}`);
    }
  };

  // 添加评论
  const addComment = async () => {
    if (!commentText.trim()) {
      message.warning('请输入评论内容');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: commentText,
          author: '当前用户'
        })
      });

      const result = await response.json();

      if (result.success) {
        message.success('评论添加成功');
        setCommentText('');
        onRefresh();
      } else {
        message.error(result.message || '添加评论失败');
      }
    } catch (error) {
      console.error('添加评论失败:', error);
      message.error('添加评论失败');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Modal
      title="任务详情"
      open={visible}
      onCancel={onCancel}
      width={1000}
      footer={[
        <Button key="close" onClick={onCancel}>
          关闭
        </Button>
      ]}
    >
      <div className="task-detail">
        {/* 任务基本信息 */}
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Title level={4}>{task.title}</Title>
              <Paragraph>{task.description}</Paragraph>
              <Space direction="vertical" size="small">
                <div>
                  <Text strong>目标职位：</Text>
                  <Text>{task.position}</Text>
                </div>
                <div>
                  <Text strong>负责人：</Text>
                  <Text>{task.assignee || '未指定'}</Text>
                </div>
                <div>
                  <Text strong>招聘平台：</Text>
                  <div style={{ marginTop: 4 }}>
                    {task.platforms && task.platforms.length > 0 ? (
                      <Space wrap>
                        {task.platforms.map((platform, index) => {
                          const config = getPlatformConfig(platform);
                          return (
                            <Tag key={index} color={config.color} icon={<GlobalOutlined />}>
                              {config.icon} {platform}
                            </Tag>
                          );
                        })}
                      </Space>
                    ) : (
                      <Text type="secondary">未发布到任何平台</Text>
                    )}
                  </div>
                </div>
                <div>
                  <Text strong>创建时间：</Text>
                  <Text>{dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                </div>
                {task.deadline && (
                  <div>
                    <Text strong>截止时间：</Text>
                    <Text>{dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}</Text>
                  </div>
                )}
              </Space>
            </Col>
            <Col span={12}>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text strong>任务状态：</Text>
                  <Badge
                    status={getStatusConfig(task.status).color}
                    text={getStatusConfig(task.status).text}
                    icon={getStatusConfig(task.status).icon}
                  />
                </div>
                <div>
                  <Text strong>优先级：</Text>
                  <Tag color={getPriorityConfig(task.priority).color} icon={<FlagOutlined />}>
                    {getPriorityConfig(task.priority).text}
                  </Tag>
                </div>
                <div>
                  <Text strong>进度：</Text>
                  <Progress
                    percent={task.progress || 0}
                    status={task.progress === 100 ? 'success' : 'active'}
                    style={{ width: 200 }}
                  />
                </div>
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 候选人列表 */}
        <Card title={`候选人列表 (${task.candidates?.length || 0})`} style={{ marginBottom: 16 }}>
          {task.candidates && task.candidates.length > 0 ? (
            <List
              dataSource={task.candidates}
              renderItem={(candidate, index) => (
                <List.Item
                  actions={[
                    <Select
                      key="status"
                      value={candidate.status}
                      onChange={(value) => updateCandidateStatus(candidate.id, value)}
                      style={{ width: 120 }}
                    >
                      <Option value="待联系">待联系</Option>
                      <Option value="已联系">已联系</Option>
                      <Option value="面试中">面试中</Option>
                      <Option value="已录用">已录用</Option>
                      <Option value="已拒绝">已拒绝</Option>
                    </Select>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{candidate.name}</Text>
                        <Tag color={getCandidateStatusConfig(candidate.status).color}>
                          {getCandidateStatusConfig(candidate.status).text}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction="vertical" size="small">
                        <div>
                          <MailOutlined style={{ marginRight: 4 }} />
                          <Text>{candidate.email}</Text>
                        </div>
                        {candidate.phone && (
                          <div>
                            <PhoneOutlined style={{ marginRight: 4 }} />
                            <Text>{candidate.phone}</Text>
                          </div>
                        )}
                        {candidate.notes && (
                          <div>
                            <Text type="secondary">{candidate.notes}</Text>
                          </div>
                        )}
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            添加时间：{dayjs(candidate.addedAt).format('YYYY-MM-DD HH:mm')}
                          </Text>
                        </div>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              <Text type="secondary">暂无候选人</Text>
            </div>
          )}
        </Card>

        {/* 任务时间线 */}
        <Card title="任务时间线" style={{ marginBottom: 16 }}>
          <Timeline
            items={[
              {
                content: (
                  <div>
                    <Text strong>任务创建</Text>
                    <div>
                      <Text type="secondary">
                        {dayjs(task.createdAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </div>
                  </div>
                )
              },
              ...(task.deadline ? [{
                content: (
                  <div>
                    <Text strong>截止时间</Text>
                    <div>
                      <Text type="secondary">
                        {dayjs(task.deadline).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </div>
                  </div>
                )
              }] : []),
              {
                content: (
                  <div>
                    <Text strong>最后更新</Text>
                    <div>
                      <Text type="secondary">
                        {dayjs(task.updatedAt).format('YYYY-MM-DD HH:mm')}
                      </Text>
                    </div>
                  </div>
                )
              }
            ]}
          />
        </Card>

        {/* 评论区域 */}
        <Card title="评论" style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 16 }}>
            <TextArea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="请输入评论内容..."
              rows={3}
              onPressEnter={(e) => {
                if (e.ctrlKey) {
                  addComment();
                }
              }}
            />
            <div style={{ marginTop: 8, textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                按 Ctrl + Enter 发送
              </Text>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={addComment}
                loading={loading}
                style={{ marginLeft: 8 }}
              >
                发送评论
              </Button>
            </div>
          </div>

          {task.comments && task.comments.length > 0 ? (
            <List
              dataSource={task.comments}
              renderItem={(comment) => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={
                      <Space>
                        <Text strong>{comment.author}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(comment.createdAt).format('YYYY-MM-DD HH:mm')}
                        </Text>
                      </Space>
                    }
                    description={<Paragraph>{comment.content}</Paragraph>}
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
              <Text type="secondary">暂无评论</Text>
            </div>
          )}
        </Card>
      </div>
    </Modal>
  );
};

export default TaskDetail; 