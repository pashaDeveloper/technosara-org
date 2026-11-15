import { useLocation } from 'react-router-dom';
﻿import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import Spinner from '../../../components/shared/Spinner';
import { useGetGenreQuery, useUpdateGenreMutation } from '../../../services/genres/genreApi';
import GenreForm from '../GenreForm';

export default function StepUpdateGenre() {
  const { search: listQuery } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();
  const record = useGetGenreQuery({ id }, { skip: !id });
  const [updateGenre, { isLoading }] = useUpdateGenreMutation();
  async function submit(body) {
    try {
      const result = await updateGenre({ id, body }).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'ژانر ذخیره شد.');
      navigate('/genres' + listQuery);
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره ژانر ناموفق بود.');
    }
  }
  if (record.isFetching) return <Spinner />;
  if (record.error || !record.data?.data) return <div role="alert">دریافت ژانر ناموفق بود.<button type="button" onClick={record.refetch}>تلاش دوباره</button></div>;
  return <GenreForm key={id} record={record.data.data} onSubmit={submit} isLoading={isLoading} />;
}
