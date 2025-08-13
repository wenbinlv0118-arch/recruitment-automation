import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Input, 
  Upload, 
  message, 
  Progress, 
  Tag, 
  Divider,
  Alert,
  Tooltip,
  Popconfirm,
  Modal
} from 'antd';
import { 
  UploadOutlined, 
  FileTextOutlined, 
  CopyOutlined, 
  ScissorOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// 样式组件
const UploadContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
`;

const PasteArea = styled.div`
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  transition: all 0.3s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #1890ff;
    background: #f0f8ff;
  }
  
  &.active {
    border-color: #52c41a;
    background: #f6ffed;
  }
`;

const ResumePreview = styled.div`
  max-height: 300px;
  overflow-y: auto;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  border: 1px solid #e8e8e8;
`;

const ResumeUploadWithPaste = ({ 
  onResumeProcessed,
  onUploadComplete,
  existingResume = null
}) => {
  const [pasteText, setPasteText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [parsedResume, setParsedResume] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('paste'); // paste, file, url

  // 处理文本粘贴
  const handleTextPaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      setPasteText(prev => prev + text);
      message.success('文本粘贴成功');
    }
  };

  // 处理拖拽粘贴
  const handleDrop = (e) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      setPasteText(prev => prev + text);
      message.success('文本拖拽成功');
    }
  };

  // 处理文件上传
  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      setPasteText(content);
      message.success('文件上传成功');
    };
    reader.readAsText(file);
    return false; // 阻止默认上传行为
  };

  // 处理URL导入
  const handleURLImport = (url) => {
    if (!url) {
      message.error('请输入有效的URL');
      return;
    }
    
    message.info('正在从URL获取内容...');
    // 这里应该调用实际的URL内容获取API
    // 目前先模拟
    setTimeout(() => {
      const mockContent = `从URL导入的简历内容示例
姓名：张三
电话：13800138000
邮箱：zhangsan@example.com
应聘职位：前端工程师
工作经验：3年
学历：本科
技能：JavaScript, React, Vue, Node.js`;
      setPasteText(mockContent);
      message.success('URL内容获取成功');
    }, 2000);
  };

  // 处理简历解析
  const handleResumeParse = async () => {
    if (!pasteText.trim()) {
      message.error('请先粘贴或输入简历内容');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // 模拟解析进度
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 解析简历内容
      const parsed = await parseResumeContent(pasteText);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      setParsedResume(parsed);
      message.success('简历解析完成');
      
      // 添加到上传历史
      const historyItem = {
        id: Date.now(),
        name: parsed.name || '未知姓名',
        content: pasteText,
        parsed: parsed,
        timestamp: new Date().toISOString(),
        method: uploadMethod
      };
      setUploadHistory(prev => [historyItem, ...prev]);
      
      if (onResumeProcessed) {
        onResumeProcessed(parsed);
      }
      
    } catch (error) {
      message.error(`简历解析失败: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  // 解析简历内容
  const parseResumeContent = async (content) => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // 提取基本信息
    const name = extractName(content);
    const phone = extractPhone(content);
    const email = extractEmail(content);
    const position = extractPosition(content);
    const experience = extractExperience(content);
    const education = extractEducation(content);
    const skills = extractSkills(content);
    
    return {
      name,
      phone,
      email,
      position,
      experience,
      education,
      skills,
      content: content,
      wordCount: content.length,
      qualityScore: calculateQualityScore(content),
      parsedAt: new Date().toISOString()
    };
  };

  // 提取姓名
  const extractName = (content) => {
    const nameMatch = content.match(/^[\u4e00-\u9fa5]{2,4}/);
    return nameMatch ? nameMatch[0] : null;
  };

  // 提取电话
  const extractPhone = (content) => {
    const phoneMatch = content.match(/1[3-9]\d{9}/);
    return phoneMatch ? phoneMatch[0] : null;
  };

  // 提取邮箱
  const extractEmail = (content) => {
    const emailMatch = content.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  };

  // 提取职位
  const extractPosition = (content) => {
    const patterns = [
      /求职意向[：:]\s*([^\n\r]+)/,
      /应聘职位[：:]\s*([^\n\r]+)/,
      /期望职位[：:]\s*([^\n\r]+)/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  // 提取工作经验
  const extractExperience = (content) => {
    const patterns = [
      /工作经验[：:]\s*([^\n\r]+)/,
      /工作年限[：:]\s*([^\n\r]+)/,
      /(\d+年工作经验)/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  // 提取教育背景
  const extractEducation = (content) => {
    const patterns = [
      /学历[：:]\s*([^\n\r]+)/,
      /教育背景[：:]\s*([^\n\r]+)/,
      /(本科|硕士|博士|大专|高中)/
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  // 提取技能
  const extractSkills = (content) => {
    const skillMatch = content.match(/技能[：:]\s*([^\n\r]+)/);
    if (skillMatch) {
      return skillMatch[1].split(/[,，、\s]+/).filter(skill => skill.trim());
    }
    return [];
  };

  // 计算质量评分
  const calculateQualityScore = (content) => {
    let score = 0;
    
    if (extractName(content)) score += 20;
    if (extractPhone(content)) score += 20;
    if (extractEmail(content)) score += 15;
    if (extractPosition(content)) score += 15;
    if (extractExperience(content)) score += 15;
    if (extractEducation(content)) score += 15;
    
    if (content.length > 200) score += 5;
    if (content.length > 500) score += 5;
    
    return Math.min(score, 100);
  };

  // 清空内容
  const clearContent = () => {
    setPasteText('');
    setParsedResume(null);
    message.success('内容已清空');
  };

  // 复制内容
  const copyContent = () => {
    if (pasteText) {
      navigator.clipboard.writeText(pasteText);
      message.success('内容已复制到剪贴板');
    }
  };

  // 下载简历
  const downloadResume = () => {
    if (parsedResume) {
      const content = `简历 - ${parsedResume.name}\n\n${pasteText}`;
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${parsedResume.name}_简历.txt`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('简历下载成功');
    }
  };

  // 处理上传完成
  const handleUploadComplete = () => {
    if (parsedResume && onUploadComplete) {
      onUploadComplete(parsedResume);
      message.success('简历上传完成');
    }
  };

  return (
    <UploadContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <FileTextOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          简历上传与文本粘贴
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          支持文本粘贴、文件上传、URL导入等多种方式
        </Text>
      </div>

      {/* 上传方式选择 */}
      <Card title="选择上传方式" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Card
              hoverable
              style={{ textAlign: 'center', cursor: 'pointer' }}
              className={uploadMethod === 'paste' ? 'active' : ''}
              onClick={() => setUploadMethod('paste')}
            >
              <FileTextOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>文本粘贴</Title>
              <Text type="secondary">直接粘贴简历文本内容</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              style={{ textAlign: 'center', cursor: 'pointer' }}
              className={uploadMethod === 'file' ? 'active' : ''}
              onClick={() => setUploadMethod('file')}
            >
              <UploadOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>文件上传</Title>
              <Text type="secondary">上传TXT、DOC等文档</Text>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              hoverable
              style={{ textAlign: 'center', cursor: 'pointer' }}
              className={uploadMethod === 'url' ? 'active' : ''}
              onClick={() => setUploadMethod('url')}
            >
              <InfoCircleOutlined style={{ fontSize: 32, color: '#722ed1', marginBottom: 16 }} />
              <Title level={4}>URL导入</Title>
              <Text type="secondary">从网页链接导入内容</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 文本粘贴区域 */}
      {uploadMethod === 'paste' && (
        <Card title="文本粘贴" style={{ marginBottom: 24 }}>
          <PasteArea
            onPaste={handleTextPaste}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={pasteText ? 'active' : ''}
          >
            {pasteText ? (
              <div>
                <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
                <Title level={4}>内容已粘贴</Title>
                <Text type="secondary">字符数: {pasteText.length}</Text>
                <br />
                <Text type="secondary">点击下方按钮开始解析</Text>
              </div>
            ) : (
              <div>
                <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                <Title level={4}>粘贴简历内容</Title>
                <Text type="secondary">支持Ctrl+V粘贴或拖拽文本</Text>
              </div>
            )}
          </PasteArea>
          
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Space size="large">
              <Button
                type="primary"
                icon={<FileTextOutlined />}
                onClick={handleResumeParse}
                disabled={!pasteText.trim() || isProcessing}
                loading={isProcessing}
              >
                开始解析
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={copyContent}
                disabled={!pasteText.trim()}
              >
                复制内容
              </Button>
              <Button
                icon={<ScissorOutlined />}
                onClick={clearContent}
                disabled={!pasteText.trim()}
              >
                清空内容
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 文件上传区域 */}
      {uploadMethod === 'file' && (
        <Card title="文件上传" style={{ marginBottom: 24 }}>
          <Upload
            beforeUpload={handleFileUpload}
            showUploadList={false}
            accept=".txt,.doc,.docx"
          >
            <PasteArea>
              <UploadOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
              <Title level={4}>点击或拖拽上传文件</Title>
              <Text type="secondary">支持TXT、DOC、DOCX格式</Text>
            </PasteArea>
          </Upload>
          
          {pasteText && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Space size="large">
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={handleResumeParse}
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  开始解析
                </Button>
                <Button
                  icon={<ScissorOutlined />}
                  onClick={clearContent}
                >
                  清空内容
                </Button>
              </Space>
            </div>
          )}
        </Card>
      )}

      {/* URL导入区域 */}
      {uploadMethod === 'url' && (
        <Card title="URL导入" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={20}>
              <Input
                placeholder="请输入简历页面URL"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                onPressEnter={() => handleURLImport(pasteText)}
              />
            </Col>
            <Col span={4}>
              <Button
                type="primary"
                onClick={() => handleURLImport(pasteText)}
                disabled={!pasteText.trim()}
              >
                导入
              </Button>
            </Col>
          </Row>
          
          {pasteText && (
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Space size="large">
                <Button
                  type="primary"
                  icon={<FileTextOutlined />}
                  onClick={handleResumeParse}
                  disabled={isProcessing}
                  loading={isProcessing}
                >
                  开始解析
                </Button>
                <Button
                  icon={<ScissorOutlined />}
                  onClick={clearContent}
                >
                  清空内容
                </Button>
              </Space>
            </div>
          )}
        </Card>
      )}

      {/* 解析进度 */}
      {isProcessing && (
        <Card title="解析进度" style={{ marginBottom: 24 }}>
          <Progress
            percent={processingProgress}
            status={processingProgress >= 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Text type="secondary">正在解析简历内容，请稍候...</Text>
        </Card>
      )}

      {/* 解析结果 */}
      {parsedResume && (
        <Card title="解析结果" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Title level={5}>基本信息</Title>
              <p><strong>姓名：</strong>{parsedResume.name || '未识别'}</p>
              <p><strong>电话：</strong>{parsedResume.phone || '未识别'}</p>
              <p><strong>邮箱：</strong>{parsedResume.email || '未识别'}</p>
              <p><strong>职位：</strong>{parsedResume.position || '未识别'}</p>
              <p><strong>经验：</strong>{parsedResume.experience || '未识别'}</p>
              <p><strong>学历：</strong>{parsedResume.education || '未识别'}</p>
            </Col>
            <Col span={12}>
              <Title level={5}>内容统计</Title>
              <p><strong>字符数：</strong>{parsedResume.wordCount}</p>
              <p><strong>质量评分：</strong>
                <Tag color={parsedResume.qualityScore >= 80 ? 'green' : parsedResume.qualityScore >= 60 ? 'orange' : 'red'}>
                  {parsedResume.qualityScore}分
                </Tag>
              </p>
              <p><strong>解析时间：</strong>{new Date(parsedResume.parsedAt).toLocaleString()}</p>
              
              {parsedResume.skills && parsedResume.skills.length > 0 && (
                <div>
                  <Text strong>技能标签：</Text>
                  <div style={{ marginTop: 8 }}>
                    {parsedResume.skills.map((skill, index) => (
                      <Tag key={index} color="blue">{skill}</Tag>
                    ))}
                  </div>
                </div>
              )}
            </Col>
          </Row>
          
          <Divider />
          
          <div style={{ textAlign: 'center' }}>
            <Space size="large">
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={handleUploadComplete}
              >
                确认上传
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setShowPreview(true)}
              >
                预览内容
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadResume}
              >
                下载简历
              </Button>
            </Space>
          </div>
        </Card>
      )}

      {/* 上传历史 */}
      {uploadHistory.length > 0 && (
        <Card title="上传历史" style={{ marginBottom: 24 }}>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {uploadHistory.map(item => (
              <Card
                key={item.id}
                size="small"
                style={{ marginBottom: 8 }}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item.name}</span>
                    <Tag color="blue">{item.method}</Tag>
                  </div>
                }
                extra={
                  <Space>
                    <Button
                      type="text"
                      icon={<EyeOutlined />}
                      size="small"
                      onClick={() => {
                        setPasteText(item.content);
                        setParsedResume(item.parsed);
                      }}
                    >
                      重新加载
                    </Button>
                    <Button
                      type="text"
                      icon={<DeleteOutlined />}
                      size="small"
                      danger
                      onClick={() => {
                        setUploadHistory(prev => prev.filter(h => h.id !== item.id));
                        message.success('历史记录已删除');
                      }}
                    >
                      删除
                    </Button>
                  </Space>
                }
              >
                <p><strong>解析时间：</strong>{new Date(item.timestamp).toLocaleString()}</p>
                <p><strong>质量评分：</strong>
                  <Tag color={item.parsed.qualityScore >= 80 ? 'green' : item.parsed.qualityScore >= 60 ? 'orange' : 'red'}>
                    {item.parsed.qualityScore}分
                  </Tag>
                </p>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* 内容预览弹窗 */}
      <Modal
        title="简历内容预览"
        open={showPreview}
        onCancel={() => setShowPreview(false)}
        footer={[
          <Button key="close" onClick={() => setShowPreview(false)}>
            关闭
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => {
              downloadResume();
              setShowPreview(false);
            }}
          >
            下载简历
          </Button>
        ]}
        width={800}
      >
        <ResumePreview>
          {pasteText}
        </ResumePreview>
      </Modal>
    </UploadContainer>
  );
};

export default ResumeUploadWithPaste;
