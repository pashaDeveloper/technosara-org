export type SharedPublicUser = {
  id: string;
  name: string;
  email: string;
  username: string;
  role: 'admin' | 'superAdmin';
  adminRole: 'admin' | 'superAdmin';
};
