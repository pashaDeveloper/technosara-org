const routes = [
  {
    name: "محصول",
    paths: [
      {
        name: "افزودن محصول",
        path: "/dashboard/add-product",
      },
      {
        name: "فهرست محصولات",
        path: "/dashboard/list-products",
      },
    ],
  },
  {
    name: "دسته‌بندی",
    paths: [
      {
        name: "افزودن دسته‌بندی",
        path: "/dashboard/add-category",
      },
      {
        name: "فهرست دسته‌بندی‌ها",
        path: "/dashboard/list-categories",
      },
    ],
  },
  {
    name: "فروشگاه",
    paths: [
      {
        name: "افزودن فروشگاه",
        path: "/dashboard/add-store",
      },
      {
        name: "فهرست فروشگاه‌ها",
        path: "/dashboard/list-stores",
      },
    ],
  },
  {
    name: "برند",
    paths: [
      {
        name: "افزودن برند",
        path: "/dashboard/add-brand",
      },
      {
        name: "فهرست برندها",
        path: "/dashboard/list-brands",
      },
    ],
  },
  {
    name: "کاربر",
    paths: [
      {
        name: "افزودن کاربر",
        path: "/dashboard/add-user",
      },
      {
        name: "فهرست کاربران",
        path: "/dashboard/list-users",
      },
    ],
  },
];

export default routes;
