import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddGameModeMutation } from '../../../services/game-modes/gameModeApi';
import GameModeForm from '../GameModeForm';

export default function StepGameMode() {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const [addGameMode, { isLoading }] = useAddGameModeMutation();
  async function submit(body) {
    try {
      const result = await addGameMode(body).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'حالت بازی ذخیره شد.');
      navigate('/game-modes' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره حالت بازی ناموفق بود.');
    }
  }
  return <GameModeForm onSubmit={submit} isLoading={isLoading} />;
}
