export default function AffiliatesPage(){
  return <>
    <section className="hero-title"><h1>Affiliate Program</h1><p>Invite users and earn a commission when their eligible rewards are credited.</p></section>
    <div className="stats-grid">
      <div className="stat-card"><span>Total referrals</span><strong>0</strong><em>Joined through your link</em></div>
      <div className="stat-card"><span>Commission earned</span><strong>0 Coins</strong><em>Lifetime</em></div>
      <div className="stat-card"><span>Commission rate</span><strong>10%</strong><em>Eligible earnings</em></div>
      <div className="stat-card"><span>Active this month</span><strong>0</strong><em>Referrals earning</em></div>
    </div>
    <div className="panel mt">
      <h2 style={{fontSize:11,marginTop:0}}>Your referral link</h2>
      <div style={{display:'flex',gap:8}}>
        <input className="search" style={{flex:1}} value="https://example.com/register?ref=AB12CD34" readOnly/>
        <button className="primary-button">Copy link</button>
      </div>
    </div>
    <div className="panel mt">
      <table className="table">
        <thead><tr><th>User</th><th>Joined</th><th>Status</th><th>Commission</th></tr></thead>
        <tbody><tr><td colSpan={4} className="center muted" style={{padding:30}}>No referrals yet.</td></tr></tbody>
      </table>
    </div>
  </>;
}