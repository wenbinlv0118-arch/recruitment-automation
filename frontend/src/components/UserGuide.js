import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Collapse, 
  Tag, 
  Alert, 
  Divider,
  List,
  Steps
} from 'antd';
import { 
  BookOutlined, 
  QuestionCircleOutlined,
  VideoCameraOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  StarOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Step } = Steps;

// 样式组件
const GuideContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
`;

const FeatureCard = styled(Card)`
  margin-bottom: 16px;
  border-left: 4px solid #1890ff;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
    transition: all 0.3s ease;
  }
`;

const UserGuide = () => {
  const [activeKey, setActiveKey] = useState(['1']);

  // 功能特性列表
  const features = [
    {
      title: '智能自动化',
      description: '全自动的简历采集和处理流程，无需人工干预',
      icon: <PlayCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      benefits: ['节省90%人工时间', '24小时不间断运行', '智能质量检测']
    },
    {
      title: '智能筛选',
      description: '基于AI算法的简历质量评估和智能筛选',
      icon: <StarOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      benefits: ['自动质量评分', '智能标签生成', '个性化筛选条件']
    },
    {
      title: '批量处理',
      description: '支持大规模简历的批量采集、处理和入库',
      icon: <DownloadOutlined style={{ fontSize: 24, color: '#722ed1' }} />,
      benefits: ['批量操作支持', '并发处理能力', '进度实时监控']
    },
    {
      title: '数据管理',
      description: '完整的简历数据管理和分析功能',
      icon: <FileTextOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      benefits: ['结构化数据存储', '历史记录追踪', '数据导出功能']
    }
  ];

  // 操作步骤
  const operationSteps = [
    {
      title: '系统启动',
      description: '启动智能寻聘系统',
      content: [
        '点击"启动流程"按钮',
        '系统自动打开浏览器',
        '等待浏览器初始化完成'
      ]
    },
    {
      title: '登录认证',
      description: '完成Boss直聘登录',
      content: [
        '系统自动导航到登录页面',
        '选择App扫码登录方式',
        '使用手机App扫描二维码完成登录'
      ]
    },
    {
      title: '配置筛选',
      description: '设置候选人筛选条件',
      content: [
        '配置职位、地区、工作经验等条件',
        '设置简历质量阈值',
        '选择采集策略（推荐牛人/搜索牛人/沟通版块）'
      ]
    },
    {
      title: '开始采集',
      description: '启动自动简历采集',
      content: [
        '点击"开始采集"按钮',
        '系统自动浏览候选人列表',
        '实时显示采集进度和结果'
      ]
    },
    {
      title: '质量检测',
      description: '自动检测简历质量',
      content: [
        '系统分析简历内容完整性',
        '计算质量评分',
        '自动筛选优质简历'
      ]
    },
    {
      title: '数据入库',
      description: '将优质简历存储到系统',
      content: [
        '自动收藏优质候选人',
        '解析并结构化简历数据',
        '存储到本地数据库'
      ]
    }
  ];

  // 常见问题
  const faqs = [
    {
      question: '系统支持哪些招聘平台？',
      answer: '目前支持Boss直聘平台，未来将扩展到智联招聘、前程无忧等主流招聘平台。',
      category: '平台支持'
    },
    {
      question: '如何确保简历采集的准确性？',
      answer: '系统采用多重验证机制：内容完整性检查、关键信息提取验证、质量评分算法等，确保采集数据的准确性。',
      category: '数据质量'
    },
    {
      question: '采集过程中遇到网络问题怎么办？',
      answer: '系统具备自动重试机制，网络异常时会自动等待并重试。如持续失败，会记录错误日志并通知用户。',
      category: '异常处理'
    },
    {
      question: '可以自定义简历筛选条件吗？',
      answer: '支持完全自定义筛选条件，包括职位类型、工作经验、教育背景、技能要求等，满足不同招聘需求。',
      category: '功能配置'
    },
    {
      question: '系统运行对电脑配置有什么要求？',
      answer: '建议配置：8GB以上内存、Intel i5或同等性能处理器、稳定的网络连接。系统会自动优化资源使用。',
      category: '系统要求'
    },
    {
      question: '如何导出采集到的简历数据？',
      answer: '支持多种导出格式：Excel、CSV、PDF等。可在简历管理界面选择要导出的简历，点击导出按钮即可。',
      category: '数据导出'
    }
  ];

  // 最佳实践
  const bestPractices = [
    {
      title: '筛选条件配置',
      description: '合理设置筛选条件，避免过于严格导致候选人过少',
      tips: [
        '工作经验范围建议设置为3-8年',
        '薪资范围根据公司实际情况设定',
        '技能要求不要过于具体，保持一定灵活性'
      ]
    },
    {
      title: '质量阈值设置',
      description: '根据招聘岗位要求调整简历质量阈值',
      tips: [
        '高级岗位建议设置80分以上',
        '初级岗位可适当降低到60分以上',
        '定期根据招聘效果调整阈值'
      ]
    },
    {
      title: '采集时间安排',
      description: '合理安排采集时间，避免影响正常工作',
      tips: [
        '建议在非工作时间进行大规模采集',
        '设置合理的采集间隔，避免被平台限制',
        '监控采集成功率，及时调整策略'
      ]
    },
    {
      title: '数据管理维护',
      description: '定期清理和维护简历数据库',
      tips: [
        '定期备份重要数据',
        '清理重复和过期简历',
        '更新简历标签和分类'
      ]
    }
  ];

  // 故障排除
  const troubleshooting = [
    {
      issue: '浏览器无法启动',
      solutions: [
        '检查是否安装了Chrome浏览器',
        '确认浏览器版本是否支持（建议Chrome 90+）',
        '检查系统防火墙设置',
        '重启系统后重试'
      ],
      severity: 'high'
    },
    {
      issue: '登录失败或超时',
      solutions: [
        '检查网络连接是否稳定',
        '确认Boss直聘账号状态正常',
        '尝试手动登录验证账号',
        '清除浏览器缓存后重试'
      ],
      severity: 'medium'
    },
    {
      issue: '简历采集速度慢',
      solutions: [
        '检查网络带宽是否充足',
        '调整并发请求数量设置',
        '优化筛选条件减少无效采集',
        '检查系统资源使用情况'
      ],
      severity: 'low'
    },
    {
      issue: '数据存储失败',
      solutions: [
        '检查磁盘空间是否充足',
        '确认数据库连接正常',
        '检查文件权限设置',
        '重启应用服务'
      ],
      severity: 'medium'
    }
  ];

  // 获取严重程度颜色
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'red';
      case 'medium': return 'orange';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  return (
    <GuideContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <BookOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          用户操作指南
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          详细的功能说明、操作指导、最佳实践和故障排除
        </Text>
      </div>

      {/* 功能特性概览 */}
      <Card title="功能特性概览" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {features.map((feature, index) => (
            <Col span={12} key={index} style={{ marginBottom: 16 }}>
              <FeatureCard>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                  {feature.icon}
                  <div style={{ marginLeft: 12 }}>
                    <Title level={4} style={{ margin: 0 }}>{feature.title}</Title>
                    <Text type="secondary">{feature.description}</Text>
                  </div>
                </div>
                <div>
                  {feature.benefits.map((benefit, idx) => (
                    <Tag key={idx} color="blue" style={{ marginBottom: 4 }}>
                      {benefit}
                    </Tag>
                  ))}
                </div>
              </FeatureCard>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 操作步骤指南 */}
      <Card title="操作步骤指南" style={{ marginBottom: 24 }}>
        <Steps
          direction="vertical"
          size="small"
          current={-1}
        >
          {operationSteps.map((step, index) => (
            <Step
              key={index}
              title={step.title}
              description={step.description}
              subTitle={`步骤 ${index + 1}`}
            />
          ))}
        </Steps>
        
        <Divider />
        
        <Collapse 
          activeKey={activeKey} 
          onChange={setActiveKey}
          style={{ marginTop: 16 }}
        >
          {operationSteps.map((step, index) => (
            <Panel 
              header={`${step.title} - 详细说明`} 
              key={index + 1}
            >
              <List
                dataSource={step.content}
                renderItem={(item, idx) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                      title={`${idx + 1}. ${item}`}
                    />
                  </List.Item>
                )}
              />
            </Panel>
          ))}
        </Collapse>
      </Card>

      {/* 常见问题解答 */}
      <Card title="常见问题解答 (FAQ)" style={{ marginBottom: 24 }}>
        <Collapse>
          {faqs.map((faq, index) => (
            <Panel 
              header={faq.question} 
              key={index}
              extra={<Tag color="blue">{faq.category}</Tag>}
            >
              <Paragraph>{faq.answer}</Paragraph>
            </Panel>
          ))}
        </Collapse>
      </Card>

      {/* 最佳实践 */}
      <Card title="最佳实践建议" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          {bestPractices.map((practice, index) => (
            <Col span={12} key={index} style={{ marginBottom: 16 }}>
              <Card size="small" title={practice.title}>
                <Paragraph>{practice.description}</Paragraph>
                <div>
                  <Text strong>关键提示：</Text>
                  <ul style={{ marginTop: 8 }}>
                    {practice.tips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 故障排除 */}
      <Card title="故障排除指南" style={{ marginBottom: 24 }}>
        <Alert
          message="故障排除提示"
          description="如果遇到问题，请按照以下步骤逐一排查。如问题持续存在，请联系技术支持。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {troubleshooting.map((item, index) => (
          <Card 
            key={index} 
            size="small" 
            title={
              <Space>
                <span>{item.issue}</span>
                <Tag color={getSeverityColor(item.severity)}>
                  {item.severity === 'high' ? '严重' : 
                   item.severity === 'medium' ? '中等' : '轻微'}
                </Tag>
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <div>
              <Text strong>解决方案：</Text>
              <ol style={{ marginTop: 8 }}>
                {item.solutions.map((solution, idx) => (
                  <li key={idx}>{solution}</li>
                ))}
              </ol>
            </div>
          </Card>
        ))}
      </Card>

      {/* 联系支持 */}
      <Card title="获取帮助与支持">
        <Row gutter={16}>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <QuestionCircleOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
              <Title level={4}>在线帮助</Title>
              <Text type="secondary">查看详细文档和教程</Text>
              <br />
              <Button type="primary" style={{ marginTop: 8 }}>
                查看帮助
              </Button>
            </div>
          </Col>
          
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <VideoCameraOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 16 }} />
              <Title level={4}>视频教程</Title>
              <Text type="secondary">观看操作演示视频</Text>
              <br />
              <Button type="primary" style={{ marginTop: 8 }}>
                观看教程
              </Button>
            </div>
          </Col>
          
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <FileTextOutlined style={{ fontSize: 48, color: '#722ed1', marginBottom: 16 }} />
              <Title level={4}>技术支持</Title>
              <Text type="secondary">联系技术支持团队</Text>
              <br />
              <Button type="primary" style={{ marginTop: 8 }}>
                联系支持
              </Button>
            </div>
          </Col>
        </Row>
      </Card>
    </GuideContainer>
  );
};

export default UserGuide;
