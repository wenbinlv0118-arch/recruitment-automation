import styled, { css } from 'styled-components';
import { Form, Input, Select, DatePicker, Upload, Checkbox, Radio, Switch, Slider } from 'antd';

// 表单容器
export const GlassForm = styled(Form)`
  .ant-form-item {
    margin-bottom: 24px;
  }
  
  .ant-form-item-label {
    padding-bottom: 8px;
    
    > label {
      color: var(--gray-800);
      font-weight: 600;
      font-size: 14px;
      
      &.ant-form-item-required::before {
        color: var(--danger-red);
      }
    }
  }
  
  .ant-form-item-explain-error {
    color: var(--danger-red);
    font-size: 12px;
    margin-top: 4px;
  }
`;

// 表单组
export const FormGroup = styled.div`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 24px;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.01;
    pointer-events: none;
  }
  
  ${props => props.title && css`
    &::after {
      content: '${props.title}';
      position: absolute;
      top: -10px;
      left: 16px;
      background: var(--glass-bg);
      padding: 0 8px;
      color: var(--gray-700);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  `}
`;

// 输入框样式
const inputStyles = css`
  background: var(--glass-bg) !important;
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-md) !important;
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) ease;
  color: var(--gray-800);
  font-weight: 500;
  
  &:hover {
    border-color: var(--primary-blue) !important;
    box-shadow: var(--shadow-md), 0 0 8px rgba(0, 122, 255, 0.1);
  }
  
  &:focus {
    background: var(--glass-bg-light) !important;
    border-color: var(--electric-blue) !important;
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.2) !important;
  }
  
  &::placeholder {
    color: var(--gray-500);
    font-weight: 400;
  }
`;

// 玻璃拟态输入框
export const StyledInput = styled(Input)`
  ${inputStyles}
`;

// 玻璃拟态密码输入框
export const StyledPasswordInput = styled(Input.Password)`
  ${inputStyles}
  
  .ant-input {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }
  
  .ant-input-suffix {
    color: var(--gray-600);
  }
`;

// 玻璃拟态文本域
export const StyledTextArea = styled(Input.TextArea)`
  ${inputStyles}
  resize: vertical;
  min-height: 100px;
`;

// 玻璃拟态选择器
export const StyledSelect = styled(Select)`
  .ant-select-selector {
    ${inputStyles}
  }
  
  &.ant-select-focused .ant-select-selector {
    background: var(--glass-bg-light) !important;
    border-color: var(--electric-blue) !important;
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.2) !important;
  }
  
  .ant-select-selection-placeholder {
    color: var(--gray-500);
    font-weight: 400;
  }
  
  .ant-select-selection-item {
    color: var(--gray-800);
    font-weight: 500;
  }
  
  .ant-select-arrow {
    color: var(--gray-600);
  }
`;

// 玻璃拟态日期选择器
export const StyledDatePicker = styled(DatePicker)`
  ${inputStyles}
  width: 100%;
  
  .ant-picker-suffix {
    color: var(--gray-600);
  }
`;

// 玻璃拟态范围日期选择器
export const StyledRangePicker = styled(DatePicker.RangePicker)`
  ${inputStyles}
  width: 100%;
  
  .ant-picker-separator {
    color: var(--gray-600);
  }
  
  .ant-picker-suffix {
    color: var(--gray-600);
  }
`;

// 玻璃拟态上传组件
export const StyledUpload = styled(Upload)`
  .ant-upload {
    background: var(--glass-bg);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    border: 2px dashed var(--glass-border);
    border-radius: var(--radius-lg);
    transition: all var(--duration-fast) ease;
    
    &:hover {
      border-color: var(--primary-blue);
      background: var(--glass-bg-light);
    }
  }
  
  .ant-upload-drag {
    background: transparent !important;
    border: none !important;
  }
  
  .ant-upload-drag-hover {
    border-color: var(--electric-blue) !important;
  }
  
  .ant-upload-drag-icon {
    color: var(--primary-blue) !important;
  }
  
  .ant-upload-text {
    color: var(--gray-800);
    font-weight: 600;
  }
  
  .ant-upload-hint {
    color: var(--gray-600);
  }
`;

// 玻璃拟态复选框
export const StyledCheckbox = styled(Checkbox)`
  .ant-checkbox {
    .ant-checkbox-inner {
      background: var(--glass-bg);
      backdrop-filter: var(--blur-sm);
      -webkit-backdrop-filter: var(--blur-sm);
      border: 1px solid var(--glass-border);
      border-radius: var(--radius-sm);
      transition: all var(--duration-fast) ease;
    }
    
    &:hover .ant-checkbox-inner {
      border-color: var(--primary-blue);
    }
    
    &.ant-checkbox-checked .ant-checkbox-inner {
      background: var(--gradient-primary);
      border-color: var(--primary-blue);
    }
  }
  
  .ant-checkbox + span {
    color: var(--gray-800);
    font-weight: 500;
  }
`;

// 玻璃拟态复选框组
export const StyledCheckboxGroup = styled(Checkbox.Group)`
  .ant-checkbox-wrapper {
    margin-bottom: 8px;
    
    .ant-checkbox {
      .ant-checkbox-inner {
        background: var(--glass-bg);
        backdrop-filter: var(--blur-sm);
        -webkit-backdrop-filter: var(--blur-sm);
        border: 1px solid var(--glass-border);
        border-radius: var(--radius-sm);
        transition: all var(--duration-fast) ease;
      }
      
      &:hover .ant-checkbox-inner {
        border-color: var(--primary-blue);
      }
      
      &.ant-checkbox-checked .ant-checkbox-inner {
        background: var(--gradient-primary);
        border-color: var(--primary-blue);
      }
    }
    
    .ant-checkbox + span {
      color: var(--gray-800);
      font-weight: 500;
    }
  }
`;

// 玻璃拟态单选框
export const StyledRadio = styled(Radio)`
  .ant-radio {
    .ant-radio-inner {
      background: var(--glass-bg);
      backdrop-filter: var(--blur-sm);
      -webkit-backdrop-filter: var(--blur-sm);
      border: 1px solid var(--glass-border);
      transition: all var(--duration-fast) ease;
    }
    
    &:hover .ant-radio-inner {
      border-color: var(--primary-blue);
    }
    
    &.ant-radio-checked .ant-radio-inner {
      border-color: var(--primary-blue);
      
      &::after {
        background: var(--primary-blue);
      }
    }
  }
  
  .ant-radio + span {
    color: var(--gray-800);
    font-weight: 500;
  }
`;

// 玻璃拟态单选框组
export const StyledRadioGroup = styled(Radio.Group)`
  .ant-radio-wrapper {
    margin-bottom: 8px;
    
    .ant-radio {
      .ant-radio-inner {
        background: var(--glass-bg);
        backdrop-filter: var(--blur-sm);
        -webkit-backdrop-filter: var(--blur-sm);
        border: 1px solid var(--glass-border);
        transition: all var(--duration-fast) ease;
      }
      
      &:hover .ant-radio-inner {
        border-color: var(--primary-blue);
      }
      
      &.ant-radio-checked .ant-radio-inner {
        border-color: var(--primary-blue);
        
        &::after {
          background: var(--primary-blue);
        }
      }
    }
    
    .ant-radio + span {
      color: var(--gray-800);
      font-weight: 500;
    }
  }
`;

// 玻璃拟态开关
export const StyledSwitch = styled(Switch)`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  
  &.ant-switch-checked {
    background: var(--gradient-primary);
    border-color: var(--primary-blue);
  }
  
  &:hover:not(.ant-switch-disabled) {
    background: var(--glass-bg-light);
  }
  
  &.ant-switch-checked:hover:not(.ant-switch-disabled) {
    background: var(--gradient-primary);
  }
  
  .ant-switch-handle {
    background: white;
    box-shadow: var(--shadow-sm);
    
    &::before {
      border-radius: 50%;
    }
  }
`;

// 玻璃拟态滑块
export const StyledSlider = styled(Slider)`
  .ant-slider-rail {
    background: var(--glass-bg);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    border: 1px solid var(--glass-border);
  }
  
  .ant-slider-track {
    background: var(--gradient-primary);
  }
  
  .ant-slider-handle {
    background: white;
    border: 2px solid var(--primary-blue);
    box-shadow: var(--shadow-md);
    
    &:hover {
      border-color: var(--electric-blue);
    }
    
    &:focus {
      border-color: var(--electric-blue);
      box-shadow: var(--shadow-lg), 0 0 8px rgba(0, 122, 255, 0.3);
    }
  }
  
  .ant-slider-dot {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
  }
  
  .ant-slider-dot-active {
    border-color: var(--primary-blue);
  }
`;

// 表单操作按钮组
export const FormActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--glass-border);
  
  @media (max-width: 768px) {
    flex-direction: column;
    
    .ant-btn {
      width: 100%;
    }
  }
`;

// 表单标题
export const FormTitle = styled.h2`
  color: var(--gray-900);
  font-weight: 700;
  font-size: 24px;
  margin-bottom: 8px;
  background: var(--gradient-text);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

// 表单描述
export const FormDescription = styled.p`
  color: var(--gray-600);
  font-size: 14px;
  margin-bottom: 32px;
  line-height: 1.6;
`;

// 字段标签
export const FieldLabel = styled.label`
  display: block;
  color: var(--gray-800);
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 8px;
  
  ${props => props.required && css`
    &::after {
      content: ' *';
      color: var(--danger-red);
    }
  `}
`;

// 字段提示
export const FieldHint = styled.div`
  color: var(--gray-500);
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.4;
`;

// 错误信息
export const ErrorMessage = styled.div`
  color: var(--danger-red);
  font-size: 12px;
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &::before {
    content: '⚠';
    font-size: 10px;
  }
`;