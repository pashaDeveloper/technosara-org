import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetGameModeQuery, useUpdateGameModeMutation } from '../../../services/game-modes/gameModeApi';
import GameModeForm from '../GameModeForm';

export default function StepUpdateGameMode() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetGameModeQuery({ id }, { skip: !id });
  const [updateGameMode, { isLoading }] = useUpdateGameModeMutation();
  async function submit(body) {
    try {
      const result = await updateGameMode({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'حالت بازی ذخیره شد.');
      navigate('/game-modes' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره حالت بازی ناموفق بود.');
    }
  }
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت حالت بازی ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <GameModeForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading} />;
}
