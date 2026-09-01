'use client';

import Link from 'next/link';
import { Clock3, Rocket, Star } from 'lucide-react';
import { formatPoints } from '@/lib/api';
import type { Offer } from '@/lib/types';

export function OfferTile({
  offer,
  featured = false,
  actionLabel = 'View',
  href,
  onAction
}: {
  offer: Offer;
  featured?: boolean;
  actionLabel?: string;
  href?: string;
  onAction?: () => void;
}) {
  const provider = offer.provider_name || offer.provider_slug || 'Rewards';

  return <article className={'offer-card '+(featured || offer.is_featured ? 'featured' : '')}>
    {(featured || offer.is_featured) && <span className="offer-badge">FEATURED</span>}
    <div className="offer-art">
      {offer.image_url
        ? <img src={offer.image_url} alt="" />
        : <span aria-hidden="true">{offer.title.slice(0,1).toUpperCase()}</span>}
    </div>
    <h3>{offer.title}</h3>
    <p>{offer.description || provider+' earning opportunity'}</p>
    <div className="offer-meta">
      <span>{provider}</span>
      <span><Clock3 size={12}/>{offer.estimated_minutes ? offer.estimated_minutes+' min' : 'Time varies'}</span>
      <span><Star size={12}/>{offer.difficulty || 'Standard'}</span>
    </div>
    <div className="offer-footer">
      <span className="reward">{formatPoints(offer.reward_points)} Coins</span>
      {href
        ? <Link className="primary-button" href={href}><Rocket size={13}/>{actionLabel}</Link>
        : <button className="primary-button" onClick={onAction}><Rocket size={13}/>{actionLabel}</button>}
    </div>
  </article>;
}
