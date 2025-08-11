import React, { useState } from 'react';
import { Card, List, Tag, Typography, Space, Button, Collapse, Divider, Tooltip } from 'antd';
import { 
  FileTextOutlined, 
  BookOutlined, 
  EyeOutlined, 
  CopyOutlined,
  StarOutlined,
  StarFilled,
  LinkOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { message } from 'antd';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

const KnowledgeSearchResult = ({ results, query, onViewDocument }) => {
  const [favorites, setFavorites] = useState(new Set());
  const [expandedItems, setExpandedItems] = useState(new Set());

  // 获取相似度颜色
  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.8) return 'green';
    if (similarity >= 0.6) return 'orange';
    return 'red';
  };

  // 获取相似度文本
  const getSimilarityText = (similarity) => {
    const percentage = (similarity * 100).toFixed(1);
    if (similarity >= 0.8) return `高相关 (${percentage}%)`;
    if (similarity >= 0.6) return `中相关 (${percentage}%)`;
    return `低相关 (${percentage}%)`;
  };

  // 获取文件类型图标和颜色
  const getFileTypeInfo = (fileType) => {
    const typeMap = {
      'application/pdf': { icon: '📄', text: 'PDF', color: 'red' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: '📝', text: 'Word', color: 'blue' },
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: '📊', text: 'Excel', color: 'green' },
      'text/plain': { icon: '📄', text: 'TXT', color: 'default' },
      'text/markdown': { icon: '📝', text: 'MD', color: 'purple' }
    };
    return typeMap[fileType] || { icon: '📄', text: '文档', color: 'default' };
  };

  // 复制内容到剪贴板
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      message.success('内容已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败');
    });
  };

  // 切换收藏状态
  const toggleFavorite = (resultId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(resultId)) {
      newFavorites.delete(resultId);
      message.info('已取消收藏');
    } else {
      newFavorites.add(resultId);
      message.success('已添加到收藏');
    }
    setFavorites(newFavorites);
  };

  // 切换展开状态
  const toggleExpanded = (resultId) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(resultId)) {
      newExpanded.delete(resultId);
    } else {
      newExpanded.add(resultId);
    }
    setExpandedItems(newExpanded);
  };

  // 格式化时间
  const formatTime = (timestamp) => {
    if (!timestamp) return '未知时间';
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN');
  };

  // 高亮关键词
  const highlightKeywords = (text, keywords) => {
    if (!keywords || !text) return text;
    const keywordArray = Array.isArray(keywords) ? keywords : [keywords];
    let highlightedText = text;
    keywordArray.forEach(keyword => {
      const regex = new RegExp(`(${keyword})`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark style="background-color: #ffd54f; padding: 2px 4px; border-radius: 3px;">$1</mark>');
    });
    return highlightedText;
  };

  return (
    <div className="knowledge-search-result">
      {/* 搜索结果头部 */}
      <Card 
        title={
          <Space>
            <BookOutlined style={{ color: '#1890ff' }} />
            <span>知识库检索结果</span>
            <Tag color="blue">{results.length} 个结果</Tag>
          </Space>
        }
        extra={
          <Space>
            <Text type="secondary">查询：</Text>
            <Text code>{query}</Text>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            找到 {results.length} 个相关文档片段，按相关度排序
          </Text>
        </div>
      </Card>

      {/* 搜索结果列表 */}
      <List
        dataSource={results}
        renderItem={(result, index) => {
          const fileTypeInfo = getFileTypeInfo(result.metadata?.file_type);
          const isFavorite = favorites.has(result.id || index);
          const isExpanded = expandedItems.has(result.id || index);
          const highlightedContent = highlightKeywords(result.content, query);

          return (
            <Card
              key={result.id || index}
              style={{ 
                marginBottom: 16, 
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
              bodyStyle={{ padding: 16 }}
            >
              {/* 结果头部 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <Space align="center" style={{ marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 16 }}>
                      结果 #{index + 1}
                    </Text>
                    <Tag color={getSimilarityColor(result.similarity)}>
                      {getSimilarityText(result.similarity)}
                    </Tag>
                    <span style={{ fontSize: '18px' }}>{fileTypeInfo.icon}</span>
                    <Tag color={fileTypeInfo.color}>
                      {fileTypeInfo.text}
                    </Tag>
                  </Space>
                  
                  {result.metadata?.document_title && (
                    <div style={{ marginBottom: 8 }}>
                      <Text strong style={{ color: '#1890ff' }}>
                        📄 {result.metadata.document_title}
                      </Text>
                    </div>
                  )}
                </div>

                <Space className="action-buttons">
                  <Tooltip title={isFavorite ? '取消收藏' : '添加到收藏'}>
                    <Button
                      type="text"
                      className={isFavorite ? 'favorite-button' : ''}
                      icon={isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                      onClick={() => toggleFavorite(result.id || index)}
                    />
                  </Tooltip>
                  <Tooltip title="复制内容">
                    <Button
                      type="text"
                      icon={<CopyOutlined />}
                      onClick={() => copyToClipboard(result.content)}
                    />
                  </Tooltip>
                  {onViewDocument && result.metadata?.document_id && (
                    <Tooltip title="查看完整文档">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        onClick={() => onViewDocument(result.metadata.document_id)}
                      />
                    </Tooltip>
                  )}
                </Space>
              </div>

              {/* 内容预览 */}
              <div style={{ marginBottom: 12 }}>
                <div className="content-preview" style={{ maxHeight: isExpanded ? 'none' : '120px' }}>
                  <div 
                    dangerouslySetInnerHTML={{ __html: highlightedContent }}
                    style={{ 
                      lineHeight: 1.6,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}
                  />
                  {!isExpanded && result.content.length > 200 && (
                    <div className="expand-button">
                      <Button
                        type="link"
                        size="small"
                        onClick={() => toggleExpanded(result.id || index)}
                      >
                        展开全文
                      </Button>
                    </div>
                  )}
                </div>
                
                {isExpanded && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => toggleExpanded(result.id || index)}
                    style={{ marginTop: 8 }}
                  >
                    收起
                  </Button>
                )}
              </div>

              {/* 元数据信息 */}
              <div className="metadata-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space split={<Divider type="vertical" />}>
                  {result.metadata?.chunk_index && (
                    <Text type="secondary">
                      📍 块索引: {result.metadata.chunk_index}
                    </Text>
                  )}
                  {result.metadata?.upload_time && (
                    <Text type="secondary">
                      <CalendarOutlined /> {formatTime(result.metadata.upload_time)}
                    </Text>
                  )}
                  {result.metadata?.file_size && (
                    <Text type="secondary">
                      📦 {(result.metadata.file_size / 1024).toFixed(1)} KB
                    </Text>
                  )}
                </Space>
                
                <Space>
                  <Text type="secondary">
                    字数: {result.content.length}
                  </Text>
                </Space>
              </div>
            </Card>
          );
        }}
      />

      {/* 无结果提示 */}
      {results.length === 0 && (
        <Card>
          <div className="no-results">
            <BookOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <Title level={4} type="secondary">未找到相关结果</Title>
            <Paragraph type="secondary">
              请尝试使用不同的关键词或重新表述您的问题
            </Paragraph>
            <Space>
              <Button type="primary" icon={<LinkOutlined />}>
                查看所有文档
              </Button>
            </Space>
          </div>
        </Card>
      )}
    </div>
  );
};

export default KnowledgeSearchResult; 