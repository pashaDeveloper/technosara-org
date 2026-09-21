const Admin = require('../models/admin.model');
const addressFields = ['province', 'city', 'address', 'plateNumber', 'postalCode'];
const fields = ['name', 'email', 'phone', 'province', 'city', 'address', 'plateNumber', 'postalCode', 'nationalCode', 'identityNumber', 'birthDate', 'bio'];
const valueOf = (admin, key) => {
  if (addressFields.includes(key)) return admin.addressInfo?.[key] || '';
  if (key === 'birthDate') return admin.birthDate ? admin.birthDate.toISOString().slice(0, 10) : '';
  return admin[key] || '';
};

exports.serialize = admin => ({
  id: String(admin._id), role: admin.role, status: admin.status,
  avatar: { url: admin.avatar?.url || '' },
  profileVersion: admin.__v || 0,
  ...Object.fromEntries(fields.map(key => [key, valueOf(admin, key)])),
});

exports.update = async (req, res) => {
  const body = req.body || {};
  const fail = (status, message) => res.status(status).json({ message });
  const allowed = [...fields, 'avatarUrl', 'currentPassword', 'newPassword', 'confirmPassword'];
  if (Object.keys(body).some(key => !allowed.includes(key))) return fail(400, 'فیلد ارسالی مجاز نیست.');
  if (Object.values(body).some(value => typeof value !== 'string')) return fail(400, 'اطلاعات واردشده معتبر نیست.');
  const admin = await Admin.findById(req.admin._id).select('+password');
  if (!admin || admin.status !== 'active') return fail(401, 'نشست معتبر نیست.');
  const changingPassword = Boolean(body.newPassword || body.currentPassword || body.confirmPassword);
  if (changingPassword) {
    if (!body.newPassword || body.newPassword.length < 8 || Buffer.byteLength(body.newPassword) > 72) return fail(400, 'رمز جدید باید حداقل ۸ نویسه و حداکثر ۷۲ بایت باشد.');
    if (body.newPassword !== body.confirmPassword) return fail(400, 'تکرار رمز عبور مطابقت ندارد.');
    if (!body.currentPassword || !await admin.comparePassword(body.currentPassword)) return fail(400, 'رمز عبور فعلی صحیح نیست.');
    admin.password = body.newPassword;
  }
  for (const key of fields) {
    if (body[key] === undefined) continue;
    if (addressFields.includes(key)) {
      if (!admin.addressInfo) admin.addressInfo = {};
      admin.addressInfo[key] = body[key].trim();
      admin.markModified('addressInfo');
    } else {
      admin[key] = key === 'birthDate' ? body[key].trim() || null : body[key].trim();
    }
  }
  const uploadedAvatar = req.uploadedFiles?.avatar?.[0];
  if (uploadedAvatar) {
    admin.avatar = { url: uploadedAvatar.url, public_id: uploadedAvatar.key, storage: uploadedAvatar.storage, blur: uploadedAvatar.blur, copies: uploadedAvatar.copies };
  } else if (body.avatarUrl !== undefined) {
    const value = body.avatarUrl;
    if (!value.trim()) return fail(400, 'تصویر پروفایل قابل حذف نیست؛ تصویر دیگری انتخاب کنید.');
    let preset = false;
    try {
      const url = new URL(value);
      preset = ['http:', 'https:'].includes(url.protocol)
        && !url.username && !url.password && !url.search && !url.hash
        && [`${req.protocol}://${req.get('host')}`, process.env.NEXT_PUBLIC_DASHBOARD_URL].includes(url.origin)
        && /^\/avatar\/(?:male\/(?:[1-9]|[1-4]\d|50)|female\/(?:5[1-9]|[6-9]\d|100))\.png$/.test(url.pathname);
    } catch { /* Device images are data URLs. */ }
    if (value && !preset && (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value) || Buffer.byteLength(value) > 350000)) return fail(400, 'یک آواتار آماده یا تصویر PNG، JPEG یا WebP با حجم حداکثر ۲۵۶ کیلوبایت انتخاب کنید.');
    admin.avatar = { url: value };
  }
  try {
    await admin.save();
  } catch (error) {
    if (error.name === 'VersionError') return fail(409, 'اطلاعات حساب تغییر کرده است. صفحه را تازه کنید و دوباره تلاش کنید.');
    if (error.code === 11000) return fail(409, 'این ایمیل قبلاً ثبت شده است.');
    if (error.name === 'ValidationError') return fail(400, 'نام، ایمیل و قالب اطلاعات تماس و هویت را بررسی کنید.');
    throw error;
  }
  req.commitUploads?.();
  return res.json({ data: exports.serialize(admin), description: 'تغییرات پروفایل ذخیره شد.' });
};
