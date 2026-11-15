import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddGameTagMutation } from '../../../services/game-tags/gameTagApi';
import GameTagForm from '../GameTagForm';

export default function StepGameTag() {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const [addGameTag, { isLoading }] = useAddGameTagMutation();
  async function submit(body) {
    try {
      const result = await addGameTag(body).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'تگ بازی ذخیره شد.');
      navigate('/game-tags' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره تگ بازی ناموفق بود.');
    }
  }
  return <GameTagForm onSubmit={submit} isLoading={isLoading} />;
}
