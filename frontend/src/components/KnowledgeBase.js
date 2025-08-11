import React, { useState, useEffect } from 'react';
import { Layout, Card, Table, Tag, message, Button, Modal, Space } from 'antd';
import { DeleteOutlined, ExclamationCircleOutlined, EyeOutlined } from '@ant-design/icons';
import axios from 'axios';
import DocumentUpload from './DocumentUpload';
import DocumentViewer from './DocumentViewer';

const { Content } = Layout;
const { confirm } = Modal;

const KnowledgeBase = ({ selectedMenu: defaultMenu = 'documents' }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);

  const API_BASE = '/api/knowledge';

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE}/documents?companyId=1`);
      if (response.data.success) {
        setDocuments(response.data.data);
      }
    } catch (error) {
      message.error('加载文档列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除文档
  const handleDeleteDocument = async (documentId, documentTitle) => {
    setDeleteLoading(true);
    try {
      const response = await axios.delete(`${API_BASE}/documents/${documentId}`);
      if (response.data.success) {
        message.success(response.data.data.message || `文档"${documentTitle}"删除成功`);
        loadDocuments(); // 重新加载文档列表
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('删除文档失败:', error);
      message.error(`删除文档失败: ${error.response?.data?.message || error.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // 显示删除确认弹窗
  const showDeleteConfirm = (documentId, documentTitle, status) => {
    const isProcessing = status === 'processing';
    
    confirm({
      title: '确认删除文档',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>您确定要删除文档 <strong>"{documentTitle}"</strong> 吗？</p>
          {isProcessing && (
            <p style={{ color: '#faad14', fontSize: '14px', fontWeight: 'bold' }}>
              ⚠️ 该文档正在处理中，删除后将立即停止处理并移除所有相关数据。
            </p>
          )}
          <p style={{ color: '#ff4d4f', fontSize: '14px' }}>
            ⚠️ 此操作不可撤销，删除后文档及其所有相关内容将永久丢失。
          </p>
        </div>
      ),
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        handleDeleteDocument(documentId, documentTitle);
      },
    });
  };

  // 查看文档
  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setViewerVisible(true);
  };

  // 关闭文档查看器
  const handleCloseViewer = () => {
    setViewerVisible(false);
    setSelectedDocument(null);
  };

  const columns = [
    {
      title: '文档名称',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div style={{ maxWidth: '300px', wordBreak: 'break-all' }}>
          {record.status === 'processing' && (
            <Tag color="orange" style={{ marginRight: 8, marginBottom: 4 }}>
              处理中
            </Tag>
          )}
          {title}
        </div>
      ),
    },
    {
      title: '文件类型',
      dataIndex: 'file_type',
      key: 'file_type',
      render: (type) => {
        const typeMap = {
          'application/pdf': { text: 'PDF', color: 'red' },
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { text: 'Word', color: 'blue' },
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { text: 'Excel', color: 'green' },
          'text/plain': { text: 'TXT', color: 'default' },
          'text/markdown': { text: 'MD', color: 'purple' }
        };
        const config = typeMap[type] || { text: '未知', color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '文件大小',
      dataIndex: 'file_size',
      key: 'file_size',
      render: (size) => {
        if (size < 1024) return `${size} B`;
        if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${(size / (1024 * 1024)).toFixed(1)} MB`;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const statusMap = {
          'processed': { text: '已处理', color: 'green' },
          'processing': { text: '处理中', color: 'orange' },
          'failed': { text: '处理失败', color: 'red' }
        };
        const config = statusMap[status] || { text: status, color: 'default' };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '上传时间',
      dataIndex: 'upload_time',
      key: 'upload_time',
      render: (time) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDocument(record)}
            disabled={record.status === 'processing'}
          >
            查看
          </Button>
          <Button
            type="primary"
            danger
            size="small"
            icon={<DeleteOutlined />}
            loading={deleteLoading}
            onClick={() => showDeleteConfirm(record.id, record.title, record.status)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const renderContent = () => {
    switch (defaultMenu) {
      case 'documents':
        return (
          <div>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>文档管理</h3>
              <div>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  共 {documents.length} 个文档
                </span>
              </div>
            </div>
            <Table
              columns={columns}
              dataSource={documents}
              loading={loading}
              rowKey="id"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
              }}
            />
          </div>
        );
      case 'upload':
        return (
          <div>
            <h3>文档上传</h3>
            <DocumentUpload onUploadSuccess={loadDocuments} />
          </div>
        );
      default:
        return <div>请选择功能</div>;
    }
  };

  return (
    <Content style={{ padding: 24, height: '100%', overflow: 'auto' }}>
      <Card style={{ height: '100%' }}>
        {renderContent()}
      </Card>
      
      {/* 文档查看器 */}
      <DocumentViewer
        visible={viewerVisible}
        onClose={handleCloseViewer}
        documentId={selectedDocument?.id}
        documentTitle={selectedDocument?.title}
      />
    </Content>
  );
};

export default KnowledgeBase; 