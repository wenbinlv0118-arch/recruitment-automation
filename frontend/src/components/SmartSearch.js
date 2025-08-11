import React, { useState } from 'react';
import { Card, Input, Button, Space, message, List, Tag, Typography, Divider } from 'antd';
import { SearchOutlined, FileTextOutlined, RobotOutlined } from '@ant-design/icons';
import axios from 'axios';

const { Search } = Input;
const { Text, Title } = Typography;

const SmartSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const API_BASE = '/api/knowledge';

  const handleSearch = async (query) => {
    if (!query.trim()) {
      message.warning('请输入搜索内容');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/retrieve`, {
        query: query,
        companyId: '1',
        limit: 10
      });

      if (response.data.success) {
        setSearchResults(response.data.data.results);
        setSearchHistory(prev => [query, ...prev.slice(0, 9)]); // 保留最近10条搜索记录
        message.success(`找到 ${response.data.data.total} 个相关结果`);
      }
    } catch (error) {
      message.error('搜索失败');
      console.error('搜索失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity) => {
    if (similarity >= 0.8) return 'green';
    if (similarity >= 0.6) return 'orange';
    return 'red';
  };

  const getSimilarityText = (similarity) => {
    const percentage = (similarity * 100).toFixed(1);
    if (similarity >= 0.8) return `高相关 (${percentage}%)`;
    if (similarity >= 0.6) return `中相关 (${percentage}%)`;
    return `低相关 (${percentage}%)`;
  };

  return (
    <div>
      <Card title="智能检索" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Search
            placeholder="输入您的问题，系统将智能检索相关知识..."
            enterButton={
              <Button type="primary" icon={<SearchOutlined />} loading={loading}>
                检索
              </Button>
            }
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={handleSearch}
            allowClear
          />
          
          {searchHistory.length > 0 && (
            <div>
              <Text type="secondary">最近搜索：</Text>
              <Space wrap>
                {searchHistory.map((query, index) => (
                  <Tag
                    key={index}
                    color="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSearchQuery(query);
                      handleSearch(query);
                    }}
                  >
                    {query}
                  </Tag>
                ))}
              </Space>
            </div>
          )}
        </Space>
      </Card>

      {searchResults.length > 0 && (
        <Card title={`检索结果 (${searchResults.length})`}>
          <List
            dataSource={searchResults}
            renderItem={(result, index) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
                  title={
                    <Space>
                      <Text strong>结果 {index + 1}</Text>
                      <Tag color={getSimilarityColor(result.similarity)}>
                        {getSimilarityText(result.similarity)}
                      </Tag>
                      {result.metadata?.document_title && (
                        <Tag color="purple">
                          来源: {result.metadata.document_title}
                        </Tag>
                      )}
                    </Space>
                  }
                  description={
                    <div>
                      <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        padding: 12, 
                        borderRadius: 6, 
                        marginTop: 8,
                        borderLeft: '4px solid #1890ff'
                      }}>
                        <Text>{result.content}</Text>
                      </div>
                      
                      {result.metadata && (
                        <div style={{ marginTop: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            文档类型: {result.metadata.file_type || '未知'} | 
                            块索引: {result.metadata.chunk_index || '未知'}
                          </Text>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {searchResults.length === 0 && !loading && searchQuery && (
        <Card>
          <div style={{ textAlign: 'center', padding: 40 }}>
            <SearchOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
            <p>未找到相关结果</p>
            <Text type="secondary">请尝试使用不同的关键词或重新表述您的问题</Text>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SmartSearch; 