// Isolated account service fixture; never connects to MongoDB.
module.exports = function dashboardFixture() {
  const state = { required: true, role: 'superAdmin', active: true, registrations: [] };
  const user = () => ({ _id: '1', name: 'Admin', email: 'admin@example.com', role: state.role, status: state.active ? 'active' : 'inactive' });
  return {
    state,
    Admin: { findById: async () => user() },
    verify(req, res, next) {
      if (req.headers.authorization !== 'Bearer smoke-token') return res.status(401).json({ message: 'Invalid session' });
      req.admin = { _id: '1' };
      next();
    },
    service: {
      needsSetup: async () => state.required,
      async signIn(req, res) {
        if (req.body.email !== 'admin@example.com' || req.body.password !== 'password-123') return res.status(401).json({ description: 'Invalid credentials' });
        res.json({ token: 'smoke-token', accessToken: 'smoke-token' });
      },
      async signUp(req, res) {
        state.registrations.push(req.body);
        state.required = false;
        res.status(201).json({ isSuccess: true });
      },
      async persistLogin(req, res) {
        const admin = user();
        res.json({ data: { id: admin._id, name: admin.name, email: admin.email, role: admin.role } });
      },
    },
  };
};
