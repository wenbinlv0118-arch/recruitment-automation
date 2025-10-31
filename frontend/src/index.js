import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import './index.css';
import { applyElectronFetchBasePatch } from './utils/fetchPatch';
import { applyElectronAxiosBasePatch } from './utils/axiosPatch';

// 函数级注释：在应用启动前执行fetch补丁，确保打包环境下相对路径API可用
applyElectronFetchBasePatch();
// 函数级注释：设置axios默认baseURL，保证打包环境下axios请求可用
applyElectronAxiosBasePatch();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
);