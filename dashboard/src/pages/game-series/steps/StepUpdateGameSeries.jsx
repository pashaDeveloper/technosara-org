import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetGameSeriesQuery, useUpdateGameSeriesMutation } from '../../../services/game-series/gameSeriesApi';
import GameSeriesForm from '../GameSeriesForm';

export default function StepUpdateGameSeries() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetGameSeriesQuery({ id }, { skip: !id });
  const [updateGameSeries, { isLoading }] = useUpdateGameSeriesMutation();
  async function submit(body) {
    try {
      const result = await updateGameSeries({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'سری بازی ذخیره شد.');
      navigate('/game-series' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره سری بازی ناموفق بود.');
    }
  }
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت سری بازی ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <GameSeriesForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading} />;
}
