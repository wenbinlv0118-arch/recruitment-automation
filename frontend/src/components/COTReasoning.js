import React, { useState, useEffect } from 'react';
import { LoadingOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import styled from 'styled-components';

// 样式组件 - DeepSeek风格
const COTContainer = styled.div`
  margin: 16px 0;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(30, 58, 138, 0.1);
  background: white;
  border: 1px solid #e5e7eb;
`;

const UnifiedContent = styled.div`
  padding: 20px;
`;

const ThinkingSection = styled.div`
  margin-bottom: 20px;
`;

const ThinkingHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #1890ff;
  font-size: 14px;
`;

const ThinkingIcon = styled.span`
  font-size: 16px;
`;

const ThinkingTitle = styled.span`
  font-size: 14px;
`;

const ThinkingContent = styled.div`
  background: #f0f7ff;
  border-radius: 8px;
  padding: 16px;
  border-left: 3px solid #1890ff;
`;

const StepContainer = styled.div`
  margin-bottom: 12px;
  padding: 8px 12px;
  background: white;
  border-radius: 6px;
  border-left: 2px solid #1890ff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
`;

const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
`;

const StepNumber = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
`;

const StepIcon = styled.span`
  font-size: 14px;
`;

const StepContent = styled.div`
  color: #666;
  line-height: 1.5;
  margin-left: 26px;
  font-size: 12px;
`;

const Divider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 20px 0;
`;

const FinalAnswerSection = styled.div`
  margin-top: 20px;
`;

const FinalAnswerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-weight: 600;
  color: #1890ff;
  font-size: 16px;
`;

const FinalAnswerIcon = styled.span`
  font-size: 18px;
`;

const FinalAnswerTitle = styled.span`
  font-size: 16px;
`;

const FinalAnswerContent = styled.div`
  color: #333;
  line-height: 1.6;
  font-size: 14px;
`;

const StructuredContent = styled.div`
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e7eb;
`;

const SectionTitle = styled.div`
  font-weight: 600;
  color: #1890ff;
  margin-bottom: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SectionContent = styled.div`
  color: #333;
  line-height: 1.6;
  font-size: 13px;
  margin-left: 20px;
`;

const ListItem = styled.div`
  margin-bottom: 4px;
  padding-left: 8px;
`;

const LoadingStep = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1890ff;
  font-style: italic;
  margin-top: 8px;
  font-size: 12px;
`;

// 图标映射
const stepIcons = {
  'analysis': '🔍',
  'search': '🔎',
  'process': '⚙️',
  'evaluate': '📊',
  'compare': '⚖️',
  'decide': '🎯',
  'execute': '🚀',
  'verify': '✅',
  'default': '💭'
};

// COT推理组件
const COTReasoning = ({ 
  thinkingProcess, 
  finalAnswer, 
  isComplete = false, 
  isStreaming = false 
}) => {
  const [parsedSteps, setParsedSteps] = useState([]);
  const [parsedConclusion, setParsedConclusion] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [isThinkingExpanded, setIsThinkingExpanded] = useState(true); // 思维链默认展开

  // 解析XML格式的思维过程
  useEffect(() => {
    if (thinkingProcess) {
      try {
        // 简单的XML解析（实际项目中建议使用DOMParser）
        const parseXML = (xmlString) => {
          const steps = [];
          let conclusion = '';
          
          // 提取步骤
          const stepMatches = xmlString.match(/<step sequence="(\d+)">([\s\S]*?)<\/step>/g);
          if (stepMatches) {
            stepMatches.forEach((match, index) => {
              const sequenceMatch = match.match(/sequence="(\d+)"/);
              const contentMatch = match.match(/<step sequence="\d+">([\s\S]*?)<\/step>/);
              
              if (sequenceMatch && contentMatch) {
                const sequence = parseInt(sequenceMatch[1]);
                const content = contentMatch[1].trim();
                
                // 提取emoji和文本
                const emojiMatch = content.match(/^([^\s]+)\s+(.+)$/);
                const emoji = emojiMatch ? emojiMatch[1] : '💭';
                const text = emojiMatch ? emojiMatch[2] : content;
                
                steps.push({
                  sequence,
                  emoji,
                  content: text,
                  isComplete: isComplete || index < currentStep
                });
              }
            });
          }
          
          // 提取结论
          const conclusionMatch = xmlString.match(/<conclusion>([\s\S]*?)<\/conclusion>/);
          if (conclusionMatch) {
            const content = conclusionMatch[1].trim();
            const emojiMatch = content.match(/^([^\s]+)\s+(.+)$/);
            const emoji = emojiMatch ? emojiMatch[1] : '🎯';
            const text = emojiMatch ? emojiMatch[2] : content;
            conclusion = { emoji, content: text };
          }
          
          return { steps, conclusion };
        };
        
        const parsed = parseXML(thinkingProcess);
        setParsedSteps(parsed.steps.sort((a, b) => a.sequence - b.sequence));
        setParsedConclusion(parsed.conclusion);
        
      } catch (error) {
        console.error('解析COT XML失败:', error);
        // 降级处理：按行分割
        const lines = thinkingProcess.split('\n').filter(line => line.trim());
        const steps = lines.map((line, index) => ({
          sequence: index + 1,
          emoji: '💭',
          content: line.trim(),
          isComplete: isComplete
        }));
        setParsedSteps(steps);
      }
    }
  }, [thinkingProcess, isComplete, currentStep]);

  // 模拟流式显示效果
  useEffect(() => {
    if (isStreaming && !isComplete) {
      const timer = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < parsedSteps.length) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isStreaming, isComplete, parsedSteps.length]);

  // 解析结构化内容
  const parseStructuredContent = (content) => {
    const sections = [];
    const lines = content.split('\n');
    let currentSection = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      
      // 匹配标题行 (### 📋 需求分析)
      const titleMatch = trimmedLine.match(/^###\s*([^\s]+)\s+(.+)$/);
      if (titleMatch) {
        if (currentSection) {
          sections.push(currentSection);
        }
        currentSection = {
          icon: titleMatch[1],
          title: titleMatch[2],
          content: []
        };
      } else if (currentSection) {
        // 添加内容到当前section
        if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
          currentSection.content.push({
            type: 'list',
            text: trimmedLine.substring(1).trim()
          });
        } else if (/^\d+\./.test(trimmedLine)) {
          currentSection.content.push({
            type: 'list',
            text: trimmedLine.replace(/^\d+\.\s*/, '').trim()
          });
        } else {
          currentSection.content.push({
            type: 'text',
            text: trimmedLine
          });
        }
      }
    }
    
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return sections;
  };

  const structuredSections = parseStructuredContent(finalAnswer);

  return (
    <COTContainer>
      <UnifiedContent>
        {/* 思维链部分 */}
        <ThinkingSection>
          <ThinkingHeader 
            onClick={() => setIsThinkingExpanded(!isThinkingExpanded)}
            style={{ cursor: 'pointer' }}
          >
            <ThinkingIcon>🧠</ThinkingIcon>
            <ThinkingTitle>推理过程</ThinkingTitle>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#666' }}>
              {isThinkingExpanded ? '收起' : '展开'}
            </div>
          </ThinkingHeader>
          
          {isThinkingExpanded && (
            <ThinkingContent>
              {/* 推理步骤 */}
              {parsedSteps.map((step, index) => (
                <StepContainer key={step.sequence}>
                  <StepHeader>
                    <StepNumber>{step.sequence}</StepNumber>
                    <StepIcon>{step.emoji}</StepIcon>
                  </StepHeader>
                  <StepContent>
                    {step.content}
                  </StepContent>
                  {!step.isComplete && index === currentStep && (
                    <LoadingStep>
                      <LoadingOutlined spin />
                      正在思考...
                    </LoadingStep>
                  )}
                </StepContainer>
              ))}
              
              {/* 推理结论 */}
              {parsedConclusion && (
                <div style={{ marginTop: '12px', padding: '8px 12px', background: '#f6ffed', borderRadius: '6px', borderLeft: '2px solid #52c41a' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <span>{parsedConclusion.emoji}</span>
                    <span style={{ fontWeight: 600, color: '#52c41a', fontSize: '12px' }}>推理总结</span>
                  </div>
                  <div style={{ color: '#666', fontSize: '12px', marginLeft: '20px' }}>
                    {parsedConclusion.content}
                  </div>
                </div>
              )}
            </ThinkingContent>
          )}
        </ThinkingSection>
        
        {/* 分隔线 */}
        {finalAnswer && isComplete && <Divider />}
        
        {/* 最终答案部分 */}
        {finalAnswer && isComplete && (
          <FinalAnswerSection>
            <FinalAnswerHeader>
              <FinalAnswerIcon>💡</FinalAnswerIcon>
              <FinalAnswerTitle>最终建议</FinalAnswerTitle>
            </FinalAnswerHeader>
            
            {structuredSections.length > 0 ? (
              <StructuredContent>
                {structuredSections.map((section, index) => (
                  <div key={index} style={{ marginBottom: '16px' }}>
                    <SectionTitle>
                      <span>{section.icon}</span>
                      <span>{section.title}</span>
                    </SectionTitle>
                    <SectionContent>
                      {section.content.map((item, itemIndex) => (
                        <ListItem key={itemIndex}>
                          {item.type === 'list' ? `• ${item.text}` : item.text}
                        </ListItem>
                      ))}
                    </SectionContent>
                  </div>
                ))}
              </StructuredContent>
            ) : (
              <FinalAnswerContent>
                {finalAnswer}
              </FinalAnswerContent>
            )}
          </FinalAnswerSection>
        )}
      </UnifiedContent>
    </COTContainer>
  );
};

export default COTReasoning; 