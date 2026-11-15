import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddStoreMutation } from '../../../services/store/storeApi';
import StoreForm from '../StoreForm';

export default function StepStore() {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const [addStore, { isLoading }] = useAddStoreMutation();
  async function submit(body) {
    try {
      const result = await addStore(body).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'فروشگاه ذخیره شد.');
      navigate('/stores' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره فروشگاه ناموفق بود.');
    }
  }
  return <StoreForm onSubmit={submit} isLoading={isLoading} />;
}
