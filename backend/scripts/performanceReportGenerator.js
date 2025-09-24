/**
 * 性能报告生成器
 * 输出详细的CDP与VNC性能对比分析结果
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../src/utils/logger');

class PerformanceReportGenerator {
  constructor() {
    this.reportTemplates = {
      html: this.generateHTMLTemplate(),
      markdown: this.generateMarkdownTemplate(),
      json: this.generateJSONTemplate()
    };
  }

  /**
   * 生成完整的性能对比报告
   * @param {Object} cdpResults - CDP测试结果
   * @param {Object} vncResults - VNC测试结果
   * @param {Object} options - 报告选项
   * @returns {Promise<Object>} 生成的报告信息
   */
  async generateComparisonReport(cdpResults, vncResults, options = {}) {
    const {
      format = 'html',
      outputDir = './reports',
      includeCharts = true,
      includeRawData = false,
      customTitle = 'CDP vs VNC 性能对比报告'
    } = options;

    logger.info('开始生成性能对比报告', { format, outputDir });

    try {
      // 确保输出目录存在
      await this.ensureDirectoryExists(outputDir);

      // 分析和对比数据
      const analysis = this.analyzePerformanceData(cdpResults, vncResults);
      
      // 生成报告内容
      const reportContent = await this.generateReportContent(analysis, format, {
        includeCharts,
        includeRawData,
        customTitle
      });

      // 保存报告文件
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `performance-report-${timestamp}.${format}`;
      const filePath = path.join(outputDir, fileName);
      
      await fs.writeFile(filePath, reportContent, 'utf8');

      // 生成摘要报告
      const summaryPath = path.join(outputDir, `summary-${timestamp}.json`);
      await fs.writeFile(summaryPath, JSON.stringify(analysis.summary, null, 2), 'utf8');

      logger.info('性能报告生成完成', { 
        reportPath: filePath,
        summaryPath,
        format
      });

      return {
        success: true,
        reportPath: filePath,
        summaryPath,
        analysis,
        timestamp
      };

    } catch (error) {
      logger.error('生成性能报告失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 分析性能数据
   * @param {Object} cdpResults - CDP测试结果
   * @param {Object} vncResults - VNC测试结果
   * @returns {Object} 分析结果
   */
  analyzePerformanceData(cdpResults, vncResults) {
    const analysis = {
      timestamp: Date.now(),
      summary: {},
      detailed: {},
      comparisons: {},
      recommendations: []
    };

    // 延迟对比分析
    analysis.detailed.latency = this.analyzeLatency(cdpResults, vncResults);
    analysis.comparisons.latency = this.calculateImprovement(
      vncResults.metrics?.latency?.average || 0,
      cdpResults.metrics?.latency?.average || 0
    );

    // 帧率对比分析
    analysis.detailed.frameRate = this.analyzeFrameRate(cdpResults, vncResults);
    analysis.comparisons.frameRate = this.calculateImprovement(
      vncResults.metrics?.frameRate?.average || 0,
      cdpResults.metrics?.frameRate?.average || 0
    );

    // 内存使用对比分析
    analysis.detailed.memory = this.analyzeMemoryUsage(cdpResults, vncResults);
    analysis.comparisons.memory = this.calculateImprovement(
      vncResults.metrics?.memory?.average || 0,
      cdpResults.metrics?.memory?.average || 0,
      'lower' // 内存使用越低越好
    );

    // CPU使用对比分析
    analysis.detailed.cpu = this.analyzeCPUUsage(cdpResults, vncResults);
    analysis.comparisons.cpu = this.calculateImprovement(
      vncResults.metrics?.cpu?.average || 0,
      cdpResults.metrics?.cpu?.average || 0,
      'lower'
    );

    // 带宽使用对比分析
    analysis.detailed.bandwidth = this.analyzeBandwidth(cdpResults, vncResults);
    analysis.comparisons.bandwidth = this.calculateImprovement(
      vncResults.metrics?.bandwidth?.average || 0,
      cdpResults.metrics?.bandwidth?.average || 0
    );

    // 网络请求对比分析
    analysis.detailed.network = this.analyzeNetworkRequests(cdpResults, vncResults);
    analysis.comparisons.network = this.calculateImprovement(
      vncResults.metrics?.network?.average || 0,
      cdpResults.metrics?.network?.average || 0,
      'lower'
    );

    // 生成总体摘要
    analysis.summary = this.generateSummary(analysis.comparisons);

    // 生成建议
    analysis.recommendations = this.generateRecommendations(analysis);

    return analysis;
  }

  /**
   * 分析延迟数据
   * @param {Object} cdpResults - CDP结果
   * @param {Object} vncResults - VNC结果
   * @returns {Object} 延迟分析结果
   */
  analyzeLatency(cdpResults, vncResults) {
    return {
      cdp: {
        average: cdpResults.metrics?.latency?.average || 0,
        p95: cdpResults.metrics?.latency?.p95 || 0,
        p99: cdpResults.metrics?.latency?.p99 || 0,
        min: cdpResults.metrics?.latency?.min || 0,
        max: cdpResults.metrics?.latency?.max || 0
      },
      vnc: {
        average: vncResults.metrics?.latency?.average || 0,
        p95: vncResults.metrics?.latency?.p95 || 0,
        p99: vncResults.metrics?.latency?.p99 || 0,
        min: vncResults.metrics?.latency?.min || 0,
        max: vncResults.metrics?.latency?.max || 0
      },
      analysis: {
        cdpFaster: (cdpResults.metrics?.latency?.average || 0) < (vncResults.metrics?.latency?.average || 0),
        improvementPercent: this.calculateImprovement(
          vncResults.metrics?.latency?.average || 0,
          cdpResults.metrics?.latency?.average || 0
        ).percent,
        consistencyComparison: this.compareConsistency(
          cdpResults.metrics?.latency,
          vncResults.metrics?.latency
        )
      }
    };
  }

  /**
   * 分析帧率数据
   * @param {Object} cdpResults - CDP结果
   * @param {Object} vncResults - VNC结果
   * @returns {Object} 帧率分析结果
   */
  analyzeFrameRate(cdpResults, vncResults) {
    return {
      cdp: {
        average: cdpResults.metrics?.frameRate?.average || 0,
        min: cdpResults.metrics?.frameRate?.min || 0,
        max: cdpResults.metrics?.frameRate?.max || 0,
        stability: this.calculateStability(cdpResults.metrics?.frameRate)
      },
      vnc: {
        average: vncResults.metrics?.frameRate?.average || 0,
        min: vncResults.metrics?.frameRate?.min || 0,
        max: vncResults.metrics?.frameRate?.max || 0,
        stability: this.calculateStability(vncResults.metrics?.frameRate)
      },
      analysis: {
        cdpSmoother: (cdpResults.metrics?.frameRate?.average || 0) > (vncResults.metrics?.frameRate?.average || 0),
        frameRateImprovement: this.calculateImprovement(
          vncResults.metrics?.frameRate?.average || 0,
          cdpResults.metrics?.frameRate?.average || 0
        ).percent
      }
    };
  }

  /**
   * 分析内存使用
   * @param {Object} cdpResults - CDP结果
   * @param {Object} vncResults - VNC结果
   * @returns {Object} 内存分析结果
   */
  analyzeMemoryUsage(cdpResults, vncResults) {
    return {
      cdp: {
        average: cdpResults.metrics?.memory?.average || 0,
        peak: cdpResults.metrics?.memory?.max || 0,
        growth: this.calculateMemoryGrowth(cdpResults.metrics?.memory)
      },
      vnc: {
        average: vncResults.metrics?.memory?.average || 0,
        peak: vncResults.metrics?.memory?.max || 0,
        growth: this.calculateMemoryGrowth(vncResults.metrics?.memory)
      },
      analysis: {
        cdpMoreEfficient: (cdpResults.metrics?.memory?.average || 0) < (vncResults.metrics?.memory?.average || 0),
        memoryReduction: this.calculateImprovement(
          vncResults.metrics?.memory?.average || 0,
          cdpResults.metrics?.memory?.average || 0,
          'lower'
        ).percent
      }
    };
  }

  /**
   * 分析CPU使用
   * @param {Object} cdpResults - CDP结果
   * @param {Object} vncResults - VNC结果
   * @returns {Object} CPU分析结果
   */
  analyzeCPUUsage(cdpResults, vncResults) {
    return {
      cdp: {
        average: cdpResults.metrics?.cpu?.average || 0,
        peak: cdpResults.metrics?.cpu?.max || 0
      },
      vnc: {
        average: vncResults.metrics?.cpu?.average || 0,
        peak: vncResults.metrics?.cpu?.max || 0
      },
      analysis: {
        cdpMoreEfficient: (cdpResults.metrics?.cpu?.average || 0) < (vncResults.metrics?.cpu?.average || 0),
        cpuReduction: this.calculateImprovement(
          vncResults.metrics?.cpu?.average || 0,
          cdpResults.metrics?.cpu?.average || 0,
          'lower'
        ).percent
      }
    };
  }

  /**
   * 分析带宽使用
   * @param {Object} cdpResults - CDP结果
   * @param {Object} vncResults - VNC结果
   * @returns {Object} 带宽分析结果
   */
  analyzeBandwidth(cdpResults, vncResults) {
    return {
      cdp: {
        average: cdpResults.metrics?.bandwidth?.average || 0,
        total: cdpResults.metrics?.bandwidth?.sum || 0
      },
      vnc: {
        average: vncResults.metrics?.bandwidth?.average || 0,
        total: vncResults.metrics?.bandwidth?.sum || 0
      },
      analysis: {
        cdpMoreEfficient: (cdpResults.metrics?.bandwidth?.average || 0) > (vncResults.metrics?.bandwidth?.average || 0),
        bandwidthImprovement: this.calculateImprovement(
          vncResults.metrics?.bandwidth?.average || 0,
          cdpResults.metrics?.bandwidth?.average || 0
        ).percent
      }
    };
  }

  /**
   * 分析网络请求
   * @param {Object} cdpResults - CDP结果
   * @param {Object} vncResults - VNC结果
   * @returns {Object} 网络分析结果
   */
  analyzeNetworkRequests(cdpResults, vncResults) {
    return {
      cdp: {
        requestCount: cdpResults.metrics?.network?.count || 0,
        averageResponseTime: cdpResults.metrics?.network?.average || 0
      },
      vnc: {
        requestCount: vncResults.metrics?.network?.count || 0,
        averageResponseTime: vncResults.metrics?.network?.average || 0
      },
      analysis: {
        cdpFaster: (cdpResults.metrics?.network?.average || 0) < (vncResults.metrics?.network?.average || 0),
        responseTimeImprovement: this.calculateImprovement(
          vncResults.metrics?.network?.average || 0,
          cdpResults.metrics?.network?.average || 0,
          'lower'
        ).percent
      }
    };
  }

  /**
   * 计算改进百分比
   * @param {number} baseline - 基准值
   * @param {number} comparison - 对比值
   * @param {string} direction - 改进方向 ('higher' | 'lower')
   * @returns {Object} 改进信息
   */
  calculateImprovement(baseline, comparison, direction = 'higher') {
    if (baseline === 0 && comparison === 0) {
      return { percent: 0, improved: false, direction };
    }
    
    if (baseline === 0) {
      return { percent: direction === 'higher' ? 100 : -100, improved: direction === 'higher', direction };
    }
    
    const percent = ((comparison - baseline) / baseline) * 100;
    const improved = direction === 'higher' ? percent > 0 : percent < 0;
    
    return {
      percent: Math.abs(percent),
      improved,
      direction,
      actualPercent: percent
    };
  }

  /**
   * 比较一致性
   * @param {Object} metrics1 - 指标1
   * @param {Object} metrics2 - 指标2
   * @returns {Object} 一致性比较结果
   */
  compareConsistency(metrics1, metrics2) {
    if (!metrics1 || !metrics2) {
      return { comparison: 'insufficient_data' };
    }
    
    const cv1 = this.calculateCoefficientOfVariation(metrics1);
    const cv2 = this.calculateCoefficientOfVariation(metrics2);
    
    return {
      cv1,
      cv2,
      moreConsistent: cv1 < cv2 ? 'first' : 'second',
      consistencyDifference: Math.abs(cv1 - cv2)
    };
  }

  /**
   * 计算变异系数
   * @param {Object} metrics - 指标数据
   * @returns {number} 变异系数
   */
  calculateCoefficientOfVariation(metrics) {
    if (!metrics || !metrics.average || metrics.average === 0) {
      return 0;
    }
    
    // 使用标准差的近似值：(max - min) / 4
    const approximateStdDev = (metrics.max - metrics.min) / 4;
    return (approximateStdDev / metrics.average) * 100;
  }

  /**
   * 计算稳定性
   * @param {Object} metrics - 指标数据
   * @returns {number} 稳定性分数 (0-100)
   */
  calculateStability(metrics) {
    if (!metrics || !metrics.average) {
      return 0;
    }
    
    const cv = this.calculateCoefficientOfVariation(metrics);
    return Math.max(0, 100 - cv);
  }

  /**
   * 计算内存增长
   * @param {Object} metrics - 内存指标
   * @returns {Object} 内存增长信息
   */
  calculateMemoryGrowth(metrics) {
    if (!metrics) {
      return { growth: 0, trend: 'stable' };
    }
    
    const growth = ((metrics.max - metrics.min) / metrics.min) * 100;
    let trend = 'stable';
    
    if (growth > 50) {
      trend = 'high_growth';
    } else if (growth > 20) {
      trend = 'moderate_growth';
    } else if (growth < 5) {
      trend = 'stable';
    }
    
    return { growth, trend };
  }

  /**
   * 生成总体摘要
   * @param {Object} comparisons - 对比数据
   * @returns {Object} 总体摘要
   */
  generateSummary(comparisons) {
    const improvements = [];
    const regressions = [];
    
    Object.keys(comparisons).forEach(metric => {
      const comparison = comparisons[metric];
      if (comparison.improved) {
        improvements.push({
          metric,
          improvement: comparison.percent
        });
      } else if (comparison.percent > 5) { // 只记录显著的退步
        regressions.push({
          metric,
          regression: comparison.percent
        });
      }
    });
    
    // 计算总体性能提升
    const overallImprovement = improvements.length > 0 
      ? improvements.reduce((sum, imp) => sum + imp.improvement, 0) / improvements.length
      : 0;
    
    return {
      overallImprovement,
      improvementCount: improvements.length,
      regressionCount: regressions.length,
      improvements,
      regressions,
      recommendation: this.getOverallRecommendation(overallImprovement, improvements.length, regressions.length)
    };
  }

  /**
   * 获取总体建议
   * @param {number} overallImprovement - 总体改进
   * @param {number} improvementCount - 改进项数量
   * @param {number} regressionCount - 退步项数量
   * @returns {string} 总体建议
   */
  getOverallRecommendation(overallImprovement, improvementCount, regressionCount) {
    if (overallImprovement > 30 && improvementCount > regressionCount) {
      return 'strongly_recommend_cdp';
    } else if (overallImprovement > 15 && improvementCount >= regressionCount) {
      return 'recommend_cdp';
    } else if (overallImprovement > 5) {
      return 'consider_cdp';
    } else {
      return 'keep_vnc';
    }
  }

  /**
   * 生成建议
   * @param {Object} analysis - 分析结果
   * @returns {Array} 建议列表
   */
  generateRecommendations(analysis) {
    const recommendations = [];
    
    // 基于延迟分析的建议
    if (analysis.detailed.latency?.analysis?.improvementPercent > 30) {
      recommendations.push({
        type: 'latency',
        priority: 'high',
        title: '显著的延迟改进',
        description: `CDP方案在延迟方面比VNC改进了${analysis.detailed.latency.analysis.improvementPercent.toFixed(1)}%，建议优先采用CDP方案以提升用户体验。`
      });
    }
    
    // 基于帧率分析的建议
    if (analysis.detailed.frameRate?.analysis?.frameRateImprovement > 20) {
      recommendations.push({
        type: 'frameRate',
        priority: 'medium',
        title: '帧率性能提升',
        description: `CDP方案的帧率比VNC提升了${analysis.detailed.frameRate.analysis.frameRateImprovement.toFixed(1)}%，能够提供更流畅的视觉体验。`
      });
    }
    
    // 基于资源使用的建议
    if (analysis.detailed.memory?.analysis?.memoryReduction > 25) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        title: '内存使用优化',
        description: `CDP方案的内存使用比VNC减少了${analysis.detailed.memory.analysis.memoryReduction.toFixed(1)}%，有助于提高系统整体性能。`
      });
    }
    
    // 基于带宽的建议
    if (analysis.detailed.bandwidth?.analysis?.bandwidthImprovement > 50) {
      recommendations.push({
        type: 'bandwidth',
        priority: 'high',
        title: '带宽使用优化',
        description: `CDP方案的带宽效率比VNC提升了${analysis.detailed.bandwidth.analysis.bandwidthImprovement.toFixed(1)}%，特别适合网络环境较差的场景。`
      });
    }
    
    // 总体建议
    const overallRecommendation = analysis.summary.recommendation;
    switch (overallRecommendation) {
      case 'strongly_recommend_cdp':
        recommendations.push({
          type: 'overall',
          priority: 'high',
          title: '强烈建议采用CDP方案',
          description: '基于综合性能分析，CDP方案在多个关键指标上都有显著改进，建议立即迁移到CDP方案。'
        });
        break;
      case 'recommend_cdp':
        recommendations.push({
          type: 'overall',
          priority: 'medium',
          title: '建议采用CDP方案',
          description: 'CDP方案在大部分性能指标上表现更好，建议逐步迁移到CDP方案。'
        });
        break;
      case 'consider_cdp':
        recommendations.push({
          type: 'overall',
          priority: 'low',
          title: '考虑采用CDP方案',
          description: 'CDP方案有一定的性能优势，可以考虑在特定场景下使用CDP方案。'
        });
        break;
      default:
        recommendations.push({
          type: 'overall',
          priority: 'low',
          title: '保持当前VNC方案',
          description: '当前VNC方案表现良好，暂时无需迁移到CDP方案。'
        });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 生成报告内容
   * @param {Object} analysis - 分析结果
   * @param {string} format - 报告格式
   * @param {Object} options - 选项
   * @returns {Promise<string>} 报告内容
   */
  async generateReportContent(analysis, format, options) {
    switch (format) {
      case 'html':
        return this.generateHTMLReport(analysis, options);
      case 'markdown':
        return this.generateMarkdownReport(analysis, options);
      case 'json':
        return this.generateJSONReport(analysis, options);
      default:
        throw new Error(`不支持的报告格式: ${format}`);
    }
  }

  /**
   * 生成HTML报告
   * @param {Object} analysis - 分析结果
   * @param {Object} options - 选项
   * @returns {string} HTML内容
   */
  generateHTMLReport(analysis, options) {
    const { customTitle, includeCharts } = options;
    
    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${customTitle}</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        .summary { background: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .metric-card { background: #fff; border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 10px 0; }
        .improvement { color: #27ae60; font-weight: bold; }
        .regression { color: #e74c3c; font-weight: bold; }
        .recommendation { background: #d5f4e6; border-left: 4px solid #27ae60; padding: 15px; margin: 10px 0; }
        .recommendation.high { border-left-color: #e74c3c; background: #fdf2f2; }
        .recommendation.medium { border-left-color: #f39c12; background: #fef9e7; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #f8f9fa; }
        .chart-placeholder { background: #f8f9fa; border: 2px dashed #dee2e6; padding: 40px; text-align: center; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${customTitle}</h1>
        <p><strong>生成时间:</strong> ${new Date(analysis.timestamp).toLocaleString('zh-CN')}</p>
        
        <div class="summary">
            <h2>📊 总体摘要</h2>
            <p><strong>总体性能提升:</strong> <span class="improvement">${analysis.summary.overallImprovement.toFixed(1)}%</span></p>
            <p><strong>改进项数量:</strong> ${analysis.summary.improvementCount}</p>
            <p><strong>退步项数量:</strong> ${analysis.summary.regressionCount}</p>
            <p><strong>总体建议:</strong> ${this.getRecommendationText(analysis.summary.recommendation)}</p>
        </div>

        <h2>🚀 性能指标对比</h2>
        
        <div class="metric-card">
            <h3>⚡ 延迟性能</h3>
            <table>
                <tr><th>指标</th><th>CDP</th><th>VNC</th><th>改进</th></tr>
                <tr>
                    <td>平均延迟</td>
                    <td>${analysis.detailed.latency.cdp.average.toFixed(2)}ms</td>
                    <td>${analysis.detailed.latency.vnc.average.toFixed(2)}ms</td>
                    <td class="${analysis.detailed.latency.analysis.cdpFaster ? 'improvement' : 'regression'}">
                        ${analysis.detailed.latency.analysis.improvementPercent.toFixed(1)}%
                    </td>
                </tr>
                <tr>
                    <td>P95延迟</td>
                    <td>${analysis.detailed.latency.cdp.p95.toFixed(2)}ms</td>
                    <td>${analysis.detailed.latency.vnc.p95.toFixed(2)}ms</td>
                    <td>-</td>
                </tr>
            </table>
        </div>

        <div class="metric-card">
            <h3>🎬 帧率性能</h3>
            <table>
                <tr><th>指标</th><th>CDP</th><th>VNC</th><th>改进</th></tr>
                <tr>
                    <td>平均帧率</td>
                    <td>${analysis.detailed.frameRate.cdp.average.toFixed(1)} FPS</td>
                    <td>${analysis.detailed.frameRate.vnc.average.toFixed(1)} FPS</td>
                    <td class="${analysis.detailed.frameRate.analysis.cdpSmoother ? 'improvement' : 'regression'}">
                        ${analysis.detailed.frameRate.analysis.frameRateImprovement.toFixed(1)}%
                    </td>
                </tr>
                <tr>
                    <td>稳定性</td>
                    <td>${analysis.detailed.frameRate.cdp.stability.toFixed(1)}%</td>
                    <td>${analysis.detailed.frameRate.vnc.stability.toFixed(1)}%</td>
                    <td>-</td>
                </tr>
            </table>
        </div>

        <div class="metric-card">
            <h3>💾 资源使用</h3>
            <table>
                <tr><th>指标</th><th>CDP</th><th>VNC</th><th>改进</th></tr>
                <tr>
                    <td>平均内存使用</td>
                    <td>${(analysis.detailed.memory.cdp.average / 1024 / 1024).toFixed(1)} MB</td>
                    <td>${(analysis.detailed.memory.vnc.average / 1024 / 1024).toFixed(1)} MB</td>
                    <td class="${analysis.detailed.memory.analysis.cdpMoreEfficient ? 'improvement' : 'regression'}">
                        ${analysis.detailed.memory.analysis.memoryReduction.toFixed(1)}%
                    </td>
                </tr>
                <tr>
                    <td>平均CPU使用</td>
                    <td>${analysis.detailed.cpu.cdp.average.toFixed(1)}%</td>
                    <td>${analysis.detailed.cpu.vnc.average.toFixed(1)}%</td>
                    <td class="${analysis.detailed.cpu.analysis.cdpMoreEfficient ? 'improvement' : 'regression'}">
                        ${analysis.detailed.cpu.analysis.cpuReduction.toFixed(1)}%
                    </td>
                </tr>
            </table>
        </div>

        ${includeCharts ? '<div class="chart-placeholder">📈 性能趋势图表 (需要集成图表库)</div>' : ''}

        <h2>💡 优化建议</h2>
        ${analysis.recommendations.map(rec => `
            <div class="recommendation ${rec.priority}">
                <h4>${rec.title}</h4>
                <p>${rec.description}</p>
                <small>优先级: ${rec.priority === 'high' ? '高' : rec.priority === 'medium' ? '中' : '低'}</small>
            </div>
        `).join('')}

        <h2>📋 详细数据</h2>
        <details>
            <summary>点击查看原始分析数据</summary>
            <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">${JSON.stringify(analysis, null, 2)}</pre>
        </details>
    </div>
</body>
</html>`;
  }

  /**
   * 生成Markdown报告
   * @param {Object} analysis - 分析结果
   * @param {Object} options - 选项
   * @returns {string} Markdown内容
   */
  generateMarkdownReport(analysis, options) {
    const { customTitle } = options;
    
    return `# ${customTitle}

**生成时间:** ${new Date(analysis.timestamp).toLocaleString('zh-CN')}

## 📊 总体摘要

- **总体性能提升:** ${analysis.summary.overallImprovement.toFixed(1)}%
- **改进项数量:** ${analysis.summary.improvementCount}
- **退步项数量:** ${analysis.summary.regressionCount}
- **总体建议:** ${this.getRecommendationText(analysis.summary.recommendation)}

## 🚀 性能指标对比

### ⚡ 延迟性能

| 指标 | CDP | VNC | 改进 |
|------|-----|-----|------|
| 平均延迟 | ${analysis.detailed.latency.cdp.average.toFixed(2)}ms | ${analysis.detailed.latency.vnc.average.toFixed(2)}ms | ${analysis.detailed.latency.analysis.improvementPercent.toFixed(1)}% |
| P95延迟 | ${analysis.detailed.latency.cdp.p95.toFixed(2)}ms | ${analysis.detailed.latency.vnc.p95.toFixed(2)}ms | - |

### 🎬 帧率性能

| 指标 | CDP | VNC | 改进 |
|------|-----|-----|------|
| 平均帧率 | ${analysis.detailed.frameRate.cdp.average.toFixed(1)} FPS | ${analysis.detailed.frameRate.vnc.average.toFixed(1)} FPS | ${analysis.detailed.frameRate.analysis.frameRateImprovement.toFixed(1)}% |
| 稳定性 | ${analysis.detailed.frameRate.cdp.stability.toFixed(1)}% | ${analysis.detailed.frameRate.vnc.stability.toFixed(1)}% | - |

### 💾 资源使用

| 指标 | CDP | VNC | 改进 |
|------|-----|-----|------|
| 平均内存使用 | ${(analysis.detailed.memory.cdp.average / 1024 / 1024).toFixed(1)} MB | ${(analysis.detailed.memory.vnc.average / 1024 / 1024).toFixed(1)} MB | ${analysis.detailed.memory.analysis.memoryReduction.toFixed(1)}% |
| 平均CPU使用 | ${analysis.detailed.cpu.cdp.average.toFixed(1)}% | ${analysis.detailed.cpu.vnc.average.toFixed(1)}% | ${analysis.detailed.cpu.analysis.cpuReduction.toFixed(1)}% |

## 💡 优化建议

${analysis.recommendations.map(rec => `
### ${rec.title} (${rec.priority === 'high' ? '高优先级' : rec.priority === 'medium' ? '中优先级' : '低优先级'})

${rec.description}
`).join('')}

## 📋 详细数据

\`\`\`json
${JSON.stringify(analysis, null, 2)}
\`\`\`
`;
  }

  /**
   * 生成JSON报告
   * @param {Object} analysis - 分析结果
   * @param {Object} options - 选项
   * @returns {string} JSON内容
   */
  generateJSONReport(analysis, options) {
    return JSON.stringify({
      metadata: {
        title: options.customTitle,
        generatedAt: analysis.timestamp,
        format: 'json'
      },
      analysis
    }, null, 2);
  }

  /**
   * 获取建议文本
   * @param {string} recommendation - 建议代码
   * @returns {string} 建议文本
   */
  getRecommendationText(recommendation) {
    const texts = {
      strongly_recommend_cdp: '强烈建议采用CDP方案',
      recommend_cdp: '建议采用CDP方案',
      consider_cdp: '考虑采用CDP方案',
      keep_vnc: '保持当前VNC方案'
    };
    return texts[recommendation] || '未知建议';
  }

  /**
   * 确保目录存在
   * @param {string} dirPath - 目录路径
   */
  async ensureDirectoryExists(dirPath) {
    try {
      await fs.access(dirPath);
    } catch (error) {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * 生成HTML模板
   * @returns {string} HTML模板
   */
  generateHTMLTemplate() {
    return 'html_template';
  }

  /**
   * 生成Markdown模板
   * @returns {string} Markdown模板
   */
  generateMarkdownTemplate() {
    return 'markdown_template';
  }

  /**
   * 生成JSON模板
   * @returns {string} JSON模板
   */
  generateJSONTemplate() {
    return 'json_template';
  }
}

// 创建全局实例
const performanceReportGenerator = new PerformanceReportGenerator();

module.exports = {
  performanceReportGenerator,
  PerformanceReportGenerator
};