BEGIN;

INSERT INTO providers(slug,name,kind,signature_mode,is_enabled,public_config,secret_config)
VALUES
  ('lootably','Lootably','offerwall','lootably_sha256',FALSE,'{"rewardScale":1}'::jsonb,'{}'::jsonb),
  ('bitlabs','BitLabs','survey','bitlabs_hmac_sha1_url',FALSE,'{"rewardScale":1}'::jsonb,'{}'::jsonb),
  ('adgem','AdGem','offerwall','adgem_v3_hmac_sha256_body',FALSE,'{"rewardScale":1}'::jsonb,'{}'::jsonb),
  ('cpx','CPX Research','survey','provider_configured',FALSE,'{}'::jsonb,'{}'::jsonb),
  ('theoremreach','TheoremReach','survey','provider_configured',FALSE,'{}'::jsonb,'{}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
