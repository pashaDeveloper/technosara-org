import React from 'react';
import BrandForm from './BrandForm';
import { useAddBrandMutation } from '../../../services/brand/brandApi';
export default function StepBrand() {
  const [add, { isLoading }] = useAddBrandMutation();
  return <BrandForm isLoading={isLoading} save={body => add(body).unwrap()} />;
}
