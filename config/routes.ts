export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  {
    path: '/welcome',
    name: 'welcome',
    icon: 'smile',
    component: './Welcome',
  },
  {
    path: '/admin',
    name: 'admin',
    icon: 'crown',
    access: 'canAdmin',
    routes: [
      {
        path: '/admin',
        redirect: '/admin/sub-page',
      },
      {
        path: '/admin/sub-page',
        name: 'sub-page',
        component: './Admin',
      },
    ],
  },
  {
    path: '/business',
    name: 'business',
    icon: 'appstore',
    routes: [
      { path: '/business', redirect: '/business/users' },
      { path: '/business/users', name: 'users', component: './Users' },
      { path: '/business/products', name: 'products', component: './Products' },
      { path: '/business/orders', name: 'orders', component: './Orders' },
      {
        path: '/business/inventory',
        name: 'inventory',
        component: './Inventory',
      },
      { path: '/business/accounts', name: 'accounts', component: './Accounts' },
      {
        path: '/business/transactions',
        name: 'transactions',
        component: './Transactions',
      },
    ],
  },
  {
    name: 'list.table-list',
    icon: 'table',
    path: '/list',
    component: './table-list',
  },
  {
    path: '/',
    redirect: '/welcome',
  },
  {
    component: './exception/404',
    layout: false,
    path: './*',
  },
];
