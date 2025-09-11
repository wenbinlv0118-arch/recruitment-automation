import React, { useState, useEffect, useRef } from 'react';
import { Layout, Input, Button, message, Typography, Menu, Modal } from 'antd';
import { 
  SendOutlined, 
  RobotOutlined, 
  UserOutlined, 
  DownloadOutlined, 
  BarChartOutlined, 
  FileTextOutlined,
  LoadingOutlined,
  BookOutlined,
  UploadOutlined,
  FolderOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import io from 'socket.io-client';
import styled from 'styled-components';
import COTReasoning from './components/COTReasoning';
import ResumeLibrary from './components/ResumeLibrary';
import KnowledgeBase from './components/KnowledgeBase';
import { WEBSOCKET_CONFIG, API_ENDPOINTS } from './config/api';
import { apiGet, apiPost } from './utils/apiClient';
// import DocumentUpload from './components/DocumentUpload'; // 暂时未使用
import ResumeRecommendationModal from './components/ResumeRecommendationModal';
import CapabilityCards from './components/CapabilityCards';
import TaskManagement from './components/TaskManagement';
import KnowledgeSearchResult from './components/KnowledgeSearchResult';
import JDDetailDrawer from './components/JDDetailModal';
import Browser from './components/Browser';
import SmartRecruitmentEntry from './components/SmartRecruitmentEntry';
import BossZhipinControl from './components/BossZhipinControl';
import ZhilianControl from './components/ZhilianControl';
// 公司搜索组件已删除
import PositionManagement from './components/PositionManagement';


import { createCOTResponse } from './utils/cotUtils';
import './App.css';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

// 样式组件 - 未来科技感设计
const StyledSider = styled(Sider)`
  background: var(--glass-bg) !important;
  backdrop-filter: var(--blur-lg) !important;
  -webkit-backdrop-filter: var(--blur-lg) !important;
  border-right: 1px solid var(--glass-border) !important;
  box-shadow: var(--shadow-xl) !important;
  z-index: 10;
  position: fixed;
  height: 100vh;
  overflow: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--glass-bg);
    border-radius: var(--radius-sm);
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--primary-blue), var(--electric-blue));
    border-radius: var(--radius-sm);
    transition: all var(--duration-fast) ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, var(--electric-blue), var(--cyber-blue));
    box-shadow: 0 0 8px rgba(0, 122, 255, 0.4);
  }
`;

const StyledLayout = styled(Layout)`
  height: 100vh;
  background: var(--gradient-glass) !important;
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.03;
    pointer-events: none;
    z-index: 0;
  }
`;

const StyledHeader = styled(Header).withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  background: var(--glass-bg) !important;
  backdrop-filter: var(--blur-xl) !important;
  -webkit-backdrop-filter: var(--blur-xl) !important;
  border-bottom: 1px solid var(--glass-border) !important;
  display: flex;
  align-items: center;
  padding: 0 32px;
  box-shadow: var(--shadow-lg) !important;
  position: fixed;
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  z-index: 9;
  top: 0;
  left: 256px;
  transition: all var(--duration-normal) cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--gradient-cyber);
    opacity: 0.1;
    pointer-events: none;
  }
`;

const StyledContent = styled(Content).withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  padding: 0;
  margin: 0;
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin-top: 64px;
  margin-left: 256px;
  overflow: visible;
  transition: all var(--duration-normal) cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
  position: relative;
  z-index: 1;
`;

const HeaderTitle = styled(Title)`
  color: var(--primary-blue) !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 16px;
  font-weight: 700 !important;
  font-size: 20px !important;
  position: relative;
  z-index: 2;
  text-shadow: 0 0 8px rgba(0, 122, 255, 0.3);
  
  .anticon {
    color: var(--primary-blue) !important;
    font-size: 24px !important;
    filter: drop-shadow(0 0 8px rgba(0, 122, 255, 0.3));
  }
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  margin: 16px;
  box-shadow: var(--shadow-xl);
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.02;
    pointer-events: none;
  }
`;

// const ChatHeader = styled.div`
//   background: var(--gradient-primary);
//   color: white;
//   padding: 16px 24px;
//   font-weight: 600;
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   display: none; // 隐藏标题栏
// `;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background: transparent;
  width: 100%;
  position: relative;
  z-index: 1;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--glass-bg);
    border-radius: var(--radius-sm);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--primary-blue), var(--electric-blue));
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    transition: all var(--duration-fast) ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, var(--electric-blue), var(--cyber-blue));
    box-shadow: 0 0 12px rgba(0, 122, 255, 0.4);
  }
`;

const CapabilityCardsWrapper = styled.div`
  flex-shrink: 0;
`;

const MessageItem = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isThinking'
}).attrs(props => ({
  isUser: props.isUser,
  isThinking: props.isThinking
}))`
  background: ${props => {
    if (props.isThinking) return 'var(--glass-bg-light)';
    return props.isUser ? 'var(--gradient-primary)' : 'var(--glass-bg)';
  }};
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  color: ${props => {
    if (props.isThinking) return 'var(--primary-blue)';
    return props.isUser ? 'white' : 'var(--gray-900)';
  }};
  padding: ${props => props.isThinking ? '20px' : '16px 20px'};
  border-radius: var(--radius-lg);
  max-width: 75%;
  box-shadow: ${props => {
    if (props.isUser) return 'var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.2)';
    return 'var(--shadow-md)';
  }};
  border: 1px solid ${props => {
    if (props.isThinking) return 'var(--primary-blue)';
    return props.isUser ? 'var(--primary-blue)' : 'var(--glass-border)';
  }};
  border-left: ${props => props.isThinking ? '4px solid var(--primary-blue)' : 'none'};
  font-family: ${props => props.isThinking ? 'var(--font-mono)' : 'inherit'};
  position: relative;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  transition: all var(--duration-fast) ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => {
      if (props.isUser) return 'var(--shadow-xl), 0 0 30px rgba(0, 122, 255, 0.3)';
      return 'var(--shadow-lg)';
    }};
  }
`;

// const ThinkingIndicator = styled.span`
//   color: var(--primary-blue);
//   margin-right: 8px;
//   font-weight: 600;
//   text-shadow: 0 0 8px rgba(0, 122, 255, 0.3);
//   animation: pulse 2s infinite;
//
//   @keyframes pulse {
//     0%, 100% {
//       opacity: 1;
//       transform: scale(1);
//     }
//     50% {
//       opacity: 0.7;
//       transform: scale(1.05);
//     }
//   }
// `;

const InputContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  padding: 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-top: 1px solid var(--glass-border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  display: flex;
  gap: 12px;
  flex-shrink: 0; // 防止输入框被压缩
  width: 100%;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg), 0 -4px 20px rgba(0, 122, 255, 0.1);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-primary);
    opacity: 0.6;
  }
`;

// const StatusCard = styled(Card)`
//   margin-bottom: 20px;
//   background: var(--glass-bg) !important;
//   backdrop-filter: var(--blur-md) !important;
//   -webkit-backdrop-filter: var(--blur-md) !important;
//   border: 1px solid var(--glass-border) !important;
//   border-radius: var(--radius-lg) !important;
//   box-shadow: var(--shadow-lg) !important;
//   transition: all var(--duration-fast) ease;
//
//   &:hover {
//     transform: translateY(-4px);
//     box-shadow: var(--shadow-xl), 0 0 20px rgba(0, 122, 255, 0.15) !important;
//   }
//
//   .ant-card-body {
//     background: transparent !important;
//   }
// `;

// const ResumeList = styled(List)`
//   background: var(--glass-bg) !important;
//   backdrop-filter: var(--blur-md) !important;
//   -webkit-backdrop-filter: var(--blur-md) !important;
//   border: 1px solid var(--glass-border) !important;
//   border-radius: var(--radius-lg) !important;
//   padding: 20px;
//   box-shadow: var(--shadow-lg) !important;
//   transition: all var(--duration-fast) ease;
//
//   &:hover {
//     box-shadow: var(--shadow-xl) !important;
//   }
//
//   .ant-list-item {
//     border-bottom: 1px solid var(--glass-border) !important;
//     transition: all var(--duration-fast) ease;
//   
//     &:hover {
//       background: var(--glass-bg-light) !important;
//       border-radius: var(--radius-md);
//     }
//   }
// `;



// 思维链消息组件 - 重新设计为DeepSeek风格
const ThinkingMessage = ({ content, isComplete = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 将思维链内容按行分割，每行作为一个思考步骤
  const thinkingSteps = content.split('\n').filter(step => step.trim());
  
  return (
    <div className="thinking-message-deepseek">
      <div 
        className="thinking-header-deepseek"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="thinking-header-left">
          <span className="thinking-icon">🧠</span>
          <span className="thinking-title">思维链</span>
          <span className="thinking-status">
            {isComplete ? '已完成' : '思考中...'}
          </span>
        </div>
        <div className="thinking-toggle">
          {isExpanded ? '收起' : '展开'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="thinking-steps">
          {thinkingSteps.map((step, index) => (
            <div key={index} className="thinking-step">
              <div className="step-number">{index + 1}</div>
              <div className="step-content">{step}</div>
            </div>
          ))}
          {!isComplete && (
            <div className="thinking-loading">
              <LoadingOutlined spin /> 正在思考...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 正式回答组件 - 独立显示
const FinalAnswer = ({ content }) => {
  return (
    <div className="final-answer-deepseek">
      <div className="answer-header">
        <span className="answer-icon">💡</span>
        <span className="answer-title">回答</span>
      </div>
      <div className="answer-content">
        {content}
      </div>
    </div>
  );
};

// 组合消息组件 - 重新设计
const CombinedMessage = ({ thinkingContent, finalContent, isThinkingComplete = false }) => {
  return (
    <div className="combined-message-deepseek">
      {/* 思维链部分 */}
      {thinkingContent && (
        <ThinkingMessage 
          content={thinkingContent} 
          isComplete={isThinkingComplete}
        />
      )}
      
      {/* 正式回答部分 - 只有在思维链完成后才显示 */}
      {finalContent && isThinkingComplete && (
        <FinalAnswer content={finalContent} />
      )}
    </div>
  );
};

function App() {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isWaitingForCode, setIsWaitingForCode] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMenuKey, setSelectedMenuKey] = useState('1');
  const [recommendationVisible, setRecommendationVisible] = useState(false);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [recommendedResumes, setRecommendedResumes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [jdDetailVisible, setJdDetailVisible] = useState(false);
  const [currentPositionData, setCurrentPositionData] = useState(null);
  
  // 公司搜索相关状态已删除
  
  // 职位管理相关状态
  const [positionManagementVisible, setPositionManagementVisible] = useState(false);
  const [currentCompanyInfo, setCurrentCompanyInfo] = useState(null);
  
  // 公司推荐相关状态
  const [recommendedCompanies, setRecommendedCompanies] = useState([]);
  const [recommendationReport, setRecommendationReport] = useState({});
  const [companyRecommendationVisible, setCompanyRecommendationVisible] = useState(false);
  
  // 智能寻聘相关状态
  const [showSmartRecruitment, setShowSmartRecruitment] = useState(false);
  const [selectedRecruitmentPlatform, setSelectedRecruitmentPlatform] = useState(null);
  const [showBossZhipinControl, setShowBossZhipinControl] = useState(false);
  const [showZhilianControl, setShowZhilianControl] = useState(false);
  
  // 计算是否有任何弹窗显示
  const hasAnyModal = recommendationVisible || jdDetailVisible || positionManagementVisible || companyRecommendationVisible || showSmartRecruitment || showBossZhipinControl || showZhilianControl;
  
  const messagesEndRef = useRef(null);
  const messageIdCounter = useRef(0); // 用于生成唯一消息ID

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 获取岗位数据
  const fetchPositions = async () => {
    try {
      const result = await apiGet(API_ENDPOINTS.POSITIONS.LIST);
      if (result.success) {
        setPositions(result.data || []);
      } else {
        console.error('获取岗位数据失败:', result.error);
        setPositions([]);
      }
    } catch (error) {
      console.error('获取岗位数据失败:', error);
      setPositions([]);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  // 连接Socket
  useEffect(() => {
    // console.log('正在连接Socket.IO...');
    
    const newSocket = io(WEBSOCKET_CONFIG.URL, {
      transports: ['websocket', 'polling'], // 优先使用WebSocket，降级到polling
      timeout: 20000, // 减少超时时间
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS, // 使用配置的重连次数
      reconnectionDelay: WEBSOCKET_CONFIG.RECONNECT_INTERVAL, // 使用配置的重连延迟
      reconnectionDelayMax: 10000, // 增加最大重连延迟
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true
    });
    
    newSocket.on('connect', () => {
      // console.log('Socket.IO连接成功:', newSocket.id);
      setIsConnected(true);
      addMessage('AI', '您好！我是 Moirai ，请告诉我您的需求，我将为您提供专业的服务～', false);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO连接断开:', reason);
      setIsConnected(false);
      
      // 根据断开原因显示不同的提示
      if (reason === 'io server disconnect') {
        message.warning('服务器主动断开连接，正在尝试重连...');
      } else if (reason === 'transport close') {
        message.warning('网络连接中断，正在尝试重连...');
      } else if (reason === 'transport error') {
        message.error('网络传输错误，正在尝试重连...');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO连接错误:', error);
      setIsConnected(false);
      
      // 根据错误类型显示不同的提示
      if (error.message.includes('timeout')) {
        message.error('连接超时，请检查网络连接');
      } else if (error.message.includes('ECONNREFUSED')) {
        message.error('无法连接到服务器，请确认服务器已启动');
      } else {
        message.error('连接服务器失败: ' + error.message);
      }
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO重连成功，尝试次数:', attemptNumber);
      setIsConnected(true);
      message.success('重连成功！');
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket.IO重连尝试:', attemptNumber);
      if (attemptNumber <= 3) {
        message.info(`正在尝试重连... (${attemptNumber}/10)`);
      }
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket.IO重连失败:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket.IO重连失败，已达到最大尝试次数');
      setIsConnected(false);
      message.error('无法连接到服务器，请检查网络连接或刷新页面重试');
    });

    newSocket.on('statusUpdate', (data) => {
      // console.log('收到状态更新:', data);
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

    // 监听COT消息
    newSocket.on('cotMessage', (data) => {
      // console.log('收到COT消息:', data);
      addCOTMessage(
        data.thinkingProcess || '',
        data.finalAnswer || '',
        data.isComplete || false,
        data.isStreaming || false
      );
    });

    // 监听思维链消息
    newSocket.on('thinking', (data) => {
      // console.log('收到思维链消息:', data);
      // console.log('思维链数据类型:', typeof data.content);
      // console.log('思维链内容:', data.content);
      
      // 将后端的思维链格式转换为XML格式
      let thinkingSteps = [];
      let conclusion = null;
      
      if (Array.isArray(data.content)) {
        // 处理数组格式的思维链步骤
        thinkingSteps = data.content.map((step, index) => {
          // 解析后端格式：👉 分析用户需求：用户希望...
          const stepMatch = step.match(/👉\s*(.+)/);
          if (stepMatch) {
            const content = stepMatch[1].trim();
            // 根据内容选择合适的emoji
            let emoji = '💭';
            if (content.includes('分析') || content.includes('需求')) emoji = '🔍';
            else if (content.includes('思考') || content.includes('方案')) emoji = '📋';
            else if (content.includes('制定') || content.includes('执行')) emoji = '🎯';
            else if (content.includes('技术')) emoji = '🔧';
            else if (content.includes('招聘')) emoji = '📞';
            
            return { emoji, content };
          }
          return { emoji: '💭', content: step.trim() };
        });
      } else {
        // 处理单个思维链步骤
        const stepMatch = data.content.match(/👉\s*(.+)/);
        if (stepMatch) {
          const content = stepMatch[1].trim();
          let emoji = '💭';
          if (content.includes('分析') || content.includes('需求')) emoji = '🔍';
          else if (content.includes('思考') || content.includes('方案')) emoji = '📋';
          else if (content.includes('制定') || content.includes('执行')) emoji = '🎯';
          
          thinkingSteps = [{ emoji, content }];
        }
      }
      
      // 生成结论
      if (thinkingSteps.length > 0) {
        conclusion = { emoji: '🎯', content: '基于以上分析，制定相应的解决方案' };
      }
      
      // 生成XML格式的思维过程
      const thinkingProcess = createCOTResponse(thinkingSteps, conclusion, '');
      
      // 显示思维过程
      addCOTMessage(thinkingProcess, '', false, true);
    });

    // 监听AI消息
    newSocket.on('aiMessage', (data) => {
      // console.log('收到AI消息:', data);
      
      // 解析大模型的完整响应，分离思维链和最终建议
      const fullResponse = data.content;
      // console.log('完整响应内容:', fullResponse);
      
      // 分离思维链部分和最终建议部分
      const thinkingMatch = fullResponse.match(/## 思维链部分[\s\S]*?(?=## 最终建议部分|$)/);
      const finalAdviceMatch = fullResponse.match(/## 最终建议部分[\s\S]*$/);
      
      let thinkingContent = '';
      let finalAdviceContent = '';
      
      if (thinkingMatch) {
        thinkingContent = thinkingMatch[0].replace(/## 思维链部分/, '').trim();
        // console.log('提取的思维链内容:', thinkingContent);
      }
      
      if (finalAdviceMatch) {
        finalAdviceContent = finalAdviceMatch[0].replace(/## 最终建议部分/, '').trim();
        // console.log('提取的最终建议内容:', finalAdviceContent);
      }
      
      // 如果没有找到结构化内容，使用原始内容作为最终建议
      if (!finalAdviceContent) {
        finalAdviceContent = fullResponse;
        // console.log('使用原始内容作为最终建议');
      }
      
      // console.log('最终要显示的最终建议:', finalAdviceContent);
      
      // 更新COT消息，添加最终答案
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        // console.log('最后一条消息:', lastMessage);
        
        if (lastMessage && lastMessage.type === 'cot') {
          // console.log('更新COT消息，添加最终答案');
          return prev.map((msg, index) => {
            if (index === prev.length - 1) {
              return {
                ...msg,
                finalAnswer: finalAdviceContent,
                isComplete: true,
                isStreaming: false
              };
            }
            return msg;
          });
        } else {
          // console.log('创建普通消息');
          // 如果没有COT消息，创建普通消息
          return [...prev, {
            id: ++messageIdCounter.current,
            sender: 'AI',
            content: fullResponse,
            isUser: false,
            type: 'normal',
            timestamp: new Date()
          }];
        }
      });
    });

    // 监听知识库AI对话消息
    newSocket.on('knowledgeChat', (data) => {
      // console.log('收到知识库AI对话消息:', data);
      
      const aiMessage = {
        id: ++messageIdCounter.current,
        sender: 'AI',
        content: data.response,
        isUser: false,
        type: 'normal',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    });

    // 监听最终建议消息
    newSocket.on('finalAnswer', (data) => {
      // console.log('收到最终建议消息:', data);
      
      // 更新COT消息，添加最终答案
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        console.log('最后一条消息:', lastMessage);
        
        if (lastMessage && lastMessage.type === 'cot') {
          // console.log('更新COT消息，添加最终答案');
          return prev.map((msg, index) => {
            if (index === prev.length - 1) {
              return {
                ...msg,
                finalAnswer: data.content,
                isComplete: true,
                isStreaming: false
              };
            }
            return msg;
          });
        } else {
          // console.log('创建普通消息');
          // 如果没有COT消息，创建普通消息
          return [...prev, {
            id: ++messageIdCounter.current,
            sender: 'AI',
            content: data.content,
            isUser: false,
            type: 'normal',
            timestamp: new Date()
          }];
        }
      });
    });

    // 监听公司分析完成事件
    newSocket.on('companyAnalysisCompleted', (data) => {
      console.log('公司分析完成:', data);
      
      if (data.status === 'success') {
        setRecommendedCompanies(data.companies || []);
        setRecommendationReport(data.recommendationReport || {});
        setCompanyRecommendationVisible(true);
        
        addMessage('AI', `公司分析完成！共分析了 ${data.companies?.length || 0} 家公司，已为您生成智能推荐报告。`, false);
      } else {
        message.error('公司分析失败');
      }
    });

    // 公司搜索相关事件监听器已删除

    // 监听简历推荐完成
    newSocket.on('resumeRecommendationCompleted', (data) => {
      setRecommendedResumes(data.recommendations || []);
      setRecommendationReport(data.report || {});
      setRecommendationVisible(true);
    });

    newSocket.on('error', (data) => {
      console.error('收到错误:', data);
      message.error(data.message || '操作失败，请重试');
      setIsLoading(false);
      setIsWaitingForCode(false);
    });

    setSocket(newSocket);

    return () => {
      // console.log('清理Socket.IO连接');
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  // 获取简历列表
  const fetchResumes = async () => {
    try {
      const result = await apiGet(API_ENDPOINTS.RESUMES.LIST);
      // /api/resumes 直接返回数组，不需要检查 success 字段
      setResumes(Array.isArray(result) ? result : []);
    } catch (error) {
      console.error('获取简历列表失败:', error);
      message.error(`获取简历列表失败: ${error.message}`);
      setResumes([]);
    }
  };

  // 添加普通消息
  const addMessage = (sender, content, isUser = true, type = 'normal', component = null) => {
    setMessages(prev => [...prev, {
      id: ++messageIdCounter.current, // 使用递增的ID确保唯一性
      sender,
      content,
      isUser,
      type,
      component,
      timestamp: new Date()
    }]);
  };

  // 添加COT消息
  const addCOTMessage = (thinkingProcess, finalAnswer = '', isComplete = false, isStreaming = false) => {
    setMessages(prev => {
      // 检查最后一条消息是否为COT消息
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && !lastMessage.isUser && lastMessage.type === 'cot') {
        // 更新现有的COT消息
        return prev.map((msg, index) => {
          if (index === prev.length - 1) {
            return {
              ...msg,
              thinkingProcess: thinkingProcess,
              finalAnswer: finalAnswer,
              isComplete: isComplete,
              isStreaming: isStreaming
            };
          }
          return msg;
        });
      } else {
        // 创建新的COT消息
        return [...prev, {
          id: ++messageIdCounter.current,
          sender: 'AI',
          thinkingProcess: thinkingProcess,
          finalAnswer: finalAnswer,
          isUser: false,
          type: 'cot',
          isComplete: isComplete,
          isStreaming: isStreaming,
          timestamp: new Date()
        }];
      }
    });
  };

  // 添加思维链消息（保留兼容性）
  const addThinkingMessage = (sender, content) => {
    setMessages(prev => {
      // 检查最后一条消息是否为AI消息且不是用户消息
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && !lastMessage.isUser && lastMessage.sender === 'AI' && lastMessage.type === 'combined') {
        // 如果是组合消息，则将思维链内容添加到现有消息中
        return prev.map((msg, index) => {
          if (index === prev.length - 1) {
            // 更新最后一条消息，添加思维链内容
            return {
              ...msg,
              thinkingContent: msg.thinkingContent 
                ? msg.thinkingContent + '\n' + content 
                : content,
              isThinkingComplete: false // 标记思维链未完成
            };
          }
          return msg;
        });
      } else {
        // 否则创建新的组合消息
        return [...prev, {
          id: ++messageIdCounter.current,
          sender,
          content: '',
          thinkingContent: content,
          isUser: false,
          type: 'combined',
          isThinkingComplete: false, // 标记思维链未完成
          timestamp: new Date()
        }];
      }
    });
  };

  // 更新消息（用于添加正式回复到包含思维链的消息中）
  const updateMessageWithContent = (content, additionalComponent = null) => {
    setMessages(prev => {
      // 检查最后一条消息是否为组合消息类型
      const lastMessage = prev[prev.length - 1];
      if (lastMessage && lastMessage.type === 'combined') {
        // 更新最后一条消息，添加正式内容并标记思维链完成
        return prev.map((msg, index) => {
          if (index === prev.length - 1) {
            return {
              ...msg,
              content: content,
              isThinkingComplete: true, // 标记思维链已完成
              additionalComponent: additionalComponent // 添加额外组件
            };
          }
          return msg;
        });
      } else {
        // 如果最后一条消息不是组合类型，则添加新消息
        return [...prev, {
          id: ++messageIdCounter.current,
          sender: 'AI',
          content: content,
          isUser: false,
          type: 'normal',
          timestamp: new Date(),
          additionalComponent: additionalComponent // 添加额外组件
        }];
      }
    });
  };

  // 生成COT格式回复
  const generateCOTResponse = (userMessage) => {
    // 根据用户消息生成相应的COT回复
    let steps = [];
    let conclusion = null;
    let finalAnswer = '';

    // 根据消息内容选择合适的回复模板
    if (userMessage.includes('招聘') || userMessage.includes('人才') || userMessage.includes('简历')) {
      steps = [
        { emoji: '🔍', content: '分析您的招聘需求：' + userMessage },
        { emoji: '📋', content: '制定招聘策略：通过智能招聘平台进行自动化招聘' },
        { emoji: '🔎', content: '搜索合适候选人：使用智能筛选功能找到匹配的简历' },
        { emoji: '📞', content: '联系候选人：自动发送邀请消息' },
        { emoji: '📄', content: '收集简历信息：自动下载和分析简历' },
        { emoji: '✅', content: '评估候选人匹配度：基于技能和经验进行评分' }
      ];
      conclusion = { emoji: '🎯', content: '通过自动化流程提高招聘效率，减少人工筛选时间' };
      finalAnswer = '我理解您的招聘需求。建议使用智能招聘自动化系统，可以显著提升招聘效率，平均节省60%的筛选时间。您可以输入"智能寻聘"来启动自动化招聘流程。';
    } else if (userMessage.includes('技术') || userMessage.includes('开发') || userMessage.includes('编程')) {
      steps = [
        { emoji: '🔧', content: '分析技术需求：' + userMessage },
        { emoji: '⚙️', content: '设计技术方案：采用现代化的技术架构' },
        { emoji: '📊', content: '评估实现复杂度：分析技术可行性和开发周期' },
        { emoji: '🚀', content: '制定实施计划：分阶段开发，确保质量' }
      ];
      conclusion = { emoji: '🎯', content: '技术方案可行，建议采用渐进式开发策略' };
      finalAnswer = '基于您的技术需求，我建议采用现代化的技术栈和敏捷开发方法。这样可以确保项目的成功实施和长期维护。';
    } else if (userMessage.includes('问题') || userMessage.includes('困难') || userMessage.includes('解决')) {
      steps = [
        { emoji: '📝', content: '收集问题信息：' + userMessage },
        { emoji: '⚖️', content: '分析问题原因：识别根本原因和影响因素' },
        { emoji: '📊', content: '评估解决方案：分析各种解决方法的优缺点' },
        { emoji: '🎯', content: '制定解决策略：选择最优解决方案' }
      ];
      conclusion = { emoji: '🎯', content: '通过系统分析找到最佳解决方案' };
      finalAnswer = '我理解您遇到的问题。通过系统性的分析和评估，我建议采用最适合的解决方案。如果需要更详细的帮助，请告诉我具体的情况。';
    } else {
      // 通用回复
      steps = [
        { emoji: '🔍', content: '理解您的需求：' + userMessage },
        { emoji: '📋', content: '分析相关信息：收集和整理相关数据' },
        { emoji: '🎯', content: '制定解决方案：基于分析结果提供建议' }
      ];
      conclusion = { emoji: '🎯', content: '基于分析提供个性化建议' };
      finalAnswer = '我理解您的需求。基于我的分析，我建议您考虑相关的解决方案。如果您需要更具体的帮助，请提供更多详细信息。';
    }

    // 生成XML格式的COT内容
    const thinkingProcess = createCOTResponse(steps, conclusion, finalAnswer);
    
    // 提取最终答案
    const finalAnswerMatch = thinkingProcess.match(/<final_answer>([\s\S]*?)<\/final_answer>/);
    const extractedFinalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : finalAnswer;
    
    // 提取思维过程（不包含最终答案）
    const thinkingProcessOnly = thinkingProcess.replace(/<final_answer>[\s\S]*?<\/final_answer>/, '').trim();

    // 先显示思维过程
    addCOTMessage(thinkingProcessOnly, '', false, true);
    
    // 3秒后显示最终答案
    setTimeout(() => {
      addCOTMessage(thinkingProcessOnly, extractedFinalAnswer, true, false);
    }, 3000);
  };

  // 检查是否是简历查询
  const isResumeQuery = (query) => {
    // 首先检查是否是任务创建查询，如果是则排除
    if (isTaskCreationQuery(query)) {
      return false;
    }
    
    const resumeKeywords = ['简历', '候选人', '应聘者', '求职者', '人才', '面试'];
    const positionKeywords = ['产品经理', '软件工程师', '架构师', '算法工程师', '前端', '后端', '测试', '运维'];
    
    const hasResumeKeyword = resumeKeywords.some(keyword => query.includes(keyword));
    const hasPositionKeyword = positionKeywords.some(keyword => query.includes(keyword));
    
    return hasResumeKeyword || hasPositionKeyword;
  };

  // 检查是否是知识库查询
  const isKnowledgeQuery = (query) => {
    const knowledgeKeywords = ['文档', '知识', '资料', '文件', '检索', '搜索', '查询', '查找'];
    const hasKnowledgeKeyword = knowledgeKeywords.some(keyword => query.includes(keyword));
    return hasKnowledgeKeyword;
  };

  // 检查是否是任务创建查询
  const isTaskCreationQuery = (query) => {
    const taskKeywords = [
      '创建任务', '新建任务', '添加任务', '招聘任务', '任务管理',
      '开始招聘', '招聘流程', '招聘计划', '招聘项目', '创建招聘任务'
    ];
    
    // 检查是否包含任务创建的关键词
    const hasTaskKeyword = taskKeywords.some(keyword => query.includes(keyword));
    
    // 检查是否包含"创建"+"招聘"的组合
    const hasCreateRecruitment = query.includes('创建') && query.includes('招聘');
    
    // 检查是否包含"招聘"+"任务"的组合
    const hasRecruitmentTask = query.includes('招聘') && query.includes('任务');
    
    return hasTaskKeyword || hasCreateRecruitment || hasRecruitmentTask;
  };

  // 检查是否是岗位创建查询
  const isPositionCreationQuery = (query) => {
    const positionKeywords = [
      '创建岗位', '新建岗位', '添加岗位', '发布岗位', '岗位管理',
      '招聘岗位', '职位发布', '创建职位', '新建职位', '添加职位',
      '需要招聘', '招聘', '招人', '找人', '招工'
    ];
    
    // 检查是否包含岗位创建的关键词
    const hasPositionKeyword = positionKeywords.some(keyword => query.includes(keyword));
    
    // 检查是否包含"创建"+"岗位/职位"的组合
    const hasCreatePosition = query.includes('创建') && (query.includes('岗位') || query.includes('职位'));
    
    // 检查是否包含"招聘"+"岗位/职位"的组合
    const hasRecruitmentPosition = query.includes('招聘') && (query.includes('岗位') || query.includes('职位'));
    
    return hasPositionKeyword || hasCreatePosition || hasRecruitmentPosition;
  };

  // 公司搜索查询识别函数已删除

  // 获取推荐简历
  const getRecommendedResumes = async (query) => {
    try {
      // 获取所有简历
      const allResumes = await apiGet(API_ENDPOINTS.RESUME_LIBRARY);
      
      // 根据查询关键词筛选简历
      let filteredResumes = allResumes;
      
      // 检查是否包含岗位关键词
      const positionKeywords = {
        '产品经理': ['产品经理', '产品', 'pm', 'product'],
        '软件工程师': ['软件工程师', '开发工程师', '程序员', 'developer', '开发'],
        '架构师': ['架构师', '架构', 'architect'],
        '算法工程师': ['算法工程师', '算法', 'algorithm', '机器学习', 'ai']
      };
      
      // 找到匹配的岗位
      let targetPosition = null;
      for (const [position, keywords] of Object.entries(positionKeywords)) {
        if (keywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))) {
          targetPosition = position;
          break;
        }
      }
      
      // 如果找到目标岗位，筛选相关简历
      if (targetPosition) {
        filteredResumes = allResumes.filter(resume => 
          resume.position === targetPosition
        );
      }
      
      // 按评分排序，取前5个
      filteredResumes.sort((a, b) => {
        const scoreA = a.scores && a.scores.length > 0 ? a.scores[a.scores.length - 1].score : 0;
        const scoreB = b.scores && b.scores.length > 0 ? b.scores[b.scores.length - 1].score : 0;
        return scoreB - scoreA;
      });
      
      return filteredResumes.slice(0, 5);
    } catch (error) {
      console.error('获取推荐简历失败:', error);
      return [];
    }
  };

  // 处理能力卡片点击
  const handleCapabilityClick = (capability) => {
    // 特殊处理智能寻聘卡片
    if (capability.id === 'smart-recruitment') {
      setShowSmartRecruitment(true);
      return;
    }
    
    let message = '';
    
    switch (capability.id) {
      case 'resume-recommendation':
        message = '我需要简历推荐功能，请帮我推荐合适的候选人';
        break;
      case 'company-search':
        message = '公司搜索功能已删除';
        break;
      case 'knowledge-search':
        message = '我想搜索企业知识库，请帮我查找相关文档';
        break;
      case 'data-analytics':
        message = '我想查看数据分析报告，请帮我分析招聘数据';
        break;
      case 'task-management':
        message = '我想创建招聘任务，请帮我管理招聘流程';
        break;
      case 'position-creation':
        message = '我想创建一个新的岗位，请帮我生成岗位描述';
        break;
      default:
        message = `我想使用${capability.title}功能`;
    }
    
    // 自动填充输入框
    setInputValue(message);
    
    // 添加提示消息
    addMessage('AI', `您选择了"${capability.title}"功能。我已经为您准备了相应的提示信息，您可以直接发送或修改后发送。`, false);
  };

  // 发送消息
  const sendMessage = () => {
    if (!inputValue.trim() || !socket) return;

    const message = inputValue.trim();
    addMessage('用户', message, true);
    setInputValue('');

    // 移除智联招聘关键词触发逻辑，统一使用入口组件
    if (isWaitingForCode && /^\d{6}$/.test(message)) {
      // 验证码输入
      handleVerificationCode(message);
    } else if (isPositionCreationQuery(message)) {
      // 岗位创建查询 - 优先检查
      handlePositionCreationQuery(message);
    } else if (isTaskCreationQuery(message)) {
      // 任务创建查询 - 优先检查，避免被误判为简历查询
      handleTaskCreationQuery(message);
    } else if (isResumeQuery(message)) {
      // 简历查询
      handleResumeQuery(message);
    // 公司搜索功能已删除
    } else if (isKnowledgeQuery(message)) {
      // 知识库查询
      handleKnowledgeQuery(message);
    } else if (message.includes('AI') || message.includes('助手') || message.includes('对话')) {
      // 知识库AI对话
      socket.emit('knowledgeChat', { 
        query: message,
        companyId: '1'
      });
    } else {
      // 普通对话 - 调用后端大模型API
      socket.emit('userMessage', { message: message });
    }
  };

  // 处理简历查询
  const handleResumeQuery = async (query) => {
    try {
      // 获取推荐简历
      const recommendedResumes = await getRecommendedResumes(query);
      
      if (recommendedResumes.length > 0) {
        setRecommendedResumes(recommendedResumes);
        setRecommendationQuery(query);
        setRecommendationVisible(true);
        
        addMessage('AI', `我为您找到了${recommendedResumes.length}位优秀的候选人，已为您推荐评分最高的Top5。您可以在右侧查看详细的简历信息，并对候选人进行点赞或点踩操作。`, false);
      } else {
        addMessage('AI', '抱歉，没有找到符合您要求的候选人。请尝试调整查询条件或查看简历库中的其他候选人。', false);
      }
    } catch (error) {
      console.error('处理简历查询失败:', error);
      addMessage('AI', '抱歉，处理简历查询时出现错误，请稍后再试。', false);
    }
  };

  // 处理岗位创建查询
  const handlePositionCreationQuery = async (query) => {
    try {
      // 添加思维链消息
      addCOTMessage('正在分析您的岗位需求...', '', false, true);
      
      // 调用后端API创建岗位
      const result = await apiPost(API_ENDPOINTS.POSITIONS.CREATE_FROM_DIALOG, {
        userMessage: query
      });

      if (result) {
        
        if (result.success) {
          // 保存岗位数据用于JD详情显示
          setCurrentPositionData(result.position);
          
          // 更新思维链消息为完成状态，并添加JD详情按钮
          const jdDetailButton = (
            <div style={{ marginTop: 12 }}>
              <Button 
                type="primary" 
                size="small"
                onClick={() => setJdDetailVisible(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  borderRadius: '6px'
                }}
              >
                📋 查看JD详情
              </Button>
            </div>
          );
          
          updateMessageWithContent(`✅ 岗位创建成功！

**岗位信息：**
- 岗位名称：${result.position.title}
- 工作经验：${result.position.experience}年
- 学历要求：${result.position.education}
- 技能要求：${result.position.skills.join(', ')}

岗位已成功添加到简历库中，您可以开始为该岗位筛选合适的候选人。`, jdDetailButton);
          
          // 刷新岗位列表
          fetchPositions();
        } else {
          updateMessageWithContent(`❌ 岗位创建失败：${result.error || '未知错误'}`);
        }
      } else {
        updateMessageWithContent('❌ 岗位创建失败：网络请求错误');
      }
    } catch (error) {
      console.error('处理岗位创建查询失败:', error);
      updateMessageWithContent('❌ 岗位创建失败：' + error.message);
    }
  };

  // 处理知识库查询
  const handleKnowledgeQuery = async (query) => {
    try {
      const data = await apiPost(API_ENDPOINTS.KNOWLEDGE.RETRIEVE, {
        query: query,
        companyId: '1',
        limit: 5
      });

      if (data) {
        if (data.success && data.data.results.length > 0) {
          const results = data.data.results;
          
          // 使用结构化的知识检索结果组件
          const searchResultComponent = (
            <KnowledgeSearchResult 
              results={results} 
              query={query}
              onViewDocument={(documentId) => {
                // 这里可以添加查看文档的逻辑
                // console.log('查看文档:', documentId);
              }}
            />
          );
          
          // 添加包含结构化搜索结果的特殊消息
          addMessage('AI', '', false, 'knowledge-search', searchResultComponent);
        } else {
          addMessage('AI', '抱歉，在企业知识库中没有找到相关的内容。请尝试使用不同的关键词或查看文档管理中的可用文档。', false);
        }
      } else {
        throw new Error('知识库检索失败');
      }
    } catch (error) {
      console.error('处理知识库查询失败:', error);
      addMessage('AI', '抱歉，知识库检索服务暂时不可用，请稍后再试。', false);
    }
  };

  // 处理任务创建查询
  const handleTaskCreationQuery = async (query) => {
    try {
      // 解析用户输入，提取任务信息
      const taskInfo = parseTaskCreationQuery(query);
      
      if (taskInfo.isValid) {
        // 创建任务
        const result = await apiPost(API_ENDPOINTS.TASKS, taskInfo.taskData);

        if (result.success) {
          addMessage('AI', `✅ 任务创建成功！\n\n📋 任务名称：${taskInfo.taskData.title}\n🎯 目标职位：${taskInfo.taskData.position}\n📝 描述：${taskInfo.taskData.description}\n👤 负责人：${taskInfo.taskData.assignee || '未指定'}\n⏰ 截止时间：${taskInfo.taskData.deadline ? new Date(taskInfo.taskData.deadline).toLocaleDateString() : '未设置'}\n\n您可以在任务列表中查看和管理这个任务。`, false);
        } else {
          addMessage('AI', `❌ 任务创建失败：${result.message || '未知错误'}`, false);
        }
      } else {
        // 提供任务创建指导
        addMessage('AI', `📝 我来帮您创建招聘任务！\n\n请告诉我以下信息：\n1️⃣ 任务名称（例如：招聘前端开发工程师）\n2️⃣ 目标职位（例如：前端开发工程师）\n3️⃣ 任务描述（可选）\n4️⃣ 负责人（可选）\n5️⃣ 截止时间（可选，例如：7天后）\n\n您可以这样说：\n"创建一个招聘前端开发工程师的任务，负责人是张经理，7天后截止"`, false);
      }
    } catch (error) {
      console.error('处理任务创建查询失败:', error);
      addMessage('AI', '抱歉，任务创建服务暂时不可用，请稍后再试。', false);
    }
  };

  // 公司搜索查询处理函数已删除

  // 公司搜索相关处理函数已删除

  // 解析任务创建查询
  const parseTaskCreationQuery = (query) => {
    const taskInfo = {
      isValid: false,
      taskData: {
        title: '',
        position: '',
        description: '',
        status: '进行中',
        priority: '中',
        progress: 0,
        assignee: '',
        deadline: null,
        candidates: []
      }
    };

    // 提取职位信息
    const positionKeywords = {
      '前端开发工程师': ['前端', '前端开发', '前端工程师', 'react', 'vue', 'javascript', 'js'],
      '后端开发工程师': ['后端', '后端开发', '后端工程师', 'node.js', 'python', 'java', 'server'],
      '产品经理': ['产品经理', '产品', 'pm', 'product'],
      'UI设计师': ['ui设计师', 'ui设计', '设计师', '设计', 'ui'],
      '测试工程师': ['测试工程师', '测试', 'qa', 'quality'],
      '运营专员': ['运营专员', '运营', 'operation'],
      '数据分析师': ['数据分析师', '数据分析', '数据', 'analyst'],
      '算法工程师': ['算法工程师', '算法', 'algorithm', '机器学习', 'ai', 'ml']
    };

    // 查找匹配的职位
    for (const [position, keywords] of Object.entries(positionKeywords)) {
      if (keywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))) {
        taskInfo.taskData.position = position;
        break;
      }
    }

    // 如果没有找到具体职位，尝试从查询中提取
    if (!taskInfo.taskData.position) {
      // 尝试匹配"招聘XXX"的格式
      const positionMatch = query.match(/招聘\s*([^，。\s]+(?:\s+[^，。\s]+)*)/);
      if (positionMatch) {
        taskInfo.taskData.position = positionMatch[1].trim();
      }
    }

    // 提取任务名称
    if (taskInfo.taskData.position) {
      taskInfo.taskData.title = `招聘${taskInfo.taskData.position}`;
    } else {
      // 如果没有找到职位，尝试从整个查询中提取
      const titleMatch = query.match(/招聘\s*([^，。\s]+(?:\s+[^，。\s]+)*)/);
      if (titleMatch) {
        taskInfo.taskData.title = `招聘${titleMatch[1].trim()}`;
        taskInfo.taskData.position = titleMatch[1].trim();
      }
    }

    // 提取负责人
    const assigneeMatch = query.match(/负责人[是为]\s*([^，。\s]+)/);
    if (assigneeMatch) {
      taskInfo.taskData.assignee = assigneeMatch[1];
    } else {
      // 尝试其他格式：负责人XXX
      const assigneeMatch2 = query.match(/负责人\s*([^，。\s]+)/);
      if (assigneeMatch2) {
        taskInfo.taskData.assignee = assigneeMatch2[1];
      }
    }

    // 提取截止时间
    const deadlineMatch = query.match(/(\d+)\s*天后/);
    if (deadlineMatch) {
      const days = parseInt(deadlineMatch[1]);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + days);
      taskInfo.taskData.deadline = deadline.toISOString();
    }

    // 提取描述
    const descMatch = query.match(/描述[是为]\s*([^，。]+)/);
    if (descMatch) {
      taskInfo.taskData.description = descMatch[1];
    } else if (taskInfo.taskData.position) {
      taskInfo.taskData.description = `招聘${taskInfo.taskData.position}，负责相关岗位的招聘工作`;
    }

    // 验证任务信息是否完整
    taskInfo.isValid = taskInfo.taskData.title && taskInfo.taskData.position;

    return taskInfo;
  };

  // 移除了原有的handlePhoneNumber和handleStartRecruitment函数
  // 这些功能针对求职者端，现在统一通过企业端入口组件启动

  // 启动新的智能寻聘系统
  const handleStartNewRecruitment = (platform) => {
    setSelectedRecruitmentPlatform(platform);
    setShowSmartRecruitment(true);
    
    // 根据平台显示相应的提示信息
    let platformInfo = '';
    switch (platform.id) {
      case 'boss':
        platformInfo = 'Boss 直聘智能寻聘系统';
        break;
      case 'zhilian':
        platformInfo = '智联招聘智能寻聘系统';
        break;
      case 'wuyou':
        platformInfo = '前程无忧智能寻聘系统';
        break;
      default:
        platformInfo = '智能寻聘系统';
    }
    
    addMessage('AI', `已启动${platformInfo}，正在为您准备自动化招聘流程...`, false);
  };

  // 处理验证码
  const handleVerificationCode = (code) => {
    if (!socket) return;

    socket.emit('submitVerificationCode', code);
    setIsWaitingForCode(false);
  };

  // 移除了extractPhoneFromMessages函数 - 针对求职者端的功能



  return (
    <StyledLayout>
      <StyledSider width={256} collapsible={false}>
        <div style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <Title level={5} style={{ margin: 0 }}>浪潮HCM</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedMenuKey]}
          onSelect={({ key }) => setSelectedMenuKey(key)}
          style={{ borderRight: 0 }}
          items={[
            {
              key: '1',
              icon: <FileTextOutlined />,
              label: '任务列表',
            },
            {
              key: '2',
              icon: <UserOutlined />,
              label: '与Moirai对话',
            },
            {
              key: '3',
              icon: <DownloadOutlined />,
              label: '简历列表',
            },
            {
              key: '4',
              icon: <BarChartOutlined />,
              label: '数据看板',
            },
            {
              key: '5',
              icon: <BookOutlined />,
              label: '企业智库',
              children: [
                {
                  key: '5-1',
                  icon: <FolderOutlined />,
                  label: '文档管理',
                },
                {
                  key: '5-2',
                  icon: <UploadOutlined />,
                  label: '文档上传',
                },
              ],
            },
            {
              key: '6',
              icon: <GlobalOutlined />,
              label: '浏览器',
            },

          ]}
        />
      </StyledSider>
      <Layout>
        <StyledHeader hasModal={hasAnyModal}>
          <HeaderTitle level={3}>
            <RobotOutlined /> Hi,我是Moirai !
          </HeaderTitle>
        </StyledHeader>
        <StyledContent hasModal={hasAnyModal}>
          {selectedMenuKey === '1' ? (
            <TaskManagement />
          ) : selectedMenuKey === '2' ? (
            <ChatContainer>
              <CapabilityCardsWrapper>
                <CapabilityCards onCapabilityClick={handleCapabilityClick} />
              </CapabilityCardsWrapper>
              <MessagesContainer>
                {/* 修改消息渲染部分 */}
                {messages.map((msg, index) => (
                  <MessageItem key={index}>
                    <div style={{ fontSize: '20px' }}>
                      {msg.isUser ? <UserOutlined /> : <RobotOutlined />}
                    </div>
                    <MessageContent isUser={msg.isUser} isThinking={msg.type === 'thinking'}>
                      {msg.type === 'cot' ? (
                        <COTReasoning
                          thinkingProcess={msg.thinkingProcess}
                          finalAnswer={msg.finalAnswer}
                          isComplete={msg.isComplete}
                          isStreaming={msg.isStreaming}
                        />
                      ) : msg.type === 'thinking' ? (
                        <ThinkingMessage content={msg.content} isComplete={msg.isThinkingComplete} />
                      ) : msg.type === 'combined' || msg.thinkingContent ? (
                        <CombinedMessage 
                          thinkingContent={msg.thinkingContent} 
                          finalContent={msg.content} 
                          isThinkingComplete={msg.isThinkingComplete || false}
                        />
                      ) : msg.type === 'knowledge-search' ? (
                        msg.component
                      ) : (
                        <div>
                          {msg.content}
                          {msg.additionalComponent && msg.additionalComponent}
                        </div>
                      )}
                    </MessageContent>
                  </MessageItem>
                ))}
                <div ref={messagesEndRef} />
              </MessagesContainer>
              <InputContainer hasModal={hasAnyModal}>
                <Input
                  placeholder="请输入消息..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={sendMessage} // 通过Enter键发送消息
                  disabled={!isConnected || isLoading}
                  size="large"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={sendMessage}
                  disabled={!inputValue || !isConnected || isLoading}
                  size="large"
                />

              </InputContainer>
            </ChatContainer>
          ) : selectedMenuKey === '3' ? (
            <div style={{ height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
              <ResumeLibrary />
            </div>
          ) : selectedMenuKey === '4' ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <BarChartOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                <h3>数据看板</h3>
                <p>这里将显示招聘数据统计和分析图表</p>
              </div>
            </div>
          ) : selectedMenuKey === '5-1' ? (
            <KnowledgeBase selectedMenu="documents" />
          ) : selectedMenuKey === '5-2' ? (
            <KnowledgeBase selectedMenu="upload" />
          ) : selectedMenuKey === '6' ? (
            <Browser />

          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                <h3>企业知识库</h3>
                <p>这里将显示企业知识库内容</p>
              </div>
            </div>
          )}
        </StyledContent>
      </Layout>
      
      {/* 简历推荐弹窗 */}
      <ResumeRecommendationModal
        visible={recommendationVisible}
        onClose={() => setRecommendationVisible(false)}
        query={recommendationQuery}
        resumes={recommendedResumes}
        positions={positions}
      />
      
      {/* JD详情抽屉 */}
      <JDDetailDrawer
        visible={jdDetailVisible}
        onClose={() => setJdDetailVisible(false)}
        positionData={currentPositionData}
      />
      
      {/* 公司搜索相关弹窗已删除 */}
      
      {/* 职位管理弹窗 */}
      <PositionManagement
        visible={positionManagementVisible}
        onClose={() => setPositionManagementVisible(false)}
        companyInfo={currentCompanyInfo}
      />
      
      {/* 智能寻聘入口弹窗 */}
      <Modal
        title="智能寻聘系统"
        open={showSmartRecruitment}
        onCancel={() => setShowSmartRecruitment(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        destroyOnHidden
      >
        <SmartRecruitmentEntry 
          onStartRecruitment={handleStartNewRecruitment}
          onOpenBossZhipinControl={() => setShowBossZhipinControl(true)}
          onOpenZhilianControl={() => {
            setShowSmartRecruitment(false);
            setShowZhilianControl(true);
          }}
        />
      </Modal>
      
      {/* Boss 直聘控制弹窗 */}
      <Modal
        title="Boss 直聘智能寻聘控制台"
        open={showBossZhipinControl}
        onCancel={() => setShowBossZhipinControl(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        destroyOnHidden
      >
        <BossZhipinControl />
      </Modal>

      {/* 智联招聘控制弹窗 */}
      <Modal
        title="智联招聘智能寻聘控制台"
        open={showZhilianControl}
        onCancel={() => setShowZhilianControl(false)}
        footer={null}
        width={1200}
        style={{ top: 20 }}
        destroyOnHidden
      >
        <ZhilianControl />
      </Modal>
    </StyledLayout>
  );
}

export default App;

const thinkingStyles = `
  /* DeepSeek风格的思维链样式 */
  .thinking-message-deepseek {
    width: 100%;
    margin-bottom: 20px;
  }

  .thinking-header-deepseek {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: var(--glass-bg-light);
    backdrop-filter: var(--blur-md);
    -webkit-backdrop-filter: var(--blur-md);
    border: 1px solid var(--primary-blue);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    cursor: pointer;
    transition: all var(--duration-fast) ease;
    position: relative;
    overflow: hidden;
  }

  .thinking-header-deepseek::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--gradient-cyber);
    opacity: 0.1;
    pointer-events: none;
  }

  .thinking-header-deepseek:hover {
    background: var(--glass-bg);
    box-shadow: var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.2);
    transform: translateY(-2px);
  }
  
  .thinking-header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .thinking-icon {
    font-size: 16px;
  }
  
  .thinking-title {
    font-weight: 700;
    color: var(--primary-blue);
    font-size: 15px;
    text-shadow: 0 0 8px rgba(0, 122, 255, 0.3);
    position: relative;
    z-index: 1;
  }

  .thinking-status {
    font-size: 12px;
    color: var(--success-green);
    background: var(--glass-bg-light);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    border: 1px solid var(--success-green);
    box-shadow: 0 0 8px rgba(82, 196, 26, 0.2);
    position: relative;
    z-index: 1;
  }

  .thinking-toggle {
    font-size: 12px;
    color: var(--gray-600);
    padding: 6px 12px;
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    border: 1px solid var(--glass-border);
    transition: all var(--duration-fast) ease;
    position: relative;
    z-index: 1;
  }

  .thinking-toggle:hover {
    background: var(--glass-bg-light);
    color: var(--primary-blue);
    box-shadow: var(--shadow-sm);
  }
  
  .thinking-steps {
    background: var(--glass-bg);
    backdrop-filter: var(--blur-md);
    -webkit-backdrop-filter: var(--blur-md);
    border: 1px solid var(--glass-border);
    border-top: none;
    border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    padding: 20px;
    position: relative;
  }

  .thinking-steps::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.02;
    pointer-events: none;
  }

  .thinking-step {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    padding: 12px 16px;
    background: var(--glass-bg-light);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--primary-blue);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-sm);
    transition: all var(--duration-fast) ease;
    position: relative;
    z-index: 1;
  }

  .thinking-step:hover {
    transform: translateX(4px);
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.1);
    border-left-color: var(--electric-blue);
  }

  .thinking-step:last-child {
    margin-bottom: 0;
  }
  
  .step-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: var(--gradient-primary);
    color: white;
    border-radius: 50%;
    font-size: 13px;
    font-weight: 700;
    margin-right: 16px;
    flex-shrink: 0;
    box-shadow: var(--shadow-sm), 0 0 8px rgba(0, 122, 255, 0.3);
    border: 2px solid var(--glass-border);
    transition: all var(--duration-fast) ease;
  }

  .thinking-step:hover .step-number {
    transform: scale(1.1);
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.4);
  }

  .step-content {
    flex: 1;
    line-height: 1.7;
    color: var(--gray-800);
    font-size: 14px;
    font-weight: 500;
  }

  .thinking-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    color: var(--primary-blue);
    font-size: 14px;
    font-weight: 600;
    padding: 12px 16px;
    background: var(--glass-bg-light);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    border-radius: var(--radius-md);
    border-left: 4px solid var(--primary-blue);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-sm);
    animation: pulse 2s infinite;
  }
  
  /* 正式回答样式 */
  .final-answer-deepseek {
    width: 100%;
    margin-top: 20px;
    padding: 20px;
    background: var(--glass-bg);
    backdrop-filter: var(--blur-md);
    -webkit-backdrop-filter: var(--blur-md);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    position: relative;
    overflow: hidden;
  }

  .final-answer-deepseek::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.02;
    pointer-events: none;
  }

  .answer-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--glass-border);
    position: relative;
    z-index: 1;
  }

  .answer-icon {
    font-size: 18px;
    color: var(--success-green);
    filter: drop-shadow(0 0 6px rgba(82, 196, 26, 0.3));
  }

  .answer-title {
    font-weight: 700;
    color: var(--gray-900);
    font-size: 16px;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .answer-content {
    line-height: 1.7;
    color: var(--gray-800);
    font-size: 14px;
    font-weight: 500;
    white-space: pre-wrap;
    position: relative;
    z-index: 1;
  }
  
  /* 组合消息容器 */
  .combined-message-deepseek {
    width: 100%;
  }
`;

// 将思维链样式添加到文档头部
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerText = thinkingStyles;
  document.head.appendChild(styleSheet);
}