import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetGameTagQuery, useUpdateGameTagMutation } from '../../../services/game-tags/gameTagApi';
import GameTagForm from '../GameTagForm';

export default function StepUpdateGameTag() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetGameTagQuery({ id }, { skip: !id });
  const [updateGameTag, { isLoading }] = useUpdateGameTagMutation();
  async function submit(body) {
    try {
      const result = await updateGameTag({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'تگ بازی ذخیره شد.');
      navigate('/game-tags' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره تگ بازی ناموفق بود.');
    }
  }
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت تگ بازی ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <GameTagForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading} />;
}
