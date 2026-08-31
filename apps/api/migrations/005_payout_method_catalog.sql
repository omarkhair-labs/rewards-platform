BEGIN;

CREATE TABLE payout_method_catalog (
  id BIGSERIAL PRIMARY KEY,
  method_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual','api')),
  provider_id BIGINT REFERENCES providers(id) ON DELETE SET NULL,
  instructions TEXT NOT NULL DEFAULT '',
  account_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  min_points BIGINT NOT NULL DEFAULT 5000 CHECK (min_points > 0),
  fee_bps INTEGER NOT NULL DEFAULT 0 CHECK (fee_bps >= 0 AND fee_bps <= 10000),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO payout_method_catalog
  (method_key,name,mode,instructions,account_fields,min_points,fee_bps,is_enabled,sort_order)
VALUES
  ('airtm','Airtm','manual','Enter the Airtm account email.',
   '[{"key":"email","label":"Airtm email","type":"email","required":true}]'::jsonb,5000,0,TRUE,10),
  ('binance','Binance','manual','Enter the Binance Pay ID or account identifier requested by the operator.',
   '[{"key":"account","label":"Binance Pay ID","type":"text","required":true}]'::jsonb,5000,0,TRUE,20),
  ('faucetpay','FaucetPay','manual','Enter the FaucetPay account email.',
   '[{"key":"email","label":"FaucetPay email","type":"email","required":true}]'::jsonb,5000,0,TRUE,30),
  ('etisalat-cash','Etisalat Cash','manual','Enter the mobile wallet phone number.',
   '[{"key":"phone","label":"Etisalat Cash phone","type":"tel","required":true}]'::jsonb,5000,0,TRUE,40),
  ('instapay','InstaPay','manual','Enter the InstaPay address or account identifier.',
   '[{"key":"account","label":"InstaPay address","type":"text","required":true}]'::jsonb,5000,0,TRUE,50),
  ('vodafone-cash','Vodafone Cash','manual','Enter the mobile wallet phone number.',
   '[{"key":"phone","label":"Vodafone Cash phone","type":"tel","required":true}]'::jsonb,5000,0,TRUE,60),
  ('wise','Wise','manual','Enter the Wise account email.',
   '[{"key":"email","label":"Wise email","type":"email","required":true}]'::jsonb,5000,0,TRUE,70),
  ('litecoin','Litecoin','manual','Enter a Litecoin wallet address.',
   '[{"key":"address","label":"Litecoin address","type":"text","required":true}]'::jsonb,5000,0,TRUE,80)
ON CONFLICT (method_key) DO NOTHING;

CREATE INDEX idx_payout_catalog_enabled_sort
  ON payout_method_catalog(is_enabled,sort_order,name);

COMMIT;
