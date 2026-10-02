import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormSelect,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Descriptions, Drawer, message, Popconfirm, Tag } from 'antd';
import { useRef, useState } from 'react';
import {
  createManagedUser,
  deleteManagedUser,
  getManagedUser,
  getManagedUsers,
  type ManagedUser,
  type ManagedUserInput,
  updateManagedUser,
} from '@/services/luckyh';

export default function Users() {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser>();
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailUser, setDetailUser] = useState<ManagedUser>();

  const showDetails = async (id: number) => {
    setDetailUser(undefined);
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      setDetailUser(await getManagedUser(id));
    } catch {
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const columns: ProColumns<ManagedUser>[] = [
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
      title: '用户类型',
      dataIndex: 'userType',
      width: 100,
      search: false,
      render: (_, record) =>
        record.userType === 1 ? <Tag color="blue">管理员</Tag> : '普通用户',
    },
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
          description={`将删除登录账户 ${record.realName}（${record.username}）。`}
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          onConfirm={async () => {
            try {
              await deleteManagedUser(record.id);
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
    <PageContainer title="用户管理" subTitle="维护系统登录账户">
      {contextHolder}
      <ProTable<ManagedUser, { username?: string }>
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        headerTitle="登录用户"
        size="middle"
        scroll={{ x: 1080 }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        request={async ({ current, pageSize, username }) => {
          try {
            const page = await getManagedUsers({
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
        <ModalForm<ManagedUserInput>
          key={editingUser?.id ?? 'new'}
          title={editingUser ? '编辑用户' : '新建用户'}
          open={formOpen}
          onOpenChange={setFormOpen}
          width={480}
          initialValues={editingUser}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async (values) => {
            const input: ManagedUserInput = {
              username: values.username.trim(),
              password: values.password?.trim() || undefined,
              realName: values.realName.trim(),
              email: values.email?.trim() || undefined,
              phone: values.phone?.trim() || undefined,
              userType: values.userType,
              status: values.status,
            };
            try {
              if (editingUser) {
                await updateManagedUser(editingUser.id, input);
              } else {
                await createManagedUser(input);
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
            placeholder="请输入登录用户名"
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
          <ProFormText.Password
            name="password"
            label="登录密码"
            placeholder={editingUser ? '留空表示不修改密码' : '请输入登录密码'}
            rules={
              editingUser
                ? []
                : [
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入登录密码',
                    },
                  ]
            }
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
          <ProFormSelect
            name="userType"
            label="用户类型"
            initialValue={2}
            options={[
              { label: '管理员', value: 1 },
              { label: '普通用户', value: 2 },
            ]}
            rules={[{ required: true, message: '请选择用户类型' }]}
          />
          <ProFormSelect
            name="status"
            label="状态"
            initialValue={1}
            options={[
              { label: '启用', value: 1 },
              { label: '禁用', value: 0 },
            ]}
            rules={[{ required: true, message: '请选择状态' }]}
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
                key: 'userType',
                label: '用户类型',
                children: detailUser.userType === 1 ? '管理员' : '普通用户',
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
                key: 'lastLoginTime',
                label: '最后登录时间',
                children: detailUser.lastLoginTime?.replace('T', ' ') || '—',
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
