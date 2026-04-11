import React, { useState } from 'react';
import {
  Layout,
  Menu,
  Breadcrumb,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Statistic,
  Progress,
  Avatar,
  Dropdown,
  Space,
  Badge,
  Typography,
  theme
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  BarChartOutlined,
  BellOutlined,
  DownOutlined,
  HomeOutlined,
  TeamOutlined,
  FileTextOutlined
} from '@ant-design/icons';
const { Header, Content, Footer, Sider } = Layout;
const { Title, Text } = Typography;

// Mock data for the dashboard
const salesData = [
  { key: '1', product: 'Product A', sales: 1200, trend: '+12%', status: 'active' },
  { key: '2', product: 'Product B', sales: 980, trend: '+8%', status: 'active' },
  { key: '3', product: 'Product C', sales: 750, trend: '-3%', status: 'inactive' },
  { key: '4', product: 'Product D', sales: 1500, trend: '+25%', status: 'active' },
];
const recentOrders = [
  { key: '1', order: '#ORD001', customer: 'John Doe', amount: '$250', status: 'completed' },
  { key: '2', order: '#ORD002', customer: 'Jane Smith', amount: '$180', status: 'pending' },
  { key: '3', order: '#ORD003', customer: 'Bob Wilson', amount: '$320', status: 'completed' },
  { key: '4', order: '#ORD004', customer: 'Alice Brown', amount: '$450', status: 'processing' },
];
const statusColors = {
  active: 'green',
  inactive: 'red',
  completed: 'green',
  pending: 'orange',
  processing: 'blue',
};
const Dashboard = () => {
  const [collapsed, setCollapsed] = useState(false);
const [current, setCurrent] = useState('dashboard');
const { token } = theme.useToken();
const menuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'orders', icon: <ShoppingCartOutlined />, label: 'Orders' },
    { key: 'analytics', icon: <BarChartOutlined />, label: 'Analytics' },
    { key: 'team', icon: <TeamOutlined />, label: 'Team' },
    { key: 'documents', icon: <FileTextOutlined />, label: 'Documents' },
    { key: 'users', icon: <UserOutlined />, label: 'Users' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
  ];
const salesColumns = [
    { title: 'Product', dataIndex: 'product', key: 'product' },
    { title: 'Sales', dataIndex: 'sales', key: 'sales', render: (value) => `$${value}` },
    { title: 'Trend', dataIndex: 'trend', key: 'trend' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
  ];
const orderColumns = [
    { title: 'Order', dataIndex: 'order', key: 'order' },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    { title: 'Amount', dataIndex: 'amount', key: 'amount' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        style={{ overflow: 'auto', height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0 }}
      >
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)', borderRadius: 6 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[current]}
          items={menuItems}
          onClick={(e) => setCurrent(e.key)}
        />
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 80 : 200, transition: 'all 0.2s' }}>
        <Header style={{
          padding: '0 24px',
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <Space>
            <HomeOutlined style={{ fontSize: 20 }} />
            <Title level={4} style={{ margin: 0 }}>Admin Dashboard</Title>
          </Space>

          <Space size="large">
            <Badge count={5}>
              <BellOutlined style={{ fontSize: 20, cursor: 'pointer' }} />
            </Badge>

            <Dropdown
              menu={{
                items: [
                  { key: '1', label: 'Profile' },
                  { key: '2', label: 'Settings' },
                  { key: '3', label: 'Logout' },
                ],
              }}
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <Text>Admin User</Text>
                <DownOutlined />
              </Space>
            </Dropdown>
          </Space>
        </Header>

        <Content style={{ margin: '24px 16px 0' }}>
          <Breadcrumb style={{ margin: '16px 0' }}>
            <Breadcrumb.Item>Home</Breadcrumb.Item>
            <Breadcrumb.Item>Dashboard</Breadcrumb.Item>
            <Breadcrumb.Item>Overview</Breadcrumb.Item>
          </Breadcrumb>

          <div style={{ padding: 24, background: token.colorBgContainer, borderRadius: token.borderRadiusLG }}>
            {/* Statistics Cards */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Total Revenue"
                    value={12893}
                    prefix="$"
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Active Users"
                    value={2536}
                    valueStyle={{ color: '#1890ff' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Orders"
                    value={1892}
                    valueStyle={{ color: '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Conversion Rate"
                    value={23.5}
                    suffix="%"
                    valueStyle={{ color: '#722ed1' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Progress Section */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={12}>
                <Card title="Monthly Target" style={{ height: '100%' }}>
                  <div style={{ marginBottom: 16 }}>
                    <Text>Revenue Goal</Text>
                    <Progress percent={75} status="active" />
                  </div>
                  <div style={{ marginBottom: 16 }}>
                    <Text>Customer Acquisition</Text>
                    <Progress percent={60} status="active" />
                  </div>
                  <div>
                    <Text>Product Launch</Text>
                    <Progress percent={90} status="success" />
                  </div>
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Quick Stats" style={{ height: '100%' }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic title="Today's Sales" value={1250} prefix="$" />
                    </Col>
                    <Col span={12}>
                      <Statistic title="New Customers" value={45} />
                    </Col>
                  </Row>
                  <Row gutter={16} style={{ marginTop: 16 }}>
                    <Col span={12}>
                      <Statistic title="Pending Orders" value={23} />
                    </Col>
                    <Col span={12}>
                      <Statistic title="Completion Rate" value={94} suffix="%" />
                    </Col>
                  </Row>
                </Card>
              </Col>
            </Row>

            {/* Tables Section */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="Sales Performance" style={{ marginBottom: 24 }}>
                  <Table
                    columns={salesColumns}
                    dataSource={salesData}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="Recent Orders" style={{ marginBottom: 24 }}>
                  <Table
                    columns={orderColumns}
                    dataSource={recentOrders}
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            </Row>
          </div>
        </Content>

        <Footer style={{ textAlign: 'center' }}>
          AntD Dashboard ©{new Date().getFullYear()} Created with Ant Design
        </Footer>
      </Layout>
    </Layout>
  );
};
export default Dashboard;