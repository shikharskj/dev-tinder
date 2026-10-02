import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Layout from "./Layout/Layout";
import SignUp from "./pages/SignUp";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import Requests from "./pages/Requests";
import Connections from "./pages/Connections";
import NotFound from "./pages/NotFound";
import { GuestOnly, RequireAuth } from "./RouteGuards";
import { AuthProvider } from "./AuthContext";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
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
