import Catalog from './pages/catalog';
import GameList from './pages/games';
import AddGame from './pages/games/add';
import UpdateGame from './pages/games/update';
import React, { useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import Providers from "./providers";
import Auth from "./auth"
import "./css/style.css";
import "./charts/ChartjsConfig";
import Dashboard from "./pages/Dashboard";
import Translation from "./pages/Translation";
import Profile from "./pages/profile";
import SignIn from "./pages/auth/signin/index";
import SignUp from "./pages/auth/signup/index";
import Users from "./pages/users/index";
import PlatformList from "./pages/platforms";
import Brands from "./pages/brands";
import AddBrand from "./pages/brands/add";
import UpdateBrand from "./pages/brands/update";
import AddPlatform from "./pages/platforms/add";
import UpdatePlatform from "./pages/platforms/update";
import GameTagList from "./pages/game-tags";
import AddGameTag from "./pages/game-tags/add";
import UpdateGameTag from "./pages/game-tags/update";
import CollectionList from "./pages/collections";
import AddCollection from "./pages/collections/add";
import UpdateCollection from "./pages/collections/update";
import GameModeList from "./pages/game-modes";
import AddGameMode from "./pages/game-modes/add";
import UpdateGameMode from "./pages/game-modes/update";
import GameSeriesList from "./pages/game-series";
import AddGameSeries from "./pages/game-series/add";
import UpdateGameSeries from "./pages/game-series/update";
import StoreList from "./pages/stores";
import AddStore from "./pages/stores/add";
import UpdateStore from "./pages/stores/update";
import GenreList from "./pages/genres";
import AddGenre from "./pages/genres/add";
import UpdateGenre from "./pages/genres/update";
import CompanyList from "./pages/companies";
import PeopleList from "./pages/people";
import PersonForm from "./pages/people/PersonForm";
import AddCompany from "./pages/companies/add";
import UpdateCompany from "./pages/companies/update";
import { Toaster } from "react-hot-toast";
import Tags from "./pages/tags";
import AddTag from "./pages/tags/add";
import UpdateTag from "./pages/tags/UpdateTag";
import Magazines from "./pages/magazines";
import MagazineInfo from "./pages/magazines/info/index";
import AddMagazine from "./pages/magazines/add";
import Blogs from "./pages/blogs";
import BlogInfo from "./pages/blogs/info/index";
import AddBlog from "./pages/blogs/add";
import Galleries from "./pages/galleries";
import Units from "./pages/units";
import Categories from "./pages/categories";
import AddCategory from "./pages/categories/add";
import Addresses from "./pages/addresses";
import Carts from "./pages/carts";
import Payments from "./pages/payments";
import Orders from "./pages/orders";
import Products from "./pages/products";
import AddProduct from "./pages/products/add";
import UpdateProduct from "./pages/products/update/index";
import Settings from "./pages/settings";
import FeaturedProduct from "./pages/settings/featuredProduct/index";
import Banners from "./pages/banners";
import Stories from "./pages/stories";
import AddStory from "./pages/stories/add";
import CategoryFilters from "./pages/categoryFilters";
import CategoryFilterForm from "./pages/categoryFilters/CategoryFilterForm";
import FilterDefinitions from "./pages/filterDefinitions";
import ProductAttributes from "./pages/productAttributes";
import Sessions from "./pages/sessions";
import News from "./pages/news";
import AddNews from "./pages/news/add";

function App() {
  const location = useLocation();

  useEffect(() => {
    document.querySelector("html").style.scrollBehavior = "auto";
    window.scroll({ top: 0 });
    document.querySelector("html").style.scrollBehavior = "";
    document.querySelector("html").setAttribute("dir", "rtl");
  }, [location.pathname]);
  return (
    <Providers>
      <Toaster />
      
        <Routes>
<Route path="/signin" element={<SignIn />} />
<Route path="/signup" element={<SignUp />} />
<Route element={<Auth />}>
          <Route exact path="/" element={<Dashboard />} />
          <Route path="/translation" element={<Translation />} />
          <Route exact path="/my-profile" element={<Profile />} />


          <Route exact path="/users" element={<Users />} />
          <Route path="/platforms" element={<PlatformList />} />
          <Route path="/brands" element={<Brands />} />
          <Route path="/brands/add" element={<AddBrand />} />
          <Route path="/brands/update/:id" element={<UpdateBrand />} />
          <Route path="/platforms/add" element={<AddPlatform />} />
          <Route path="/platforms/update/:id" element={<UpdatePlatform />} />
          <Route path="/games" element={<GameList />} />
          <Route path="/catalog" element={<Catalog />} />
          <Route path="/games/add" element={<AddGame />} />
          <Route path="/games/update/:id" element={<UpdateGame />} />
          <Route path="/game-tags" element={<GameTagList />} />
          <Route path="/game-tags/add" element={<AddGameTag />} />
          <Route path="/game-tags/update/:id" element={<UpdateGameTag />} />
          <Route path="/collections" element={<CollectionList />} />
          <Route path="/collections/add" element={<AddCollection />} />
          <Route path="/collections/update/:id" element={<UpdateCollection />} />
          <Route path="/game-modes" element={<GameModeList />} />
          <Route path="/game-modes/add" element={<AddGameMode />} />
          <Route path="/game-modes/update/:id" element={<UpdateGameMode />} />
          <Route path="/game-series" element={<GameSeriesList />} />
          <Route path="/game-series/add" element={<AddGameSeries />} />
          <Route path="/game-series/update/:id" element={<UpdateGameSeries />} />
          <Route path="/stores" element={<StoreList />} />
          <Route path="/stores/add" element={<AddStore />} />
          <Route path="/stores/update/:id" element={<UpdateStore />} />
          <Route path="/genres" element={<GenreList />} />
          <Route path="/genres/add" element={<AddGenre />} />
          <Route path="/genres/update/:id" element={<UpdateGenre />} />
          <Route path="/companies" element={<CompanyList />} />
          <Route path="/people" element={<PeopleList />} />
          <Route path="/people/add" element={<PersonForm />} />
          <Route path="/people/update/:id" element={<PersonForm />} />
          <Route path="/companies/add" element={<AddCompany />} />
          <Route path="/companies/update/:id" element={<UpdateCompany />} />
          <Route exact path="/sessions" element={<Sessions />} />
          <Route exact path="/tags" element={<Tags />} />
          <Route exact path="/tags/add" element={<AddTag />} />
          <Route exact path="/tags/update/:id" element={<UpdateTag />} />
          <Route exact path="/categories" element={<Categories />} />
          <Route exact path="/filter-definitions" element={<FilterDefinitions />} />
          <Route exact path="/product-attributes" element={<ProductAttributes />} />
          <Route exact path="/category-filters" element={<CategoryFilters />} />
          <Route exact path="/category-filters/add" element={<CategoryFilterForm />} />
          <Route exact path="/category-filters/edit/:id" element={<CategoryFilterForm mode="edit" />} />
          <Route exact path="/units" element={<Units />} />
          <Route exact path="/magazines" element={<Magazines />} />
          <Route exact path="/settings" element={<Settings />} />
          <Route exact path="/settings/featuredProduct" element={<FeaturedProduct />} />
          <Route exact path="/magazines/add" element={<AddMagazine />} />
          <Route exact path="/blogs" element={<Blogs />} />
          <Route exact path="/blogs/add" element={<AddBlog />} />
          <Route exact path="/galleries" element={<Galleries />} />
          <Route exact path="/categories/add" element={<AddCategory />} />
          <Route exact path="/products" element={<Products />} />
          <Route exact path="/addresses" element={<Addresses />} />
          <Route exact path="/payments" element={<Payments />} />
          <Route exact path="/orders" element={<Orders />} />
          <Route exact path="/carts" element={<Carts />} />
          <Route exact path="/products/add" element={<AddProduct />} />
          <Route exact path="/products/update/:product_id" element={<UpdateProduct />} />
          <Route path="/magazines/info/:id" element={<MagazineInfo />} />
          <Route exact path="/stories/add" element={<AddStory />} />
          <Route exact path="/stories" element={<Stories />} />
          <Route exact path="/banners" element={<Banners />} />
          <Route exact path="/news" element={<News />} />
          <Route exact path="/news/add" element={<AddNews />} />
        </Route>
<Route path="*" element={<Navigate to="/" replace />} />
</Routes>
      
    </Providers>
  );
}

export default App;
