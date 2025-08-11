import React, { useState } from 'react';
import { Modal, Card, Tag, Button, Space, Progress, Divider, message, Tooltip } from 'antd';
import { 
  StarOutlined, 
  StarFilled, 
  HeartOutlined, 
  HeartFilled,
  EnvironmentOutlined,
  TeamOutlined,
  DollarOutlined,
  TrophyOutlined,
  LinkOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Meta } = Card;

const StyledModal = styled(Modal)`
  .ant-modal-content {
    border-radius: 12px;
    overflow: hidden;
  }
  
  .ant-modal-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-bottom: none;
    padding: 20px 24px;
  }
  
  .ant-modal-title {
    color: white;
    font-size: 18px;
    font-weight: 600;
  }
  
  .ant-modal-close {
    color: white;
  }
  
  .ant-modal-body {
    padding: 24px;
    max-height: 70vh;
    overflow-y: auto;
  }
  
  .company-card {
    margin-bottom: 16px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    transition: all 0.3s;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .ant-card-head {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      border-radius: 12px 12px 0 0;
      
      .ant-card-head-title {
        color: white;
        font-weight: 600;
      }
    }
  }
  
  .company-info {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    
    .left-info {
      flex: 1;
      
      .company-name {
        font-size: 18px;
        font-weight: 600;
        color: #333;
        margin-bottom: 8px;
      }
      
      .job-title {
        font-size: 16px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .company-details {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 12px;
        
        .detail-item {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #666;
          font-size: 14px;
        }
      }
    }
    
    .right-info {
      text-align: right;
      
      .score-section {
        margin-bottom: 12px;
        
        .score-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .score-value {
          font-size: 24px;
          font-weight: 600;
          color: #f5576c;
        }
      }
      
      .rank-badge {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
      }
    }
  }
  
  .recommendation-reason {
    background: #f8f9fa;
    padding: 12px;
    border-radius: 8px;
    margin-bottom: 16px;
    
    .reason-title {
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    
    .reason-content {
      color: #666;
      line-height: 1.6;
    }
  }
  
  .action-buttons {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .left-actions {
      display: flex;
      gap: 8px;
    }
    
    .right-actions {
      display: flex;
      gap: 8px;
    }
  }
  
  .filter-summary {
    background: #e6f7ff;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    border: 1px solid #91d5ff;
    
    .summary-title {
      font-weight: 600;
      color: #1890ff;
      margin-bottom: 12px;
    }
    
    .filter-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
  
  .no-results {
    text-align: center;
    padding: 40px 20px;
    color: #666;
    
    .no-results-icon {
      font-size: 48px;
      color: #d9d9d9;
      margin-bottom: 16px;
    }
  }
`;

const CompanyRecommendationModal = ({ 
  visible, 
  onCancel, 
  companies = [], 
  recommendations = [],
  filterConfig = {},
  loading = false,
  onCompanyClick // 新增的属性，用于传递公司点击事件
}) => {
  const [favorites, setFavorites] = useState(new Set());
  const [ratings, setRatings] = useState({});

  // 处理收藏
  const handleFavorite = (companyId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(companyId)) {
      newFavorites.delete(companyId);
      message.success('已取消收藏');
    } else {
      newFavorites.add(companyId);
      message.success('已添加到收藏');
    }
    setFavorites(newFavorites);
  };

  // 处理评分
  const handleRating = (companyId, rating) => {
    setRatings(prev => ({
      ...prev,
      [companyId]: rating
    }));
    message.success(`已评分：${rating}星`);
  };

  // 处理分享
  const handleShare = (company) => {
    const shareText = `推荐公司：${company.name} - ${company.jobTitle}`;
    if (navigator.share) {
      navigator.share({
        title: '公司推荐',
        text: shareText,
        url: company.link || window.location.href
      });
    } else {
      navigator.clipboard.writeText(shareText);
      message.success('推荐信息已复制到剪贴板');
    }
  };

  // 处理查看详情
  const handleViewDetails = (company) => {
    if (company.link) {
      window.open(company.link, '_blank');
    } else {
      message.info('暂无详细信息');
    }
  };

  // 处理查看职位
  const handleViewPositions = (company) => {
    // 触发父组件的职位查看事件
    if (onCompanyClick) {
      onCompanyClick(company);
    }
  };

  // 渲染筛选条件摘要
  const renderFilterSummary = () => {
    if (!filterConfig || Object.keys(filterConfig).length === 0) return null;

    const activeFilters = Object.entries(filterConfig)
      .filter(([key, value]) => value && value.length > 0)
      .map(([key, value]) => ({ key, value }));

    if (activeFilters.length === 0) return null;

    const getFilterLabel = (key) => {
      const labels = {
        'industry': '行业',
        'location': '地区',
        'companySize': '公司规模',
        'salaryRange': '薪资范围',
        'experience': '经验要求'
      };
      return labels[key] || key;
    };

    const getFilterValue = (value) => {
      if (Array.isArray(value)) {
        return value.join('、');
      }
      return value;
    };

    return (
      <div className="filter-summary" style={{ 
        background: '#f8f9fa', 
        padding: '16px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #e9ecef'
      }}>
        <div className="summary-title" style={{ 
          fontSize: '16px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: '#495057'
        }}>
          🎯 当前筛选条件
        </div>
        <div className="filter-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {activeFilters.map(({ key, value }) => (
            <Tag key={key} color="blue" style={{ 
              fontSize: '13px',
              padding: '4px 8px',
              borderRadius: '6px'
            }}>
              <strong>{getFilterLabel(key)}</strong>: {getFilterValue(value)}
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  // 渲染公司卡片
  const renderCompanyCard = (company, index) => {
    const isFavorite = favorites.has(company.id || index);
    const currentRating = ratings[company.id || index] || 0;
    const recommendation = recommendations.find(r => r.name === company.name) || {};

    return (
      <Card key={index} className="company-card">
        <div className="company-info">
          <div className="left-info">
            <div className="company-name">{company.name}</div>
            <div className="job-title">{company.jobTitle}</div>
            <div className="company-details">
              {company.size && (
                <span className="detail-item">
                  <TeamOutlined />
                  {company.size}
                </span>
              )}
              {company.location && (
                <span className="detail-item">
                  <EnvironmentOutlined />
                  {company.location}
                </span>
              )}
              {company.salary && (
                <span className="detail-item">
                  <DollarOutlined />
                  {company.salary}
                </span>
              )}
              {company.industry && (
                <span className="detail-item">
                  <TrophyOutlined />
                  {company.industry}
                </span>
              )}
            </div>
            {company.description && (
              <div className="company-description" style={{ 
                fontSize: '13px', 
                color: '#666', 
                marginTop: '8px',
                lineHeight: '1.4'
              }}>
                {company.description}
              </div>
            )}
          </div>
          <div className="right-info">
            <div className="score-section">
              <div className="score-label">推荐指数</div>
              <div className="score-value">{recommendation.score || (100 - index * 5)}</div>
            </div>
            <div className="rank-badge">第{recommendation.rank || (index + 1)}名</div>
          </div>
        </div>

        {recommendation.reason && (
          <div className="recommendation-reason" style={{ 
            background: '#f0f8ff', 
            padding: '12px', 
            borderRadius: '6px', 
            marginBottom: '16px',
            border: '1px solid #d6e4ff'
          }}>
            <div className="reason-title" style={{ 
              fontSize: '14px', 
              fontWeight: '600', 
              marginBottom: '6px',
              color: '#1890ff'
            }}>
              🤖 AI推荐理由
            </div>
            <div className="reason-content" style={{ 
              fontSize: '13px', 
              color: '#333',
              lineHeight: '1.4'
            }}>
              {recommendation.reason}
            </div>
          </div>
        )}

        <div className="action-buttons" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginTop: '16px'
        }}>
          <div className="left-actions" style={{ display: 'flex', gap: '8px' }}>
            <Button
              type={isFavorite ? "primary" : "default"}
              icon={isFavorite ? <HeartFilled /> : <HeartOutlined />}
              onClick={() => handleFavorite(company.id || index)}
              size="small"
            >
              {isFavorite ? '已收藏' : '收藏'}
            </Button>
            <Tooltip title="评分">
              <Space size="small">
                {[1, 2, 3, 4, 5].map(star => (
                  <Button
                    key={star}
                    type="text"
                    size="small"
                    icon={star <= currentRating ? <StarFilled /> : <StarOutlined />}
                    onClick={() => handleRating(company.id || index, star)}
                    style={{ 
                      color: star <= currentRating ? '#faad14' : '#d9d9d9',
                      padding: '2px 4px'
                    }}
                  />
                ))}
              </Space>
            </Tooltip>
          </div>
          <div className="right-actions" style={{ display: 'flex', gap: '8px' }}>
            {company.link && (
              <Button
                icon={<LinkOutlined />}
                onClick={() => handleViewDetails(company)}
                size="small"
              >
                查看详情
              </Button>
            )}
            <Button
              icon={<ShareAltOutlined />}
              onClick={() => handleShare(company)}
              size="small"
            >
              分享
            </Button>
            <Button
              icon={<TeamOutlined />}
              onClick={() => handleViewPositions(company)}
              size="small"
            >
              查看职位
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <StyledModal
      title="AI智能公司推荐"
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={900}
      destroyOnHidden
    >
      {renderFilterSummary()}
      
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div>正在分析公司信息...</div>
          <Progress percent={75} status="active" />
        </div>
      ) : companies.length > 0 ? (
        <div>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <TrophyOutlined style={{ fontSize: '24px', color: '#faad14', marginRight: '8px' }} />
            <span style={{ fontSize: '16px', fontWeight: '600' }}>
              为您找到 {companies.length} 家匹配的公司
            </span>
          </div>
          
          {companies.map((company, index) => renderCompanyCard(company, index))}
        </div>
      ) : (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <div>暂无匹配的公司</div>
          <div style={{ fontSize: '14px', marginTop: '8px' }}>
            请尝试调整筛选条件或稍后再试
          </div>
        </div>
      )}
    </StyledModal>
  );
};

export default CompanyRecommendationModal;
