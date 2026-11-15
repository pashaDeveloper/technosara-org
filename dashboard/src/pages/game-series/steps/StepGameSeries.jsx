import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddGameSeriesMutation } from '../../../services/game-series/gameSeriesApi';
import GameSeriesForm from '../GameSeriesForm';

export default function StepGameSeries() {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const [addGameSeries, { isLoading }] = useAddGameSeriesMutation();
  async function submit(body) {
    try {
      const result = await addGameSeries(body).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'سری بازی ذخیره شد.');
      navigate('/game-series' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره سری بازی ناموفق بود.');
    }
  }
  return <GameSeriesForm onSubmit={submit} isLoading={isLoading} />;
}
