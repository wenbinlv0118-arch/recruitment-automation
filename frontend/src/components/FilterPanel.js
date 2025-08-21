/**
 * 通用筛选条件面板组件
 * 支持不同招聘网站的筛选条件动态渲染
 */

import React from 'react';
import { Card, Row, Col, Select, Switch, Space, Button, Divider } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { getFilterConfig } from '../config/filterConfig';

const { Option } = Select;

const StyledFilterPanel = styled(Card)`
  margin-bottom: 24px;
  
  .filter-row {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .filter-label {
    font-weight: 500;
    margin-bottom: 8px;
    display: block;
    color: #333;
  }
  
  .filter-actions {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f0f0f0;
  }
`;

/**
 * 筛选条件面板组件
 * @param {Object} props - 组件属性
 * @param {string} props.platform - 招聘平台标识
 * @param {Object} props.filters - 当前筛选条件值
 * @param {Function} props.onFilterChange - 筛选条件变更回调
 * @param {Function} props.onApply - 应用筛选条件回调
 * @param {Function} props.onReset - 重置筛选条件回调
 * @param {boolean} props.loading - 是否加载中
 * @param {string} props.title - 面板标题
 */
const FilterPanel = ({
  platform,
  filters = {},
  onFilterChange,
  onApply,
  onReset,
  loading = false,
  title = '筛选条件配置'
}) => {
  // 获取当前平台的筛选条件配置
  const filterConfig = getFilterConfig(platform);
  
  // 如果没有配置，不渲染组件
  if (!filterConfig || Object.keys(filterConfig).length === 0) {
    return null;
  }
  
  /**
   * 处理筛选条件变更
   * @param {string} key - 筛选条件键
   * @param {any} value - 筛选条件值
   */
  const handleFilterChange = (key, value) => {
    if (onFilterChange) {
      onFilterChange(key, value);
    }
  };
  
  /**
   * 渲染选择器类型的筛选条件
   * @param {string} key - 筛选条件键
   * @param {Object} config - 筛选条件配置
   */
  const renderSelectFilter = (key, config) => {
    return (
      <Select
        placeholder={config.placeholder}
        value={filters[key]}
        onChange={(value) => handleFilterChange(key, value)}
        style={{ width: '100%' }}
        allowClear
        disabled={loading}
      >
        {config.options.map(option => (
          <Option key={option.value} value={option.value}>
            {option.label}
          </Option>
        ))}
      </Select>
    );
  };
  
  /**
   * 渲染开关类型的筛选条件
   * @param {string} key - 筛选条件键
   * @param {Object} config - 筛选条件配置
   */
  const renderSwitchFilter = (key, config) => {
    return (
      <Space>
        <Switch
          checked={filters[key] || config.defaultValue || false}
          onChange={(checked) => handleFilterChange(key, checked)}
          disabled={loading}
        />
        <span>{config.label}</span>
      </Space>
    );
  };
  
  /**
   * 渲染单个筛选条件
   * @param {string} key - 筛选条件键
   * @param {Object} config - 筛选条件配置
   */
  const renderFilter = (key, config) => {
    switch (config.type) {
      case 'select':
        return (
          <div className="filter-row" key={key}>
            <label className="filter-label">{config.label}</label>
            {renderSelectFilter(key, config)}
          </div>
        );
      
      case 'switch':
        return (
          <div className="filter-row" key={key}>
            {renderSwitchFilter(key, config)}
          </div>
        );
      
      default:
        console.warn(`Unsupported filter type: ${config.type}`);
        return null;
    }
  };
  
  // 将筛选条件分组，每行显示2个
  const filterEntries = Object.entries(filterConfig);
  const selectFilters = filterEntries.filter(([, config]) => config.type === 'select');
  const switchFilters = filterEntries.filter(([, config]) => config.type === 'switch');
  
  // 将选择类型的筛选条件按行分组
  const selectFilterRows = [];
  for (let i = 0; i < selectFilters.length; i += 2) {
    selectFilterRows.push(selectFilters.slice(i, i + 2));
  }
  
  return (
    <StyledFilterPanel
      title={
        <Space>
          <FilterOutlined />
          {title}
        </Space>
      }
    >
      {/* 渲染选择类型的筛选条件 */}
      {selectFilterRows.map((row, rowIndex) => (
        <Row gutter={16} key={`row-${rowIndex}`}>
          {row.map(([key, config]) => (
            <Col span={12} key={key}>
              {renderFilter(key, config)}
            </Col>
          ))}
        </Row>
      ))}
      
      {/* 渲染开关类型的筛选条件 */}
      {switchFilters.length > 0 && (
        <Row>
          <Col span={24}>
            {switchFilters.map(([key, config]) => renderFilter(key, config))}
          </Col>
        </Row>
      )}
      
      {/* 操作按钮 */}
      <div className="filter-actions">
        <Space>
          <Button
            type="primary"
            onClick={onApply}
            loading={loading}
            disabled={!onApply}
          >
            应用筛选条件
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={onReset}
            disabled={loading || !onReset}
          >
            重置条件
          </Button>
        </Space>
      </div>
    </StyledFilterPanel>
  );
};

export default FilterPanel;