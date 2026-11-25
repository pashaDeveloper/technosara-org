/**
 * Title: Write a program using JavaScript on CartSlice
 * Author: Hasibul Islam
 * Portfolio: https://devhasibulislam.vercel.app
 * Linkedin: https://linkedin.com/in/devhasibulislam
 * GitHub: https://github.com/devhasibulislam
 * Facebook: https://facebook.com/devhasibulislam
 * Instagram: https://instagram.com/devhasibulislam
 * Twitter: https://twitter.com/devhasibulislam
 * Pinterest: https://pinterest.com/devhasibulislam
 * WhatsApp: https://wa.me/8801906315901
 * Telegram: devhasibulislam
 * Date: 20, January 2024
 */

import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  cart: [],
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setCart: (state, action) => {
      state.cart = action.payload;
    },
    addGuestItem: (state, { payload: { product, quantity } }) => {
      const item = state.cart.find((entry) => entry.product._id === product._id);
      if (item) item.quantity += quantity;
      else state.cart.push({ _id: product._id, product, quantity });
    },
    removeGuestItem: (state, { payload }) => {
      state.cart = state.cart.filter((item) => item._id !== payload);
    },
  },
});

export const { setCart, addGuestItem, removeGuestItem } = cartSlice.actions;
export default cartSlice.reducer;
