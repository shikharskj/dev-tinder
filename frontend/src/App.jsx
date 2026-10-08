import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Layout from "./Layout/Layout";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import Requests from "./pages/Requests";
import Connections from "./pages/Connections";
import ChatRoom from "./pages/ChatRoom";
import NotFound from "./pages/NotFound";
import { GuestOnly, RequireAuth } from "./utils/RouteGuards";
import { AuthProvider } from "./context/AuthContext";
import EnrollPremium from "./pages/EnrollPremium";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      {
        path: "privacy-policy",
        element: <PrivacyPolicy />,
      },
      {
        path: "login",
        element: (
          <GuestOnly>
            <Login />
          </GuestOnly>
        ),
      },
      {
        path: "sign-up",
        element: (
          <GuestOnly>
            <SignUp />
          </GuestOnly>
        ),
      },
      {
        path: "feed",
        element: (
          <RequireAuth>
            <Feed />
          </RequireAuth>
        ),
      },
      {
        path: "profile",
        element: (
          <RequireAuth>
            <Profile />
          </RequireAuth>
        ),
      },
      {
        path: "requests",
        element: (
          <RequireAuth>
            <Requests />
          </RequireAuth>
        ),
      },
      {
        path: "connections",
        element: (
          <RequireAuth>
            <Connections />
          </RequireAuth>
        ),
      },
      {
        path: "enroll-premium",
        element: (
          <RequireAuth>
            <EnrollPremium />
          </RequireAuth>
        ),
      },
      {
        path: "chat/:targetUserId",
        element: (
          <RequireAuth>
            <ChatRoom />
          </RequireAuth>
        ),
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
