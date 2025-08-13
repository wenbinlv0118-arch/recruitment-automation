import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  Typography, 
  Progress, 
  Row, 
  Col, 
  Statistic, 
  Modal, 
  message,
  Tooltip,
  Popconfirm,
  Divider
} from 'antd';
import { 
  EyeOutlined, 
  DeleteOutlined, 
  DownloadOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;

// 样式组件
const ResultsContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
`;

const QualityScore = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ResumePreview = styled.div`
  max-height: 200px;
  overflow-y: auto;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
`;

const ResumeCollectionResults = ({ 
  collectedResumes = [], 
  onResumeAction,
  onClearAll,
  onQualityThresholdChange 
}) => {
  const [selectedResume, setSelectedResume] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [qualityThreshold, setQualityThreshold] = useState(60);

  // 表格列配置
  const columns = [
    {
      title: '候选人',
      key: 'candidate',
      width: 120,
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 'bold' }}>{record.candidateName}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.candidateTitle}
          </div>
        </div>
      )
    },
    {
      title: '公司',
      dataIndex: 'candidateCompany',
      key: 'company',
      width: 120,
      render: (company) => company || '未知'
    },
    {
      title: '工作经验',
      dataIndex: 'candidateExperience',
      key: 'experience',
      width: 100,
      render: (experience) => experience || '未知'
    },
    {
      title: '质量评分',
      key: 'quality',
      width: 120,
      render: (_, record) => (
        <QualityScore>
          <Progress
            type="circle"
            size={40}
            percent={record.qualityScore}
            format={(percent) => `${percent}分`}
            strokeColor={record.isValid ? '#52c41a' : '#faad14'}
          />
          {record.isValid ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <CloseCircleOutlined style={{ color: '#faad14' }} />
          )}
        </QualityScore>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={record.isValid ? 'green' : 'orange'}>
          {record.isValid ? '有效' : '需改进'}
        </Tag>
      )
    },
    {
      title: '采集时间',
      key: 'collectedAt',
      width: 120,
      render: (_, record) => (
        <div>
          {new Date(record.collectedAt).toLocaleDateString()}
          <br />
          <span style={{ fontSize: '12px', color: '#666' }}>
            {new Date(record.collectedAt).toLocaleTimeString()}
          </span>
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="预览简历">
            <Button
              type="text"
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handlePreviewResume(record)}
            />
          </Tooltip>
          <Tooltip title="下载简历">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              size="small"
              onClick={() => handleDownloadResume(record)}
            />
          </Tooltip>
          <Tooltip title="删除简历">
            <Popconfirm
              title="确定要删除这份简历吗？"
              onConfirm={() => handleDeleteResume(record.id)}
              okText="确定"
              cancelText="取消"
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                size="small"
                danger
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 处理简历预览
  const handlePreviewResume = (resume) => {
    setSelectedResume(resume);
    setPreviewVisible(true);
  };

  // 处理简历下载
  const handleDownloadResume = (resume) => {
    try {
      const content = `候选人简历 - ${resume.candidateName}\n\n${resume.resumeText}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${resume.candidateName}_简历.txt`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('简历下载成功');
    } catch (error) {
      message.error('简历下载失败');
    }
  };

  // 处理简历删除
  const handleDeleteResume = (resumeId) => {
    if (onResumeAction) {
      onResumeAction('delete', resumeId);
    }
    message.success('简历删除成功');
  };

  // 处理质量阈值变更
  const handleQualityThresholdChange = (value) => {
    setQualityThreshold(value);
    if (onQualityThresholdChange) {
      onQualityThresholdChange(value);
    }
  };

  // 获取统计信息
  const getStatistics = () => {
    const total = collectedResumes.length;
    const valid = collectedResumes.filter(r => r.isValid).length;
    const invalid = total - valid;
    const avgScore = total > 0 ? 
      collectedResumes.reduce((sum, r) => sum + r.qualityScore, 0) / total : 0;
    
    return {
      total,
      valid,
      invalid,
      averageScore: Math.round(avgScore * 100) / 100,
      validRate: total > 0 ? Math.round((valid / total) * 100) : 0
    };
  };

  const stats = getStatistics();

  return (
    <ResultsContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <CheckCircleOutlined style={{ marginRight: 12, color: '#52c41a' }} />
          简历采集结果
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          已采集 {stats.total} 份简历，质量检测完成
        </Text>
      </div>

      {/* 统计信息 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总采集数"
              value={stats.total}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="有效简历"
              value={stats.valid}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="需改进"
              value={stats.invalid}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均质量分"
              value={stats.averageScore}
              valueStyle={{ color: '#722ed1' }}
              suffix="分"
            />
          </Col>
        </Row>
        
        <Divider />
        
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text strong>质量阈值设置</Text>
              <div style={{ marginTop: 8 }}>
                <Progress
                  percent={stats.validRate}
                  format={(percent) => `合格率: ${percent}%`}
                  strokeColor={stats.validRate >= 80 ? '#52c41a' : stats.validRate >= 60 ? '#faad14' : '#ff4d4f'}
                />
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text strong>质量阈值调整</Text>
              <div style={{ marginTop: 8 }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={qualityThreshold}
                  onChange={(e) => handleQualityThresholdChange(parseInt(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">{qualityThreshold}分</Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      <Card style={{ marginBottom: 24 }}>
        <Space size="large">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              // 批量下载有效简历
              const validResumes = collectedResumes.filter(r => r.isValid);
              if (validResumes.length === 0) {
                message.warning('没有有效简历可下载');
                return;
              }
              message.success(`开始下载 ${validResumes.length} 份有效简历`);
            }}
          >
            批量下载有效简历
          </Button>
          
          <Button
            icon={<InfoCircleOutlined />}
            onClick={() => {
              Modal.info({
                title: '简历质量说明',
                content: (
                  <div>
                    <p><strong>质量评分标准：</strong></p>
                    <ul>
                      <li>基础信息完整性（姓名、电话、邮箱等）：60分</li>
                      <li>内容长度适中（200-10000字符）：20分</li>
                      <li>工作经历描述：10分</li>
                      <li>技能描述：10分</li>
                    </ul>
                    <p><strong>建议：</strong>质量评分低于阈值的简历建议改进后重新采集。</p>
                  </div>
                ),
                width: 600
              });
            }}
          >
            质量说明
          </Button>
          
          <Popconfirm
            title="确定要清空所有采集的简历吗？此操作不可恢复！"
            onConfirm={onClearAll}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              清空所有
            </Button>
          </Popconfirm>
        </Space>
      </Card>

      {/* 简历列表 */}
      <Card title={`简历列表 (${stats.total})`}>
        <Table
          columns={columns}
          dataSource={collectedResumes}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 简历预览弹窗 */}
      <Modal
        title={`简历预览 - ${selectedResume?.candidateName}`}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />}
            onClick={() => selectedResume && handleDownloadResume(selectedResume)}
          >
            下载简历
          </Button>
        ]}
        width={800}
      >
        {selectedResume && (
          <div>
            {/* 基本信息 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Text strong>姓名：</Text>{selectedResume.keyInfo.name || '未知'}
                </Col>
                <Col span={8}>
                  <Text strong>电话：</Text>{selectedResume.keyInfo.phone || '未知'}
                </Col>
                <Col span={8}>
                  <Text strong>邮箱：</Text>{selectedResume.keyInfo.email || '未知'}
                </Col>
              </Row>
              <Row gutter={16} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Text strong>求职意向：</Text>{selectedResume.keyInfo.position || '未知'}
                </Col>
                <Col span={8}>
                  <Text strong>工作经验：</Text>{selectedResume.keyInfo.experience || '未知'}
                </Col>
                <Col span={8}>
                  <Text strong>教育背景：</Text>{selectedResume.keyInfo.education || '未知'}
                </Col>
              </Row>
            </Card>

            {/* 质量检测结果 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <Text strong>质量检测结果：</Text>
              <div style={{ marginTop: 8 }}>
                <Progress
                  percent={selectedResume.qualityScore}
                  format={(percent) => `${percent}分`}
                  strokeColor={selectedResume.isValid ? '#52c41a' : '#faad14'}
                />
              </div>
              {selectedResume.issues.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="danger">问题：</Text>
                  <ul style={{ marginTop: 4 }}>
                    {selectedResume.issues.map((issue, index) => (
                      <li key={index}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              {selectedResume.suggestions.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <Text type="warning">建议：</Text>
                  <ul style={{ marginTop: 4 }}>
                    {selectedResume.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            {/* 简历内容 */}
            <Card size="small" title="简历内容">
              <ResumePreview>
                {selectedResume.resumeText}
              </ResumePreview>
            </Card>
          </div>
        )}
      </Modal>
    </ResultsContainer>
  );
};

export default ResumeCollectionResults;
