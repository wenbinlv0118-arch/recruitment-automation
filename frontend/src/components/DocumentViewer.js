import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Spin, message, Tag, Space, Typography } from 'antd';
import { FileTextOutlined, DownloadOutlined, EyeOutlined } from '@ant-design/icons';
import ModalBasePattern from './ModalBasePattern';
import { apiGet } from '../utils/api';

const { Text, Title } = Typography;

// 文档内容容器
const DocumentContent = styled.div`
  background: white;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

// 文档信息卡片
const DocumentInfo = styled.div`
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border-left: 4px solid #1890ff;
`;

// 文档内容区域
const ContentArea = styled.div`
  background: white;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 20px;
  min-height: 400px;
  max-height: 600px;
  overflow-y: auto;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
`;

// 加载状态容器
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #666;
`;

// 错误状态容器
const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #ff4d4f;
`;

const DocumentViewer = ({ visible, onClose, documentId, documentTitle }) => {
  const [documentContent, setDocumentContent] = useState('');
  const [documentInfo, setDocumentInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 获取文档内容
  const fetchDocumentContent = async () => {
    if (!documentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // 获取文档详情
      const infoData = await apiGet(`/api/knowledge/documents/${documentId}`);
      setDocumentInfo(infoData.data);

      // 获取文档块内容
      const chunksData = await apiGet(`/api/knowledge/documents/${documentId}/chunks`);
      
      // 合并所有文档块
      const fullContent = chunksData.data
        .sort((a, b) => a.chunk_index - b.chunk_index)
        .map(chunk => chunk.content)
        .join('\n\n');
      
      setDocumentContent(fullContent);
    } catch (err) {
      console.error('获取文档内容失败:', err);
      setError(err.message);
      message.error(`获取文档内容失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 当弹窗显示时获取文档内容
  useEffect(() => {
    if (visible && documentId) {
      fetchDocumentContent();
    }
  }, [visible, documentId]);

  // 下载文档
  const handleDownload = async () => {
    if (!documentInfo) return;
    
    try {
      const blob = await apiGet(`/api/knowledge/documents/${documentId}/download`, {}, { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentInfo.title || 'document';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      message.success('文档下载成功');
    } catch (err) {
      console.error('下载文档失败:', err);
      message.error(`下载失败: ${err.message}`);
    }
  };

  // 获取文件类型标签
  const getFileTypeTag = (fileType) => {
    const typeMap = {
      'application/pdf': { text: 'PDF', color: 'red' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { text: 'Word', color: 'blue' },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { text: 'Excel', color: 'green' },
      'text/plain': { text: 'TXT', color: 'default' },
      'text/markdown': { text: 'MD', color: 'purple' }
    };
    const config = typeMap[fileType] || { text: '未知', color: 'default' };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 获取文件大小显示
  const getFileSizeDisplay = (size) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <ModalBasePattern
      visible={visible}
      onClose={onClose}
      title="文档查看"
      dataAttribute="document-viewer"
    >
      {documentInfo && (
        <DocumentInfo>
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Title level={5} style={{ margin: 0, marginBottom: 8 }}>
                <FileTextOutlined style={{ marginRight: 8 }} />
                {documentInfo.title}
              </Title>
            </div>
            
            <Space wrap>
              {getFileTypeTag(documentInfo.file_type)}
              <Tag color="blue">大小: {getFileSizeDisplay(documentInfo.file_size)}</Tag>
              <Tag color={documentInfo.status === 'processed' ? 'green' : 'orange'}>
                状态: {documentInfo.status === 'processed' ? '已处理' : documentInfo.status}
              </Tag>
              <Tag color="default">
                上传时间: {new Date(documentInfo.upload_time).toLocaleString('zh-CN')}
              </Tag>
            </Space>
            
            <Space>
              <button
                onClick={handleDownload}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  background: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                <DownloadOutlined />
                下载原文件
              </button>
            </Space>
          </Space>
        </DocumentInfo>
      )}

      <DocumentContent>
        <Title level={5} style={{ marginBottom: 16 }}>
          <EyeOutlined style={{ marginRight: 8 }} />
          文档内容
        </Title>
        
        {loading && (
          <LoadingContainer>
            <Spin size="large" />
            <Text style={{ marginTop: 16 }}>正在加载文档内容...</Text>
          </LoadingContainer>
        )}
        
        {error && (
          <ErrorContainer>
            <Text type="danger">加载失败</Text>
            <Text type="secondary" style={{ marginTop: 8 }}>{error}</Text>
          </ErrorContainer>
        )}
        
        {!loading && !error && documentContent && (
          <ContentArea>
            {documentContent}
          </ContentArea>
        )}
        
        {!loading && !error && !documentContent && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <Text>暂无内容</Text>
          </div>
        )}
      </DocumentContent>
    </ModalBasePattern>
  );
};

export default DocumentViewer;