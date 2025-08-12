import React from 'react';
import { Card, List, Typography, Button, Space } from 'antd';
import { DownloadOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 简历库组件
 * 用于展示和管理简历资源
 */
const ResumeLibrary = () => {
  // 模拟简历数据
  const resumeData = [
    { id: 1, name: '张三', position: '前端工程师', experience: '3年', education: '本科' },
    { id: 2, name: '李四', position: '后端工程师', experience: '5年', education: '硕士' },
    { id: 3, name: '王五', position: '产品经理', experience: '4年', education: '本科' },
  ];

  return (
    <Card 
      title={<Space><SearchOutlined /><span>简历库</span></Space>} 
      extra={<Button type="primary">上传简历</Button>}
      style={{ height: '100%', overflow: 'auto' }}
    >
      <List
        dataSource={resumeData}
        renderItem={item => (
          <List.Item
            actions={[<Button icon={<DownloadOutlined />} size="small">下载</Button>]}
          >
            <List.Item.Meta
              title={item.name}
              description={
                <Space>
                  <Text type="secondary">{item.position}</Text>
                  <Text type="secondary">|</Text>
                  <Text type="secondary">{item.experience}经验</Text>
                  <Text type="secondary">|</Text>
                  <Text type="secondary">{item.education}</Text>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default ResumeLibrary;