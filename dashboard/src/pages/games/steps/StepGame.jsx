import { useLocation } from 'react-router-dom';
﻿import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddGameMutation, useUpdateGameMutation } from '../../../services/games/gameApi';
import GameForm from '../GameForm';

export default function StepGame() {
  const { search: listQuery } = useLocation();
  const navigate = useNavigate();
  const [addGame, { isLoading }] = useAddGameMutation();
  const [updateGame] = useUpdateGameMutation();
  const [finalizing, setFinalizing] = useState(false);
  async function submit(body, saveDlc, savedId) {
    setFinalizing(true);
    try {
      const result = await (savedId ? updateGame({ id: savedId, body }) : addGame(body)).unwrap();
      if (result.acknowledgement === false) throw result;
      const id = savedId || result.data?._id;
      if (id && saveDlc) {
        let report;
        try { report = await saveDlc(id); }
        catch { report = { failed: 1 }; }
        if (report?.failed) {
          toast.error('بازی ذخیره شد؛ دریافت بعضی محتواها یا تروفی‌ها ناموفق بود. از ویرایش بازی دوباره تلاش کنید.');
          navigate('/games/update/' + id + listQuery);
          return;
        }
      }
      toast.success(result.description || 'بازی ذخیره شد.');
      navigate('/games' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره بازی ناموفق بود.');
    } finally { setFinalizing(false); }
  }
  return <GameForm onSubmit={submit} isLoading={isLoading || finalizing} />;
}
