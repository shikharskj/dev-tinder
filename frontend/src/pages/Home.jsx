import { ArrowRight, Code2, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";

const Home = () => {
  const { user } = useAuth();

  return (
    <div className="home-page">
      <section className="home-hero" aria-labelledby="home-heading">
        <div className="home-hero__content">
          <p className="eyebrow">
            <Code2 size={15} aria-hidden="true" /> A community for people who
            build
          </p>
          <h1 id="home-heading">Good work starts with good people.</h1>
          <p className="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
            Find developers who share your curiosity, trade ideas, and make your
            next project better.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="btn btn-primary btn-lg"
              to={user ? "/feed" : "/sign-up"}
            >
              {user ? "Open your feed" : "Find your people"}
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            {!user && (
              <Link
                className="btn btn-outline btn-lg border-white/60 text-white hover:border-white hover:bg-white hover:text-neutral"
                to="/login"
              >
                Sign in
              </Link>
            )}
          </div>
          <div className="mt-10 flex items-center gap-3 text-sm text-white/70">
            <UsersRound size={18} aria-hidden="true" />
            <span>Built for collaboration, not endless swiping.</span>
          </div>
        </div>
      </section>

      <section className="home-values" aria-label="How DevTinder works">
        <div>
          <span className="value-index">01</span>
          <h2>Show what you’re building</h2>
          <p>
            Make your profile about the skills, interests, and ideas you want to
            share.
          </p>
        </div>
        <div>
          <span className="value-index">02</span>
          <h2>Meet your kind of curious</h2>
          <p>
            Discover developers and start with a genuine connection request.
          </p>
        </div>
        <div>
          <span className="value-index">03</span>
          <h2>Make something together</h2>
          <p>
            Turn shared interests into useful conversations and better projects.
          </p>
        </div>
      </section>
    </div>
  );
};

export default Home;
