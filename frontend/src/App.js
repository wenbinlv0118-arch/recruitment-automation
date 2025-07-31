import React, { useState, useEffect, useRef } from 'react';
import { Layout, Card, Input, Button, message, List, Typography, Space } from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined, 
  DownloadOutlined
} from '@ant-design/icons';
import io from 'socket.io-client';
import styled from 'styled-components';
import './App.css';

const { Header, Content } = Layout;
const { Text, Title } = Typography;

// 样式组件
const StyledLayout = styled(Layout)`
  min-height: 100vh;
  background: var(--gradient-secondary);
`;

const StyledHeader = styled(Header)`
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(30, 58, 138, 0.15);
`;

const HeaderTitle = styled(Title)`
  color: white !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StyledContent = styled(Content)`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 600px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(30, 58, 138, 0.1);
  overflow: hidden;
`;

const ChatHeader = styled.div`
  background: var(--gradient-primary);
  color: white;
  padding: 16px 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f8fafc;
`;

const MessageItem = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isUser'
})`
  background: ${props => props.isUser ? 'var(--primary-blue)' : 'white'};
  color: ${props => props.isUser ? 'white' : 'var(--gray-800)'};
  padding: 12px 16px;
  border-radius: 12px;
  max-width: 70%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const InputContainer = styled.div`
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
`;

const StatusCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(30, 58, 138, 0.1);
`;

const ResumeList = styled(List)`
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(30, 58, 138, 0.1);
`;

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isWaitingForCode, setIsWaitingForCode] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageIdCounter = useRef(0); // 用于生成唯一消息ID

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 连接Socket
  useEffect(() => {
    console.log('正在连接Socket.IO...');
    
    const newSocket = io('/', {
      transports: ['websocket', 'polling'], // 优先使用WebSocket，降级到polling
      timeout: 30000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      upgrade: true,
      rememberUpgrade: true
    });
    
    newSocket.on('connect', () => {
      console.log('Socket.IO连接成功:', newSocket.id);
      setIsConnected(true);
      addMessage('AI', '您好！我是Moirai寻聘助手，可以通过对话的方式帮您智能寻聘。请告诉我您的账号，我将帮您登录智联招聘并开始寻聘。', false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO连接断开:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO连接错误:', error);
      message.error('连接服务器失败: ' + error.message);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO重连成功，尝试次数:', attemptNumber);
      setIsConnected(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket.IO重连失败:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket.IO重连失败，已达到最大尝试次数');
      message.error('无法连接到服务器，请刷新页面重试');
    });

    newSocket.on('statusUpdate', (data) => {
      console.log('收到状态更新:', data);
      setCurrentStatus(data);
      addMessage('AI', data.message, false);
      
      if (data.requiresInput) {
        setIsWaitingForCode(true);
      }
      
      if (data.status === 'completed') {
        setIsLoading(false);
        fetchResumes();
      }
    });

    newSocket.on('error', (data) => {
      console.error('收到错误:', data);
      message.error(data.message || '操作失败，请重试');
      setIsLoading(false);
      setIsWaitingForCode(false);
    });

    setSocket(newSocket);

    return () => {
      console.log('清理Socket.IO连接');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // 获取简历列表
  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resumes');
      const data = await response.json();
      setResumes(data);
    } catch (error) {
      console.error('获取简历列表失败:', error);
    }
  };

  // 添加消息
  const addMessage = (sender, content, isUser = true) => {
    setMessages(prev => [...prev, {
      id: ++messageIdCounter.current, // 使用递增的ID确保唯一性
      sender,
      content,
      isUser,
      timestamp: new Date()
    }]);
  };

  // 发送消息
  const sendMessage = () => {
    if (!inputValue.trim() || !socket) return;

    const message = inputValue.trim();
    addMessage('用户', message, true);
    setInputValue('');

    // 检查是否是启动智能寻聘的命令
    if (message.includes('智能寻聘') || message.includes('开始招聘')) {
      handleStartRecruitment();
    } else if (isWaitingForCode && /^\d{6}$/.test(message)) {
      // 验证码输入
      handleVerificationCode(message);
    } else if (message.includes('手机号') || /^1[3-9]\d{9}$/.test(message)) {
      // 手机号输入
      handlePhoneNumber(message);
    } else {
      // 普通对话
      addMessage('AI', '我理解您的需求。请告诉我您的手机号，我将帮您启动智能寻聘流程。', false);
    }
  };

  // 处理手机号输入
  const handlePhoneNumber = (message) => {
    const phoneMatch = message.match(/1[3-9]\d{9}/);
    if (phoneMatch) {
      const phone = phoneMatch[0];
      addMessage('AI', `收到您的手机号：${phone}。正在启动智能寻聘流程...`, false);
      handleStartRecruitment(phone);
    } else {
      addMessage('AI', '请提供正确的手机号码格式，例如：13812345678', false);
    }
  };

  // 启动智能寻聘
  const handleStartRecruitment = (phone = null) => {
    if (!socket) return;

    setIsLoading(true);
    const phoneNumber = phone || extractPhoneFromMessages();
    
    if (!phoneNumber) {
      addMessage('AI', '请先提供您的手机号码', false);
      setIsLoading(false);
      return;
    }

    socket.emit('startRecruitment', { phone: phoneNumber });
  };

  // 处理验证码
  const handleVerificationCode = (code) => {
    if (!socket) return;

    socket.emit('submitVerificationCode', code);
    setIsWaitingForCode(false);
  };

  // 从消息历史中提取手机号
  const extractPhoneFromMessages = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const phoneMatch = messages[i].content.match(/1[3-9]\d{9}/);
      if (phoneMatch) {
        return phoneMatch[0];
      }
    }
    return null;
  };

  // 下载简历
  const downloadResume = async (filename) => {
    try {
      const response = await fetch(`/api/resumes/${filename}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      message.error('下载失败');
    }
  };

  return (
    <StyledLayout>
      <StyledHeader>
        <HeaderTitle level={3}>
          <RobotOutlined />
          Moirai寻聘助手
        </HeaderTitle>
      </StyledHeader>

      <StyledContent>
        <div style={{ display: 'flex', gap: '24px', height: 'calc(100vh - 120px)' }}>
          {/* 左侧聊天区域 */}
          <div style={{ flex: 1 }}>
            <ChatContainer>
              <ChatHeader>
                <RobotOutlined />
                与 Moirai 对话
              </ChatHeader>
              
              <MessagesContainer>
                {messages.map((msg) => (
                  <MessageItem key={msg.id}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%', 
                      background: msg.isUser ? 'var(--primary-blue)' : 'var(--accent-blue)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '14px'
                    }}>
                      {msg.isUser ? <UserOutlined /> : <RobotOutlined />}
                    </div>
                    <MessageContent isUser={msg.isUser}>
                      {msg.content}
                    </MessageContent>
                  </MessageItem>
                ))}
                <div ref={messagesEndRef} />
              </MessagesContainer>

              <InputContainer>
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={sendMessage}
                  placeholder={isWaitingForCode ? "请输入6位验证码" : "输入消息或手机号..."}
                  disabled={!isConnected || isLoading}
                  style={{ flex: 1 }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendMessage}
                  disabled={!isConnected || isLoading || !inputValue.trim()}
                  loading={isLoading}
                >
                  发送
                </Button>
              </InputContainer>
            </ChatContainer>
          </div>

          {/* 右侧状态和简历区域 */}
          <div style={{ width: '400px' }}>
            {/* 状态卡片 */}
            {currentStatus && (
              <StatusCard>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className={`status-indicator status-${currentStatus.status === 'completed' ? 'success' : 'running'}`} />
                  <Text strong>{currentStatus.message}</Text>
                </div>
              </StatusCard>
            )}

            {/* 简历列表 */}
            <ResumeList
              header={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DownloadOutlined />
                  <Text strong>已下载简历</Text>
                </div>
              }
              dataSource={resumes}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      icon={<DownloadOutlined />}
                      onClick={() => downloadResume(item.name)}
                    >
                      下载
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={item.name}
                    description={
                      <Space direction="vertical" size="small">
                        <Text type="secondary">
                          大小: {(item.size / 1024).toFixed(1)} KB
                        </Text>
                        <Text type="secondary">
                          下载时间: {new Date(item.downloadTime).toLocaleString()}
                        </Text>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        </div>
      </StyledContent>
    </StyledLayout>
  );
}

export default App;