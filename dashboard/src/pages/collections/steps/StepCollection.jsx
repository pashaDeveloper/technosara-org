import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddCollectionMutation } from '../../../services/collections/collectionApi';
import CollectionForm from '../CollectionForm';

export default function StepCollection() {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const [addCollection, { isLoading }] = useAddCollectionMutation();
  async function submit(body) {
    try {
      const result = await addCollection(body).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'کالکشن ذخیره شد.');
      navigate('/collections' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره کالکشن ناموفق بود.');
    }
  }
  return <CollectionForm onSubmit={submit} isLoading={isLoading} />;
}
