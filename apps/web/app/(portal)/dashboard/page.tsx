import { featuredOffers } from '@/lib/demo';

export default function DashboardPage(){
  return <>
    <section className="hero-title">
      <h1>Welcome back, Mostafa!</h1>
      <p>Your rewards center is ready. Complete offers, surveys and tasks to grow your balance.</p>
    </section>
    <div className="notice">Your account is active. Complete your profile and keep security information up to date before requesting a cashout.</div>
    <div className="stats-grid mt">
      <div className="stat-card"><span>Available Balance</span><strong>0 Coins</strong><em>Ready to earn</em></div>
      <div className="stat-card"><span>Today</span><strong>0</strong><em>0 completed</em></div>
      <div className="stat-card"><span>Level</span><strong>1</strong><em>Bronze member</em></div>
      <div className="stat-card"><span>Referrals</span><strong>0</strong><em>Invite friends</em></div>
    </div>
    <div className="section-heading"><h2>Featured opportunities</h2><span>Hand-picked earning options</span></div>
    <div className="offer-grid">
      {featuredOffers.map((offer)=><div className="offer-card featured" key={offer.id}>
        <span className="offer-badge">{offer.badge}</span>
        <div className="offer-art">{offer.art}</div>
        <h3>{offer.title}</h3><p>{offer.provider} · {offer.category}</p>
        <div className="offer-footer"><span className="reward">{offer.reward} Coins</span><button className="primary-button">View offer</button></div>
      </div>)}
    </div>
    <div className="section-heading"><h2>Quick start</h2><span>Choose what you want to do now</span></div>
    <div className="stats-grid">
      <div className="stat-card"><span>Offers</span><strong>Live</strong><em>Apps, games & signups</em></div>
      <div className="stat-card"><span>Surveys</span><strong>Matched</strong><em>Profile-based research</em></div>
      <div className="stat-card"><span>Tasks</span><strong>4</strong><em>Submit proof</em></div>
      <div className="stat-card"><span>Cashout</span><strong>Locked</strong><em>Earn first</em></div>
    </div>
  </>;
}