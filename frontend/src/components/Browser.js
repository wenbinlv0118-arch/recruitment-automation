import React, { useState } from 'react';
import styled from 'styled-components';
import { Input, Button, Space, Select, Switch, Typography } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, DesktopOutlined, GlobalOutlined } from '@ant-design/icons';

const { Text } = Typography;

/**
 * 浏览器容器样式组件
 */
const BrowserContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
`;

/**
 * 浏览器工具栏样式组件
 */
const BrowserToolbar = styled.div`
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 12px;
`;

/**
 * 浏览器内容区域样式组件
 */
const BrowserContent = styled.div`
  flex: 1;
  overflow: hidden;
`;

/**
 * 浏览器iframe样式组件
 */
const BrowserIframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
  background: white;
`;

/**
 * 模式切换区域样式组件
 */
const ModeSwitch = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f0f2f5;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
`;

/**
 * VNC连接状态指示器
 */
const VncStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: ${props => props.connected ? '#f6ffed' : '#fff2e8'};
  border: 1px solid ${props => props.connected ? '#b7eb8f' : '#ffbb96'};
  border-radius: 4px;
  font-size: 12px;
  color: ${props => props.connected ? '#52c41a' : '#fa8c16'};
`;

/**
 * 浏览器组件 - 提供嵌入式浏览器功能
 * @returns {JSX.Element} 浏览器组件
 */
const Browser = () => {
  const [currentUrl, setCurrentUrl] = useState('https://sou.zhaopin.com/');
  const [iframeKey, setIframeKey] = useState(0);
  const [isVncMode, setIsVncMode] = useState(false);
  const [vncConnected, setVncConnected] = useState(false);
  
  // VNC服务器配置
  const VNC_SERVER_URL = 'https://recruitment-vnc-browser.zeabur.app';
  const VNC_WEB_PORT = '6080';
  const vncUrl = `${VNC_SERVER_URL}:${VNC_WEB_PORT}/vnc.html?autoconnect=true&resize=scale&quality=6`;

  /**
   * 预设的常用网站列表
   */
  const presetUrls = [
    { label: '智联招聘', value: 'https://sou.zhaopin.com/' },
    { label: '前程无忧', value: 'https://www.51job.com/' },
    { label: '猎聘', value: 'https://www.liepin.com/' },
    { label: 'BOSS直聘', value: 'https://www.zhipin.com/' }
  ];

  /**
   * 处理URL变化
   * @param {string} url - 新的URL地址
   */
  const handleUrlChange = (url) => {
    setCurrentUrl(url);
  };

  /**
   * 刷新浏览器页面
   */
  const handleRefresh = () => {
    setIframeKey(prev => prev + 1);
  };

  /**
   * 返回上一页
   */
  const handleBack = () => {
    if (isVncMode) return; // VNC模式下不支持返回
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.history.back();
    }
  };

  /**
   * 切换浏览器模式（普通浏览器 / VNC远程桌面）
   * @param {boolean} vncMode - 是否切换到VNC模式
   */
  const handleModeSwitch = (vncMode) => {
    setIsVncMode(vncMode);
    setIframeKey(prev => prev + 1); // 强制重新加载iframe
    
    if (vncMode) {
      // 切换到VNC模式时，检测连接状态
      checkVncConnection();
    } else {
      setVncConnected(false);
    }
  };

  /**
   * 检测VNC服务器连接状态
   */
  const checkVncConnection = async () => {
    try {
      const response = await fetch(VNC_SERVER_URL, { 
        method: 'HEAD',
        mode: 'no-cors'
      });
      setVncConnected(true);
    } catch (error) {
      console.warn('VNC服务器连接检测失败:', error);
      setVncConnected(false);
    }
  };

  /**
   * 获取当前显示的URL
   */
  const getCurrentDisplayUrl = () => {
    return isVncMode ? vncUrl : currentUrl;
  };

  return (
    <BrowserContainer>
      <BrowserToolbar>
        <Space>
          {/* 模式切换区域 */}
          <ModeSwitch>
            <GlobalOutlined style={{ color: !isVncMode ? '#1890ff' : '#8c8c8c' }} />
            <Switch
              checked={isVncMode}
              onChange={handleModeSwitch}
              size="small"
            />
            <DesktopOutlined style={{ color: isVncMode ? '#1890ff' : '#8c8c8c' }} />
            <Text style={{ fontSize: '12px', color: '#666' }}>
              {isVncMode ? 'VNC远程桌面' : '普通浏览器'}
            </Text>
          </ModeSwitch>
          
          {/* VNC连接状态指示器 */}
          {isVncMode && (
            <VncStatus connected={vncConnected}>
              <div style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: vncConnected ? '#52c41a' : '#fa8c16' 
              }} />
              {vncConnected ? 'VNC已连接' : 'VNC连接中...'}
            </VncStatus>
          )}
          
          {/* 普通浏览器控制按钮 */}
          {!isVncMode && (
            <>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={handleBack}
                title="返回上一页"
              />
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                title="刷新页面"
              />
              <Select
                style={{ width: 150 }}
                value={currentUrl}
                onChange={handleUrlChange}
                options={presetUrls}
              />
              <Input
                style={{ width: 400 }}
                value={currentUrl}
                onChange={(e) => setCurrentUrl(e.target.value)}
                onPressEnter={() => setIframeKey(prev => prev + 1)}
                placeholder="输入网址后按回车键访问"
              />
            </>
          )}
          
          {/* VNC模式控制按钮 */}
          {isVncMode && (
            <>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={handleRefresh}
                title="重新连接VNC"
              />
              <Text style={{ fontSize: '12px', color: '#666' }}>
                远程桌面地址: {VNC_SERVER_URL}:{VNC_WEB_PORT}
              </Text>
            </>
          )}
        </Space>
      </BrowserToolbar>
      <BrowserContent>
        <BrowserIframe
          key={iframeKey}
          src={getCurrentDisplayUrl()}
          title={isVncMode ? 'VNC远程桌面' : '嵌入式浏览器'}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-downloads"
        />
      </BrowserContent>
    </BrowserContainer>
  );
};

export default Browser;