import React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAddGenreMutation } from '../../../services/genres/genreApi';
import GenreForm from '../GenreForm';

export default function StepGenre() {
  const navigate = useNavigate();
  const [addGenre, { isLoading }] = useAddGenreMutation();
  async function submit(body) {
    try {
      const result = await addGenre(body).unwrap();
      if (result.acknowledgement === false) throw result;
      toast.success(result.description || 'ژانر ذخیره شد.');
      navigate('/genres');
    } catch (error) {
      toast.error(error.data?.message || error.description || 'ذخیره ژانر ناموفق بود.');
    }
  }
  return <GenreForm onSubmit={submit} isLoading={isLoading} />;
}
