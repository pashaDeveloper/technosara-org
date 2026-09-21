import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { Navigate, Outlet } from 'react-router-dom';
import { usePersistLoginQuery } from './services/auth/authApi';
import { addAdmin } from './features/auth/authSlice';
import Spinner from './components/shared/Spinner';

export default function Auth() {
  const dispatch = useDispatch();
  const { data, error, isLoading, refetch } = usePersistLoginQuery(undefined, { refetchOnMountOrArgChange: true });
  const unauthorized = error?.status === 401 || error?.status === 403;

  useEffect(() => {
    if (data?.data) dispatch(addAdmin(data.data));
    if (unauthorized) {
      dispatch(addAdmin({}));
    }
  }, [data, unauthorized, dispatch]);

  if (unauthorized) return <Navigate to="/signin" replace />;
  if (isLoading) return (
    <div role="status" aria-label="در حال بارگذاری" className="flex min-h-screen items-center justify-center text-indigo-500">
      <Spinner aria-hidden="true" />
    </div>
  );
  if (error || !data?.data) return (
    <div role="alert" className="p-8">
      <p>دریافت اطلاعات حساب امکان‌پذیر نیست. اتصال به سرور را بررسی کنید.</p>
      <button className="btn mt-4 bg-white dark:bg-gray-800" onClick={refetch}>تلاش دوباره</button>
    </div>
  );
  return <Outlet context={data.data} />;
}
