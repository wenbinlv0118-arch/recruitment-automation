/**
 * 筛选条件配置弹窗组件
 * 用于智联招聘搜索人才功能的筛选条件配置
 */

import React, { useEffect } from 'react';
import { Modal, Form, Select, Button, Space, message } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { getFilterConfig, getDefaultFilterValues } from '../config/filterConfig';

const { Option } = Select;

/**
 * 筛选条件配置弹窗组件
 * @param {Object} props - 组件属性
 * @param {boolean} props.visible - 弹窗是否可见
 * @param {string} props.platform - 招聘平台标识
 * @param {Function} props.onConfirm - 确认配置回调
 * @param {Function} props.onCancel - 取消配置回调
 * @param {boolean} props.loading - 是否加载中
 */
const FilterConfigModal = ({
  visible,
  platform,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  
  // 获取当前平台的筛选条件配置
  const filterConfig = getFilterConfig(platform);
  const defaultValues = getDefaultFilterValues(platform);
  
  /**
   * 初始化表单数据
   */
  useEffect(() => {
    if (visible && filterConfig) {
      const initialValues = { ...defaultValues };
      form.setFieldsValue(initialValues);
    }
  }, [visible, filterConfig, defaultValues, form]);
  
  /**
   * 处理表单提交
   */
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      // 过滤掉空值
      const filteredValues = {};
      Object.keys(values).forEach(key => {
        if (values[key] && values[key] !== '') {
          filteredValues[key] = values[key];
        }
      });
      
      // 检查是否至少配置了一个筛选条件
      if (Object.keys(filteredValues).length === 0) {
        message.warning('请至少配置一个筛选条件');
        return;
      }
      
      if (onConfirm) {
        onConfirm(filteredValues);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };
  
  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    form.resetFields();
    
    if (onCancel) {
      onCancel();
    }
  };
  
  /**
   * 渲染筛选条件表单项
   * @param {string} key - 筛选条件键
   * @param {Object} config - 筛选条件配置
   */
  const renderFormItem = (key, config) => {
    if (config.type !== 'select') {
      return null;
    }
    
    return (
      <Form.Item
        key={key}
        name={key}
        label={config.label}
        rules={[
          {
            required: false,
            message: `请选择${config.label}`
          }
        ]}
      >
        <Select
          placeholder={config.placeholder || `请选择${config.label}`}
          allowClear
          disabled={loading}
        >
          {config.options.map(option => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
      </Form.Item>
    );
  };
  
  // 如果没有筛选条件配置，不渲染弹窗
  if (!filterConfig || Object.keys(filterConfig).length === 0) {
    return null;
  }
  
  return (
    <Modal
      title={
        <Space>
          <FilterOutlined />
          配置筛选条件
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          取消
        </Button>,
        <Button
          key="submit"
          type="primary"
          icon={<SearchOutlined />}
          loading={loading}
          onClick={handleSubmit}
        >
          开始搜索
        </Button>
      ]}
      width={600}
      destroyOnHidden
      maskClosable={false}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#666', margin: 0 }}>
          请配置筛选条件，系统将根据您的配置自动导航到搜索人才界面并应用筛选条件。
        </p>
      </div>
      
      <Form
        form={form}
        layout="vertical"
        initialValues={defaultValues}
      >
        {Object.entries(filterConfig)
          .filter(([, config]) => config.type === 'select')
          .map(([key, config]) => renderFormItem(key, config))
        }
      </Form>
    </Modal>
  );
};

export default FilterConfigModal;