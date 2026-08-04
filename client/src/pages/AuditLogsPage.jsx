import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Space,
  DatePicker,
  Tag,
  Typography,
  Alert,
  Spin,
  Row,
  Col,
  Tooltip,
  Badge,
  Collapse,
  Pagination,
  Modal,
  Descriptions,
  ConfigProvider
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  FilterOutlined,
  DownloadOutlined,
  EyeOutlined,
  ClearOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { auditAPI } from '../utils/api';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Panel } = Collapse;

const AuditLogsPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modal state
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    action: undefined,
    table_name: undefined,
    user_id: undefined,
    date_from: null,
    date_to: null,
    search: ''
  });

  const actionColors = {
    LOGIN: 'success',
    LOGOUT: 'processing',
    LOGIN_FAILED: 'error',
    CREATE: 'default',
    UPDATE: 'warning',
    DELETE: 'error'
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {
        page,
        limit: pageSize,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => 
            value !== '' && value !== null
          )
        )
      };

      if (filters.date_from) {
        params.date_from = filters.date_from.format('YYYY-MM-DD');
      }
      if (filters.date_to) {
        params.date_to = filters.date_to.format('YYYY-MM-DD');
      }

      const response = await auditAPI.getLogs(params);
      
      setAuditLogs(response.logs || []);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError('Erreur lors du chargement des logs d\'audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page, pageSize]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyFilters = () => {
    setPage(1);
    fetchAuditLogs();
  };

  const clearFilters = () => {
    setFilters({
      action: undefined,
      table_name: undefined,
      user_id: undefined,
      date_from: null,
      date_to: null,
      search: ''
    });
    setPage(1);
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters(prev => ({
        ...prev,
        date_from: dates[0],
        date_to: dates[1]
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        date_from: null,
        date_to: null
      }));
    }
  };

  const formatAdditionalInfo = (info) => {
    if (!info) return '-';
    try {
      const parsed = typeof info === 'string' ? JSON.parse(info) : info;
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      return info.toString();
    }
  };

  const handleViewDetails = (record) => {
    setSelectedLog(record);
    setIsModalOpen(true);
  };

  const handleExportCSV = () => {
    if (!auditLogs || auditLogs.length === 0) return;
    
    const headers = ['ID', 'Date/Heure', 'Utilisateur', 'Role', 'Action', 'Table', 'Enregistrement', 'IP', 'User Agent', 'Informations'];
    
    const rows = auditLogs.map(log => [
      log.id,
      dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss'),
      log.user ? log.user.username : 'Système',
      log.user ? log.user.role : '-',
      log.action,
      log.table_name || '-',
      log.record_id || '-',
      log.ip_address || '-',
      `"${(log.user_agent || '').replace(/"/g, '""')}"`,
      `"${(formatAdditionalInfo(log.additional_info) || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `audit_logs_${dayjs().format('YYYY-MM-DD_HHmmss')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      title: 'Date/Heure',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm:ss'),
      sorter: true,
    },
    {
      title: 'Utilisateur',
      key: 'user',
      width: 150,
      render: (_, record) => (
        <div>
          {record.user ? (
            <>
              <div className="font-medium">{record.user.username}</div>
              <Badge 
                size="small" 
                status="default" 
                text={record.user.role}
                className="text-xs text-gray-500"
              />
            </>
          ) : (
            <Text type="secondary">Système</Text>
          )}
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 130,
      render: (action) => (
        <Tag color={actionColors[action] || 'default'}>
          {action}
        </Tag>
      ),
    },
    {
      title: 'Table',
      dataIndex: 'table_name',
      key: 'table_name',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Enregistrement',
      dataIndex: 'record_id',
      key: 'record_id',
      width: 120,
      render: (text) => text || '-',
    },
    {
      title: 'Informations',
      dataIndex: 'additional_info',
      key: 'additional_info',
      width: 200,
      render: (info) => (
        <Tooltip title={formatAdditionalInfo(info)} placement="topLeft">
          <div className="truncate max-w-[180px]">
            {formatAdditionalInfo(info)}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
      width: 120,
      render: (text) => (
        <Text code>{text || '-'}</Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Tooltip title="Voir les détails">
          <Button 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(record)}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#00AABB' } }}>
      <div className="p-6">
        <div className="mb-6">
          <Title level={2}>Logs d'Audit</Title>
          <Text type="secondary">
            Historique de toutes les actions effectuées sur le système
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        {/* Filters */}
        <Card className="mb-6">
          <Collapse defaultActiveKey={['1']}>
            <Panel 
              header={
                <div className="flex items-center">
                  <FilterOutlined className="mr-2" />
                  Filtres
                </div>
              } 
              key="1"
            >
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Search
                    placeholder="Recherche..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    onSearch={applyFilters}
                    enterButton
                  />
                </Col>
                
                <Col xs={24} sm={12} md={8} lg={6}>
                  <Select
                    placeholder="Action"
                    value={filters.action || undefined}
                    onChange={(value) => handleFilterChange('action', value)}
                    className="w-full"
                    allowClear
                  >
                    <Option value="LOGIN">LOGIN</Option>
                    <Option value="LOGOUT">LOGOUT</Option>
                    <Option value="LOGIN_FAILED">LOGIN_FAILED</Option>
                    <Option value="CREATE">CREATE</Option>
                    <Option value="UPDATE">UPDATE</Option>
                    <Option value="DELETE">DELETE</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <Select
                    placeholder="Table"
                    value={filters.table_name || undefined}
                    onChange={(value) => handleFilterChange('table_name', value)}
                    className="w-full"
                    allowClear
                  >
                    <Option value="orders">Commandes</Option>
                    <Option value="users">Utilisateurs</Option>
                    <Option value="clients">Clients</Option>
                    <Option value="products">Produits</Option>
                  </Select>
                </Col>

                <Col xs={24} sm={12} md={8} lg={6}>
                  <RangePicker
                    value={filters.date_from && filters.date_to ? [filters.date_from, filters.date_to] : null}
                    onChange={handleDateRangeChange}
                    className="w-full"
                    placeholder={['Date début', 'Date fin']}
                  />
                </Col>
              </Row>

              <Row className="mt-4">
                <Col>
                  <Space>
                    <Button 
                      type="primary" 
                      icon={<SearchOutlined />}
                      onClick={applyFilters}
                    >
                      Appliquer
                    </Button>
                    <Button 
                      icon={<ClearOutlined />}
                      onClick={clearFilters}
                    >
                      Effacer
                    </Button>
                    <Button 
                      icon={<ReloadOutlined />}
                      onClick={fetchAuditLogs}
                    >
                      Actualiser
                    </Button>
                    <Button 
                      icon={<DownloadOutlined />}
                      onClick={handleExportCSV}
                    >
                      Exporter (CSV)
                    </Button>
                  </Space>
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Card>

        {/* Table */}
        <Card>
          <Table
            columns={columns}
            dataSource={auditLogs}
            loading={loading}
            pagination={false}
            rowKey="id"
            scroll={{ x: 'max-content' }}
            locale={{
              emptyText: loading ? <Spin /> : 'Aucun log d\'audit trouvé'
            }}
          />
          
          <div className="flex justify-end mt-4">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={totalCount}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) =>
                `${range[0]}-${range[1]} sur ${total} éléments`
              }
              onChange={(newPage, newPageSize) => {
                setPage(newPage);
                if (newPageSize !== pageSize) {
                  setPageSize(newPageSize);
                }
              }}
              pageSizeOptions={['10', '25', '50', '100']}
            />
          </div>
        </Card>

        {/* Details Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <span>Détails du Log d'Audit #{selectedLog?.id}</span>
              {selectedLog && (
                <Tag color={actionColors[selectedLog.action] || 'default'}>
                  {selectedLog.action}
                </Tag>
              )}
            </div>
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="close" type="primary" onClick={() => setIsModalOpen(false)}>
              Fermer
            </Button>
          ]}
          width={700}
        >
          {selectedLog && (
            <Descriptions column={2} bordered size="small" className="mt-4">
              <Descriptions.Item label="Date & Heure" span={2}>
                {dayjs(selectedLog.created_at).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Utilisateur">
                {selectedLog.user ? selectedLog.user.username : 'Système'}
              </Descriptions.Item>
              <Descriptions.Item label="Rôle">
                {selectedLog.user ? selectedLog.user.role : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Action">
                <Tag color={actionColors[selectedLog.action] || 'default'}>
                  {selectedLog.action}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Adresse IP">
                <Text code>{selectedLog.ip_address || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Table Affectée">
                {selectedLog.table_name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="ID Enregistrement">
                {selectedLog.record_id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="User Agent" span={2}>
                <Text type="secondary" className="text-xs break-all">
                  {selectedLog.user_agent || '-'}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Informations Supplémentaires" span={2}>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-auto max-h-40">
                  {selectedLog.additional_info ? (
                    typeof selectedLog.additional_info === 'string' ? (
                      (() => {
                        try {
                          return JSON.stringify(JSON.parse(selectedLog.additional_info), null, 2);
                        } catch {
                          return selectedLog.additional_info;
                        }
                      })()
                    ) : JSON.stringify(selectedLog.additional_info, null, 2)
                  ) : '-'}
                </pre>
              </Descriptions.Item>
              {selectedLog.old_values && (
                <Descriptions.Item label="Anciennes Valeurs" span={2}>
                  <pre className="bg-red-50 p-2 rounded text-xs text-red-700 overflow-auto max-h-40">
                    {typeof selectedLog.old_values === 'string' ? selectedLog.old_values : JSON.stringify(selectedLog.old_values, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
              {selectedLog.new_values && (
                <Descriptions.Item label="Nouvelles Valeurs" span={2}>
                  <pre className="bg-green-50 p-2 rounded text-xs text-green-700 overflow-auto max-h-40">
                    {typeof selectedLog.new_values === 'string' ? selectedLog.new_values : JSON.stringify(selectedLog.new_values, null, 2)}
                  </pre>
                </Descriptions.Item>
              )}
            </Descriptions>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default AuditLogsPage;
