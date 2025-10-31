import React, { useEffect, useState } from 'react';
import { Card, Space, Button, Tag, Typography, message } from 'antd';

const { Title, Text } = Typography;

/**
 * 资源状态与预加载面板
 * 为什么：为用户提供常用资源（Playwright 浏览器、OCR语言）的状态展示与一键预加载入口，降低首次使用的等待与学习成本。
 */
function ResourceStatusPanel() {
  const [baseUrl, setBaseUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ playwrightChromiumInstalled: false, ocr: {} });

  /**
   * 解析后端基础地址
   * 说明：
   * - 开发模式（CRA）下走代理，使用相对路径 '/api'
   * - 生产模式（Electron）下通过 preload 暴露的端口拼接 http://127.0.0.1:PORT
   */
  async function resolveBaseUrl() {
    try {
      // Electron 环境
      if (typeof window !== 'undefined' && window.backend && typeof window.backend.getBackendInfo === 'function') {
        const info = await window.backend.getBackendInfo();
        if (info && info.port) return `http://127.0.0.1:${info.port}`;
      }
    } catch (e) {
      // 忽略解析错误，回退到相对路径
    }
    return '';
  }

  /**
   * 查询资源状态
   * 行为：调用后端 /api/resources/status，更新本地状态
   */
  async function fetchStatus() {
    setLoading(true);
    try {
      const resp = await fetch(`${baseUrl}/api/resources/status`);
      const data = await resp.json();
      if (!data.ok) throw new Error(data.error || '查询失败');
      setStatus({
        playwrightChromiumInstalled: !!data.playwrightChromiumInstalled,
        ocr: data.ocr || {},
      });
    } catch (e) {
      message.error(`资源状态查询失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  /**
   * 预加载常用资源
   * 行为：触发后端 /api/resources/preload（异步模式），预加载 Playwright 与常用 OCR 语言
   */
  async function preloadCommonResources() {
    setLoading(true);
    try {
      const body = {
        playwright: true,
        ocrLangs: ['eng', 'chi_sim'],
        async: true,
      };
      const resp = await fetch(`${baseUrl}/api/resources/preload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      if (!data.ok && !data.started) throw new Error(data.error || '预加载启动失败');
      message.success('已开始在后台预加载常用资源');
    } catch (e) {
      message.error(`预加载触发失败：${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const url = await resolveBaseUrl();
      setBaseUrl(url);
      await fetchStatus();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ocrEngOk = !!status.ocr?.eng;
  const ocrChiOk = !!status.ocr?.chi_sim;

  return (
    <div style={{ padding: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Card title={<Title level={5} style={{ margin: 0 }}>资源状态</Title>} loading={loading}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>Playwright 浏览器：</Text>{' '}
              {status.playwrightChromiumInstalled ? (
                <Tag color="green">已安装</Tag>
              ) : (
                <Tag color="red">未安装</Tag>
              )}
            </div>
            <div>
              <Text strong>OCR 语言（内置常用）：</Text>{' '}
              <Space>
                <Tag color={ocrEngOk ? 'green' : 'red'}>eng {ocrEngOk ? '✓' : '×'}</Tag>
                <Tag color={ocrChiOk ? 'green' : 'red'}>chi_sim {ocrChiOk ? '✓' : '×'}</Tag>
              </Space>
            </div>
            <Text type="secondary">说明：预加载在后台进行，不阻塞当前使用。</Text>
          </Space>
        </Card>

        <Card title={<Title level={5} style={{ margin: 0 }}>操作</Title>}>
          <Space>
            <Button onClick={fetchStatus} loading={loading}>刷新状态</Button>
            <Button type="primary" onClick={preloadCommonResources} loading={loading}>
              一键预加载常用资源
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
}

export default ResourceStatusPanel;