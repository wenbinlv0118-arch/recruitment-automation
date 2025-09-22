/**
 * 网络配置验证脚本
 * 用于验证生产环境的网络配置和连接性
 */

const net = require('net');
const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

class NetworkConfigValidator {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      errors: [],
      warnings: [],
      recommendations: []
    };
  }

  /**
   * 检查端口连通性
   * @param {string} host - 主机地址
   * @param {number} port - 端口号
   * @param {number} timeout - 超时时间(ms)
   * @returns {Promise<Object>} 连接结果
   */
  async checkPortConnectivity(host, port, timeout = 5000) {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      const timer = setTimeout(() => {
        socket.destroy();
        resolve({
          host,
          port,
          connected: false,
          error: 'Connection timeout',
          responseTime: timeout
        });
      }, timeout);

      const startTime = Date.now();

      socket.connect(port, host, () => {
        clearTimeout(timer);
        const responseTime = Date.now() - startTime;
        socket.destroy();
        resolve({
          host,
          port,
          connected: true,
          responseTime
        });
      });

      socket.on('error', (error) => {
        clearTimeout(timer);
        socket.destroy();
        resolve({
          host,
          port,
          connected: false,
          error: error.message,
          responseTime: Date.now() - startTime
        });
      });
    });
  }

  /**
   * DNS解析测试
   * @param {string} domain - 域名
   * @returns {Promise<Object>} DNS解析结果
   */
  async checkDNSResolution(domain) {
    try {
      const startTime = Date.now();
      const addresses = await dns.resolve4(domain);
      const responseTime = Date.now() - startTime;

      return {
        domain,
        resolved: true,
        addresses,
        responseTime
      };
    } catch (error) {
      return {
        domain,
        resolved: false,
        error: error.message,
        responseTime: 0
      };
    }
  }

  /**
   * HTTP/HTTPS连接测试
   * @param {string} url - 测试URL
   * @param {Object} options - 请求选项
   * @returns {Promise<Object>} HTTP测试结果
   */
  async checkHTTPConnectivity(url, options = {}) {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const isHTTPS = urlObj.protocol === 'https:';
      const client = isHTTPS ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHTTPS ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        timeout: options.timeout || 10000,
        headers: {
          'User-Agent': 'NetworkConfigValidator/1.0',
          ...options.headers
        }
      };

      const startTime = Date.now();

      const req = client.request(requestOptions, (res) => {
        const responseTime = Date.now() - startTime;
        
        // 读取响应体
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          resolve({
            url,
            success: true,
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            responseTime,
            bodySize: body.length,
            ssl: isHTTPS ? {
              authorized: res.socket?.authorized,
              cipher: res.socket?.getCipher?.(),
              protocol: res.socket?.getProtocol?.()
            } : null
          });
        });
      });

      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          url,
          success: false,
          error: error.message,
          responseTime
        });
      });

      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          url,
          success: false,
          error: 'Request timeout',
          responseTime
        });
      });

      req.end();
    });
  }

  /**
   * 检查网络延迟
   * @param {string} host - 主机地址
   * @param {number} count - ping次数
   * @returns {Promise<Object>} ping结果
   */
  async checkNetworkLatency(host, count = 4) {
    try {
      const { stdout } = await execAsync(`ping -c ${count} ${host}`);
      
      // 解析ping结果
      const lines = stdout.split('\n');
      const statsLine = lines.find(line => line.includes('min/avg/max'));
      
      if (statsLine) {
        const match = statsLine.match(/(\d+\.\d+)\/(\d+\.\d+)\/(\d+\.\d+)/);
        if (match) {
          return {
            host,
            success: true,
            min: parseFloat(match[1]),
            avg: parseFloat(match[2]),
            max: parseFloat(match[3]),
            packetLoss: this.extractPacketLoss(stdout)
          };
        }
      }

      return {
        host,
        success: false,
        error: 'Unable to parse ping results'
      };
    } catch (error) {
      return {
        host,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 提取丢包率
   * @param {string} pingOutput - ping命令输出
   * @returns {number} 丢包率百分比
   */
  extractPacketLoss(pingOutput) {
    const match = pingOutput.match(/(\d+)% packet loss/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * 检查防火墙规则
   * @returns {Promise<Object>} 防火墙检查结果
   */
  async checkFirewallRules() {
    try {
      // 检查macOS防火墙状态
      const { stdout } = await execAsync('sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate');
      
      const firewallEnabled = stdout.includes('enabled');
      
      return {
        platform: 'macOS',
        enabled: firewallEnabled,
        status: firewallEnabled ? 'enabled' : 'disabled',
        details: stdout.trim()
      };
    } catch (error) {
      return {
        platform: 'macOS',
        error: error.message,
        recommendation: '无法检查防火墙状态，请手动验证'
      };
    }
  }

  /**
   * 检查网络接口配置
   * @returns {Promise<Object>} 网络接口信息
   */
  async checkNetworkInterfaces() {
    try {
      const { stdout } = await execAsync('ifconfig');
      
      // 解析网络接口信息
      const interfaces = [];
      const interfaceBlocks = stdout.split(/^(\w+):/m).slice(1);
      
      for (let i = 0; i < interfaceBlocks.length; i += 2) {
        const name = interfaceBlocks[i];
        const config = interfaceBlocks[i + 1];
        
        if (config) {
          const ipMatch = config.match(/inet (\d+\.\d+\.\d+\.\d+)/);
          const statusMatch = config.match(/status: (\w+)/);
          
          interfaces.push({
            name,
            ip: ipMatch ? ipMatch[1] : null,
            status: statusMatch ? statusMatch[1] : 'unknown',
            active: config.includes('UP') && config.includes('RUNNING')
          });
        }
      }

      return {
        success: true,
        interfaces,
        activeCount: interfaces.filter(iface => iface.active).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 检查代理配置
   * @returns {Object} 代理配置信息
   */
  checkProxyConfiguration() {
    const proxyVars = [
      'HTTP_PROXY',
      'HTTPS_PROXY',
      'FTP_PROXY',
      'NO_PROXY',
      'http_proxy',
      'https_proxy',
      'ftp_proxy',
      'no_proxy'
    ];

    const proxyConfig = {};
    let hasProxy = false;

    proxyVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        proxyConfig[varName] = value;
        hasProxy = true;
      }
    });

    return {
      hasProxy,
      config: proxyConfig,
      recommendation: hasProxy ? 
        '检测到代理配置，请确保代理服务器可访问' : 
        '未检测到代理配置'
    };
  }

  /**
   * 测试数据库连接
   * @param {Object} dbConfig - 数据库配置
   * @returns {Promise<Object>} 数据库连接测试结果
   */
  async testDatabaseConnection(dbConfig) {
    const {
      host = 'localhost',
      port = 5432,
      database = 'recruitment_db',
      user,
      password
    } = dbConfig;

    // 首先测试端口连通性
    const portTest = await this.checkPortConnectivity(host, port);
    
    if (!portTest.connected) {
      return {
        success: false,
        error: `无法连接到数据库端口 ${host}:${port}`,
        details: portTest
      };
    }

    // 如果有数据库凭据，尝试实际连接
    if (user && password) {
      try {
        // 这里需要根据实际使用的数据库客户端进行调整
        // 示例使用pg客户端
        const { Client } = require('pg');
        const client = new Client({
          host,
          port,
          database,
          user,
          password,
          connectionTimeoutMillis: 5000
        });

        await client.connect();
        await client.query('SELECT 1');
        await client.end();

        return {
          success: true,
          message: '数据库连接成功',
          host,
          port,
          database
        };
      } catch (error) {
        return {
          success: false,
          error: `数据库连接失败: ${error.message}`,
          host,
          port,
          database
        };
      }
    }

    return {
      success: true,
      message: '端口连通性测试通过，但未提供数据库凭据进行完整测试',
      portConnectivity: portTest
    };
  }

  /**
   * 执行完整的网络配置验证
   * @param {Object} config - 验证配置
   * @returns {Promise<Object>} 验证结果
   */
  async runNetworkValidation(config = {}) {
    console.log('🌐 开始网络配置验证...\n');

    const {
      frontendUrl = 'https://recruitment-frontend-xxx.zeabur.app',
      backendUrl = 'https://recruitment-backend-xxx.zeabur.app',
      databaseConfig = {},
      additionalHosts = []
    } = config;

    try {
      // 1. DNS解析测试
      console.log('1. DNS解析测试...');
      const frontendDomain = new URL(frontendUrl).hostname;
      const backendDomain = new URL(backendUrl).hostname;
      
      this.results.tests.dns = {
        frontend: await this.checkDNSResolution(frontendDomain),
        backend: await this.checkDNSResolution(backendDomain)
      };

      // 2. HTTP连接测试
      console.log('2. HTTP连接测试...');
      this.results.tests.http = {
        frontend: await this.checkHTTPConnectivity(frontendUrl),
        backend: await this.checkHTTPConnectivity(`${backendUrl}/api/health`),
        backendCors: await this.checkHTTPConnectivity(backendUrl, {
          method: 'OPTIONS',
          headers: {
            'Origin': frontendUrl,
            'Access-Control-Request-Method': 'GET'
          }
        })
      };

      // 3. 端口连通性测试
      console.log('3. 端口连通性测试...');
      const frontendPort = new URL(frontendUrl).port || 443;
      const backendPort = new URL(backendUrl).port || 443;
      
      this.results.tests.ports = {
        frontend: await this.checkPortConnectivity(frontendDomain, frontendPort),
        backend: await this.checkPortConnectivity(backendDomain, backendPort)
      };

      // 4. 网络延迟测试
      console.log('4. 网络延迟测试...');
      this.results.tests.latency = {
        frontend: await this.checkNetworkLatency(frontendDomain),
        backend: await this.checkNetworkLatency(backendDomain)
      };

      // 5. 数据库连接测试
      if (Object.keys(databaseConfig).length > 0) {
        console.log('5. 数据库连接测试...');
        this.results.tests.database = await this.testDatabaseConnection(databaseConfig);
      }

      // 6. 本地网络配置检查
      console.log('6. 本地网络配置检查...');
      this.results.tests.localNetwork = {
        interfaces: await this.checkNetworkInterfaces(),
        firewall: await this.checkFirewallRules(),
        proxy: this.checkProxyConfiguration()
      };

      // 7. 额外主机测试
      if (additionalHosts.length > 0) {
        console.log('7. 额外主机连接测试...');
        this.results.tests.additionalHosts = {};
        
        for (const host of additionalHosts) {
          this.results.tests.additionalHosts[host] = {
            dns: await this.checkDNSResolution(host),
            latency: await this.checkNetworkLatency(host)
          };
        }
      }

      // 8. 生成分析和建议
      this.analyzeResults();

    } catch (error) {
      console.error('❌ 网络验证过程中发生错误:', error);
      this.results.errors.push(error.message);
    }

    return this.results;
  }

  /**
   * 分析测试结果并生成建议
   */
  analyzeResults() {
    const { tests } = this.results;

    // DNS分析
    if (tests.dns) {
      Object.entries(tests.dns).forEach(([service, result]) => {
        if (!result.resolved) {
          this.results.errors.push(`${service} DNS解析失败: ${result.error}`);
          this.results.recommendations.push({
            type: 'DNS',
            priority: 'HIGH',
            message: `检查 ${result.domain} 的DNS配置`
          });
        } else if (result.responseTime > 1000) {
          this.results.warnings.push(`${service} DNS响应时间较慢: ${result.responseTime}ms`);
        }
      });
    }

    // HTTP连接分析
    if (tests.http) {
      Object.entries(tests.http).forEach(([service, result]) => {
        if (!result.success) {
          this.results.errors.push(`${service} HTTP连接失败: ${result.error}`);
          this.results.recommendations.push({
            type: 'HTTP',
            priority: 'HIGH',
            message: `检查 ${service} 服务的可用性和网络配置`
          });
        } else if (result.responseTime > 5000) {
          this.results.warnings.push(`${service} HTTP响应时间较慢: ${result.responseTime}ms`);
        }
      });
    }

    // 端口连通性分析
    if (tests.ports) {
      Object.entries(tests.ports).forEach(([service, result]) => {
        if (!result.connected) {
          this.results.errors.push(`${service} 端口连接失败: ${result.error}`);
        }
      });
    }

    // 延迟分析
    if (tests.latency) {
      Object.entries(tests.latency).forEach(([service, result]) => {
        if (result.success) {
          if (result.avg > 200) {
            this.results.warnings.push(`${service} 网络延迟较高: ${result.avg}ms`);
          }
          if (result.packetLoss > 0) {
            this.results.warnings.push(`${service} 存在丢包: ${result.packetLoss}%`);
          }
        }
      });
    }

    // 数据库连接分析
    if (tests.database && !tests.database.success) {
      this.results.errors.push(`数据库连接失败: ${tests.database.error}`);
      this.results.recommendations.push({
        type: 'DATABASE',
        priority: 'HIGH',
        message: '检查数据库服务状态和网络配置'
      });
    }

    // 代理配置分析
    if (tests.localNetwork?.proxy?.hasProxy) {
      this.results.recommendations.push({
        type: 'PROXY',
        priority: 'MEDIUM',
        message: '检测到代理配置，确保代理服务器正常工作'
      });
    }
  }

  /**
   * 生成网络配置报告
   * @returns {string} 报告内容
   */
  generateNetworkReport() {
    const { tests, errors, warnings, recommendations } = this.results;

    let report = `# 网络配置验证报告

**生成时间**: ${this.results.timestamp}

## 测试结果摘要

`;

    // DNS测试结果
    if (tests.dns) {
      report += `### DNS解析测试
`;
      Object.entries(tests.dns).forEach(([service, result]) => {
        const status = result.resolved ? '✅ 成功' : '❌ 失败';
        const time = result.responseTime ? `(${result.responseTime}ms)` : '';
        report += `- **${service}**: ${status} ${time}\n`;
        if (result.addresses) {
          report += `  - IP地址: ${result.addresses.join(', ')}\n`;
        }
      });
      report += '\n';
    }

    // HTTP连接测试结果
    if (tests.http) {
      report += `### HTTP连接测试
`;
      Object.entries(tests.http).forEach(([service, result]) => {
        const status = result.success ? '✅ 成功' : '❌ 失败';
        const statusCode = result.statusCode ? `(${result.statusCode})` : '';
        const time = result.responseTime ? `${result.responseTime}ms` : '';
        report += `- **${service}**: ${status} ${statusCode} ${time}\n`;
      });
      report += '\n';
    }

    // 端口连通性测试结果
    if (tests.ports) {
      report += `### 端口连通性测试
`;
      Object.entries(tests.ports).forEach(([service, result]) => {
        const status = result.connected ? '✅ 连通' : '❌ 失败';
        const time = result.responseTime ? `(${result.responseTime}ms)` : '';
        report += `- **${service}** (${result.host}:${result.port}): ${status} ${time}\n`;
      });
      report += '\n';
    }

    // 网络延迟测试结果
    if (tests.latency) {
      report += `### 网络延迟测试
`;
      Object.entries(tests.latency).forEach(([service, result]) => {
        if (result.success) {
          report += `- **${service}**: 平均 ${result.avg}ms (最小: ${result.min}ms, 最大: ${result.max}ms)\n`;
          if (result.packetLoss > 0) {
            report += `  - ⚠️ 丢包率: ${result.packetLoss}%\n`;
          }
        } else {
          report += `- **${service}**: ❌ 测试失败 - ${result.error}\n`;
        }
      });
      report += '\n';
    }

    // 数据库连接测试结果
    if (tests.database) {
      report += `### 数据库连接测试
- **状态**: ${tests.database.success ? '✅ 成功' : '❌ 失败'}
`;
      if (tests.database.error) {
        report += `- **错误**: ${tests.database.error}\n`;
      }
      report += '\n';
    }

    // 错误和警告
    if (errors.length > 0) {
      report += `## ❌ 错误 (${errors.length})

${errors.map(error => `- ${error}`).join('\n')}

`;
    }

    if (warnings.length > 0) {
      report += `## ⚠️ 警告 (${warnings.length})

${warnings.map(warning => `- ${warning}`).join('\n')}

`;
    }

    // 建议
    if (recommendations.length > 0) {
      report += `## 💡 建议 (${recommendations.length})

${recommendations.map(rec => `- **[${rec.priority}] ${rec.type}**: ${rec.message}`).join('\n')}

`;
    }

    report += `## 总结

- **DNS解析**: ${tests.dns ? Object.values(tests.dns).filter(r => r.resolved).length : 0}/${tests.dns ? Object.keys(tests.dns).length : 0} 成功
- **HTTP连接**: ${tests.http ? Object.values(tests.http).filter(r => r.success).length : 0}/${tests.http ? Object.keys(tests.http).length : 0} 成功
- **端口连通**: ${tests.ports ? Object.values(tests.ports).filter(r => r.connected).length : 0}/${tests.ports ? Object.keys(tests.ports).length : 0} 成功
- **错误数量**: ${errors.length}
- **警告数量**: ${warnings.length}

---
*此报告由网络配置验证脚本自动生成*
`;

    return report;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const validator = new NetworkConfigValidator();
  
  // 从命令行参数或环境变量获取配置
  const config = {
    frontendUrl: process.argv[2] || process.env.FRONTEND_URL || 'https://recruitment-frontend-xxx.zeabur.app',
    backendUrl: process.argv[3] || process.env.BACKEND_URL || 'https://recruitment-backend-xxx.zeabur.app',
    databaseConfig: {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    }
  };

  validator.runNetworkValidation(config)
    .then(results => {
      console.log('\n🎯 网络配置验证完成!');
      
      // 生成报告
      const report = validator.generateNetworkReport();
      const reportPath = path.join(__dirname, '../reports/network-validation-report.md');
      
      // 确保报告目录存在
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, report);
      console.log('📄 网络验证报告已生成:', reportPath);
      
      // 输出结果摘要
      console.log('\n📊 验证摘要:');
      console.log(`- 错误数量: ${results.errors.length}`);
      console.log(`- 警告数量: ${results.warnings.length}`);
      console.log(`- 建议数量: ${results.recommendations.length}`);
      
      // 如果有错误，以非零状态码退出
      if (results.errors.length > 0) {
        console.log('\n❌ 发现网络配置问题，请查看报告详情');
        process.exit(1);
      } else {
        console.log('\n✅ 网络配置验证通过');
      }
    })
    .catch(error => {
      console.error('❌ 网络配置验证失败:', error);
      process.exit(1);
    });
}

module.exports = NetworkConfigValidator;