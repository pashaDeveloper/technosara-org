import { useLocation } from 'react-router-dom';
﻿import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetGameQuery, useUpdateGameMutation } from '../../../services/games/gameApi';
import GameForm from '../GameForm';

export default function StepUpdateGame() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetGameQuery({ id }, { skip: !id });
  const [updateGame, { isLoading }] = useUpdateGameMutation();
  const [finalizing, setFinalizing] = useState(false);
  async function submit(body, saveDlc) {
    setFinalizing(true);
    try {
      const result = await updateGame({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      if (saveDlc) {
        let report;
        try { report = await saveDlc(id); }
        catch { report = { failed: 1 }; }
        if (report?.failed) {
          toast.error('بازی ذخیره شد؛ دریافت بعضی محتواها یا تروفی‌ها ناموفق بود. دوباره تلاش کنید.');
          return;
        }
      }
      toast.success(result.description || 'بازی ذخیره شد.');
      navigate('/games' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره بازی ناموفق بود.');
    } finally { setFinalizing(false); }
  }
  if (record.isFetching && !record.data?.data) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت بازی ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <GameForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading || finalizing} />;
}
