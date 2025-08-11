import React, { useState } from 'react';
import { Card, Input, Button, Space, message, Avatar, List, Typography } from 'antd';
import { RobotOutlined, SendOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const { TextArea } = Input;
const { Text } = Typography;

const AIChat = () => {
  const [chatQuery, setChatQuery] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);

  const API_BASE = '/api/knowledge';

  const handleSendMessage = async () => {
    if (!chatQuery.trim()) {
      message.warning('请输入问题');
      return;
    }

    const userMessage = {
      type: 'user',
      content: chatQuery,
      timestamp: new Date().toLocaleTimeString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setChatLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        query: chatQuery,
        companyId: '1'
      });

      if (response.data.success) {
        const aiMessage = {
          type: 'ai',
          content: response.data.data.response,
          timestamp: new Date().toLocaleTimeString(),
          context: response.data.data.context
        };

        setChatHistory(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      message.error('AI对话失败');
      console.error('AI对话失败:', error);
      
      const errorMessage = {
        type: 'error',
        content: '抱歉，AI服务暂时不可用，请稍后再试。',
        timestamp: new Date().toLocaleTimeString()
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setChatLoading(false);
      setChatQuery('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const renderMessage = (message, index) => {
    const isUser = message.type === 'user';
    const isAI = message.type === 'ai';
    const isError = message.type === 'error';

    return (
      <div
        key={index}
        style={{
          display: 'flex',
          marginBottom: 16,
          justifyContent: isUser ? 'flex-end' : 'flex-start'
        }}
      >
        <div
          style={{
            maxWidth: '70%',
            padding: 12,
            borderRadius: 12,
            backgroundColor: isUser ? '#1890ff' : isError ? '#ff4d4f' : '#f0f0f0',
            color: isUser ? 'white' : 'black'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Avatar
              icon={isUser ? <UserOutlined /> : <RobotOutlined />}
              size="small"
              style={{ marginRight: 8, backgroundColor: isUser ? '#fff' : '#1890ff' }}
            />
            <Text style={{ color: isUser ? 'white' : '#666', fontSize: 12 }}>
              {isUser ? '您' : isError ? '系统' : 'AI助手'}
            </Text>
            <Text style={{ color: isUser ? 'rgba(255,255,255,0.7)' : '#999', fontSize: 12, marginLeft: 'auto' }}>
              {message.timestamp}
            </Text>
          </div>
          
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
            {message.content}
          </div>

          {isAI && message.context && (
            <div style={{ marginTop: 8, padding: 8, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 4 }}>
              <Text style={{ fontSize: 12, color: '#666' }}>
                <strong>参考信息：</strong>
                {message.context.substring(0, 200)}...
              </Text>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ height: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
      <Card 
        title={
          <Space>
            <RobotOutlined style={{ color: '#1890ff' }} />
            AI助手对话
          </Space>
        }
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16 }}
      >
        {/* 聊天历史 */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16 }}>
          {chatHistory.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: 100 }}>
              <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
              <p>欢迎使用企业智库AI助手！</p>
              <p>我可以基于您的企业知识库回答各种问题。</p>
            </div>
          ) : (
            chatHistory.map((message, index) => renderMessage(message, index))
          )}
          
          {chatLoading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
              <div style={{ padding: 12, borderRadius: 12, backgroundColor: '#f0f0f0' }}>
                <Space>
                  <RobotOutlined style={{ color: '#1890ff' }} />
                  <Text>AI正在思考中...</Text>
                </Space>
              </div>
            </div>
          )}
        </div>

        {/* 输入区域 */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={chatQuery}
              onChange={(e) => setChatQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入您的问题，AI将基于企业知识库为您解答..."
              autoSize={{ minRows: 2, maxRows: 4 }}
              disabled={chatLoading}
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              loading={chatLoading}
              disabled={!chatQuery.trim()}
              style={{ height: 'auto' }}
            >
              发送
            </Button>
          </Space.Compact>
          
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              按 Enter 发送，Shift + Enter 换行
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AIChat; 

// 在AIChat组件中找到TextArea输入框，移除禁用状态
// 找到相关代码并修复

// 临时添加样式修复
const inputStyle = {
  zIndex: 1002,
  pointerEvents: 'auto'
};