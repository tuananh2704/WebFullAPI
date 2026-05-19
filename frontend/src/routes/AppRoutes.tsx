import { BrowserRouter, Routes, Route } from "react-router-dom";

import MainLayout from "../layouts/MainLayout";
import AdminPage from "../pages/Admin/AdminPage";
import AuthPage from "../pages/Auth/AuthPage";
import BookingHistoryPage from "../pages/Bookings/BookingHistoryPage";
import Home from "../pages/Home/Home";
import MovieDetailPage from "../pages/Movies/MovieDetailPage";
import MoviesPage from "../pages/Movies/MoviesPage";
import ProfilePage from "../pages/Profile/ProfilePage";
import CinemaListPage from "../pages/Cinemas/CinemaListPage";
import CinemaDetailPage from "../pages/Cinemas/CinemaDetailPage";
import MembershipPage from "../pages/Membership/MembershipPage";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="movies/:id" element={<MovieDetailPage />} />
          <Route path="cinemas" element={<CinemaListPage />} />
          <Route path="cinemas/:id" element={<CinemaDetailPage />} />
          <Route path="bookings" element={<BookingHistoryPage />} />
          <Route path="membership" element={<MembershipPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
