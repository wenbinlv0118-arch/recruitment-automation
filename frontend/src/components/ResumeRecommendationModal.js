import React from 'react';
import { Modal, Card, List, Typography, Button, Space, Divider } from 'antd';
import { FileTextOutlined, DownloadOutlined, UserOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 简历推荐弹窗组件
 * 展示根据查询条件推荐的简历
 * @param {boolean} visible - 弹窗是否可见
 * @param {function} onClose - 关闭弹窗的回调函数
 * @param {string} query - 查询条件
 * @param {Array} resumes - 推荐的简历列表
 * @param {Array} positions - 职位列表
 */
const ResumeRecommendationModal = ({ visible, onClose, query, resumes = [], positions = [] }) => {
  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined />
          <span>简历推荐结果</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <Card size="small" style={{ marginBottom: 16 }}>
        <Text strong>查询条件：</Text>
        <Text type="secondary">{query || '未指定'}</Text>
      </Card>
      
      <Divider orientation="left">推荐简历</Divider>
      
      {resumes.length > 0 ? (
        <List
          dataSource={resumes}
          renderItem={(resume, index) => (
            <List.Item
              key={resume.id || index}
              actions={[
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />} 
                  size="small"
                  onClick={() => window.open(resume.downloadUrl, '_blank')}
                >
                  下载
                </Button>
              ]}
            >
              <List.Item.Meta
                avatar={<UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} />}
                title={resume.name || '未命名简历'}
                description={
                  <Space size="small">
                    <Text type="secondary">{resume.position || '未指定职位'}</Text>
                    <Text type="secondary">|</Text>
                    <Text type="secondary">{resume.experience || '经验不详'}</Text>
                    <Text type="secondary">|</Text>
                    <Text type="secondary">{resume.education || '学历不详'}</Text>
                  </Space>
                }
              />
              {resume.matchScore && (
                <Text strong style={{ color: '#52c41a' }}>
                  匹配度: {(resume.matchScore * 100).toFixed(1)}%
                </Text>
              )}
            </List.Item>
          )}
        />
      ) : (
        <Card>
          <Text type="secondary">暂无推荐简历</Text>
        </Card>
      )}
    </Modal>
  );
};

export default ResumeRecommendationModal;