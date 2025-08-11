import React, { useState } from 'react';
import styled from 'styled-components';
import { Input, Button, Space, Select } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';

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
 * 浏览器组件 - 提供嵌入式浏览器功能
 * @returns {JSX.Element} 浏览器组件
 */
const Browser = () => {
  const [currentUrl, setCurrentUrl] = useState('https://sou.zhaopin.com/');
  const [iframeKey, setIframeKey] = useState(0);

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
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.history.back();
    }
  };

  return (
    <BrowserContainer>
      <BrowserToolbar>
        <Space>
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
        </Space>
      </BrowserToolbar>
      <BrowserContent>
        <BrowserIframe
          key={iframeKey}
          src={currentUrl}
          title="嵌入式浏览器"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </BrowserContent>
    </BrowserContainer>
  );
};

export default Browser;