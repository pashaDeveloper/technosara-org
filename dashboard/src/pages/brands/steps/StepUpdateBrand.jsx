import React from 'react';
import { useParams } from 'react-router-dom';
import Spinner from '../../../components/shared/Spinner';
import BrandForm from './BrandForm';
import { useGetBrandQuery, useUpdateBrandMutation } from '../../../services/brand/brandApi';
export default function StepUpdateBrand() {
  const { id } = useParams();
  const record = useGetBrandQuery({ id }, { skip: !id });
  const [update, { isLoading }] = useUpdateBrandMutation();
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت اطلاعات برند ناموفق بود. <button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <BrandForm record={record.data.data} isLoading={isLoading} save={body => update({ id, body }).unwrap()} />;
}
