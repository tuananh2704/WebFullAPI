import { Link } from "react-router-dom";
import { deals } from "../homeData";

const DealsSection = () => {
  return (
    <section id="deals" className="deals-section">
      <div className="container">
        <h2>Khuyến mãi hot</h2>
        <div className="deal-grid">
          {deals.map((deal) => (
            <article className={`deal-card ${deal.variant}`} key={deal.title}>
              <span className="discount">{deal.discount}</span>
              <div>
                <h3>{deal.title}</h3>
                <p>{deal.description}</p>
                {deal.actionHref.startsWith("#") ? (
                  <a className="deal-shortcut" href={deal.actionHref}>
                    {deal.actionLabel}
                  </a>
                ) : (
                  <Link className="deal-shortcut" to={deal.actionHref}>
                    {deal.actionLabel}
                  </Link>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default DealsSection;
