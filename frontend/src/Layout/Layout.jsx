import NavBar from "../components/NavBar";
import { Outlet, useLocation } from "react-router-dom";
import Footer from "../components/Footer";

const Layout = () => {
  const { pathname } = useLocation();
  const isChat = pathname.startsWith("/chat/");

  return (
    <div className={`app-shell${isChat ? " is-chat" : ""}`} data-theme="light">
      <NavBar />
      <main className="app-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
