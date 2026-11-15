import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetCollectionQuery, useUpdateCollectionMutation } from '../../../services/collections/collectionApi';
import CollectionForm from '../CollectionForm';

export default function StepUpdateCollection() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetCollectionQuery({ id }, { skip: !id });
  const [updateCollection, { isLoading }] = useUpdateCollectionMutation();
  async function submit(body) {
    try {
      const result = await updateCollection({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'کالکشن ذخیره شد.');
      navigate('/collections' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره کالکشن ناموفق بود.');
    }
  }
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت کالکشن ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <CollectionForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading} />;
}
