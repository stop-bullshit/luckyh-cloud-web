import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Descriptions, Drawer, message, Popconfirm, Tag } from 'antd';
import { useRef, useState } from 'react';
import {
  type BusinessUser,
  createUser,
  deleteUser,
  getUser,
  getUsers,
  type UserInput,
  updateUser,
} from '@/services/luckyh';

export default function Users() {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<BusinessUser>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUser, setDetailUser] = useState<BusinessUser>();

  const showDetails = async (id: number) => {
    setDetailUser(undefined);
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      setDetailUser(await getUser(id));
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ProColumns<BusinessUser>[] = [
    { title: 'ID', dataIndex: 'id', width: 72, search: false },
    {
      title: '用户名',
      dataIndex: 'username',
      fieldProps: { placeholder: '输入用户名查询', allowClear: true },
      render: (_, record) => (
        <Button
          type="link"
          style={{ padding: 0 }}
          disabled={detailLoading}
          onClick={() => showDetails(record.id)}
        >
          {record.username}
        </Button>
      ),
    },
    { title: '真实姓名', dataIndex: 'realName', search: false },
    { title: '邮箱', dataIndex: 'email', search: false, ellipsis: true },
    { title: '手机号', dataIndex: 'phone', search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 92,
      search: false,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'success' : 'default'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      width: 168,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 174,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          size="small"
          disabled={detailLoading}
          onClick={() => showDetails(record.id)}
        >
          详情
        </Button>,
        <Button
          key="edit"
          type="link"
          size="small"
          onClick={() => {
            setEditingUser(record);
            setFormOpen(true);
          }}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确认删除此用户？"
          description={`将删除 ${record.realName}（${record.username}）的业务资料。`}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={async () => {
            try {
              await deleteUser(record.id);
              messageApi.success('用户已删除');
              actionRef.current?.reload();
              return true;
            } catch {
              return false;
            }
          }}
        >
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <PageContainer title="用户管理" subTitle="维护订单关联的业务用户资料">
      {contextHolder}
      <ProTable<BusinessUser, { username?: string }>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        headerTitle="业务用户"
        size="middle"
        scroll={{ x: 1080 }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        request={async ({ current, pageSize, username }) => {
          try {
            const page = await getUsers({
              current,
              size: pageSize,
              username: username?.trim() || undefined,
            });
            return { data: page.records, total: page.total, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingUser(undefined);
              setFormOpen(true);
            }}
          >
            新建用户
          </Button>,
        ]}
      />
      {formOpen && (
        <ModalForm<UserInput>
          key={editingUser?.id ?? 'new'}
          title={editingUser ? '编辑用户' : '新建用户'}
          open={formOpen}
          onOpenChange={setFormOpen}
          width={480}
          initialValues={editingUser}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async (values) => {
            const input: UserInput = {
              username: values.username.trim(),
              realName: values.realName.trim(),
              email: values.email?.trim() || undefined,
              phone: values.phone?.trim() || undefined,
            };
            try {
              if (editingUser) {
                await updateUser(editingUser.id, input);
              } else {
                await createUser(input);
              }
              messageApi.success(editingUser ? '用户已更新' : '用户已创建');
              actionRef.current?.reload();
              return true;
            } catch {
              return false;
            }
          }}
        >
          <ProFormText
            name="username"
            label="用户名"
            placeholder="请输入业务用户名"
            rules={[
              { required: true, whitespace: true, message: '请输入用户名' },
            ]}
          />
          <ProFormText
            name="realName"
            label="真实姓名"
            placeholder="请输入真实姓名"
            rules={[
              { required: true, whitespace: true, message: '请输入真实姓名' },
            ]}
          />
          <ProFormText
            name="email"
            label="邮箱"
            placeholder="选填"
            rules={[{ type: 'email', message: '请输入有效的邮箱地址' }]}
          />
          <ProFormText
            name="phone"
            label="手机号"
            placeholder="选填"
            fieldProps={{ maxLength: 11 }}
            rules={[
              { pattern: /^1[3-9]\d{9}$/, message: '请输入有效的手机号' },
            ]}
          />
        </ModalForm>
      )}
      <Drawer
        title="用户详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        loading={detailLoading}
        size={480}
        destroyOnHidden
        extra={
          detailUser && (
            <Button
              onClick={() =>
                history.push(`/business/orders?userId=${detailUser.id}`)
              }
            >
              查看关联订单
            </Button>
          )
        }
      >
        {detailUser && (
          <Descriptions
            column={1}
            bordered
            size="small"
            items={[
              { key: 'id', label: '用户 ID', children: detailUser.id },
              {
                key: 'username',
                label: '用户名',
                children: detailUser.username,
              },
              {
                key: 'realName',
                label: '真实姓名',
                children: detailUser.realName,
              },
              {
                key: 'email',
                label: '邮箱',
                children: detailUser.email || '—',
              },
              {
                key: 'phone',
                label: '手机号',
                children: detailUser.phone || '—',
              },
              {
                key: 'status',
                label: '状态',
                children: (
                  <Tag color={detailUser.status === 1 ? 'success' : 'default'}>
                    {detailUser.status === 1 ? '启用' : '禁用'}
                  </Tag>
                ),
              },
              {
                key: 'createTime',
                label: '创建时间',
                children: detailUser.createTime?.replace('T', ' ') || '—',
              },
              {
                key: 'updateTime',
                label: '更新时间',
                children: detailUser.updateTime?.replace('T', ' ') || '—',
              },
            ]}
          />
        )}
      </Drawer>
    </PageContainer>
  );
}
