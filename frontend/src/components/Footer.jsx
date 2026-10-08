import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="hidden border-t border-base-300/70 px-6 py-5 text-sm text-base-content/55 md:block">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <span>DevTinder</span>
        <span>Meet your next favorite collaborator.</span>
        <Link to="/privacy-policy" className="link link-hover">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
