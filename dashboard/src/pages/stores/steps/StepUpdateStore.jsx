import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetStoreQuery, useUpdateStoreMutation } from '../../../services/store/storeApi';
import StoreForm from '../StoreForm';

export default function StepUpdateStore() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetStoreQuery({ id }, { skip: !id });
  const [updateStore, { isLoading }] = useUpdateStoreMutation();
  async function submit(body) {
    try {
      const result = await updateStore({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'فروشگاه ذخیره شد.');
      navigate('/stores' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره فروشگاه ناموفق بود.');
    }
  }
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت فروشگاه ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <StoreForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading} />;
}
