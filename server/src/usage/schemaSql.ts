export const SCHEMA_SQL = `
CREATE TABLE plan_definitions (
  code text PRIMARY KEY,
  analysis_slot_limit integer,
  hosted_token_limit integer
);

CREATE TABLE entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL,
  plan_code text NOT NULL REFERENCES plan_definitions (code),
  status text NOT NULL,
  payment_status text NOT NULL,
  source text NOT NULL,
  period_mode text NOT NULL,
  period_anchor timestamptz,
  period_end timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entitlements_status_check CHECK (status IN ('active', 'superseded', 'revoked', 'expired'))
);

CREATE UNIQUE INDEX entitlements_one_active_user ON entitlements (clerk_user_id) WHERE status = 'active';

CREATE TABLE usage_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entitlement_id uuid NOT NULL REFERENCES entitlements (id),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  slots_used integer NOT NULL DEFAULT 0,
  tokens_settled integer NOT NULL DEFAULT 0,
  UNIQUE (entitlement_id, period_start)
);

CREATE TABLE ai_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES usage_periods (id),
  entitlement_id uuid NOT NULL REFERENCES entitlements (id),
  period_start timestamptz NOT NULL,
  idempotency_key text NOT NULL,
  workflow_id text,
  operation text NOT NULL,
  status text NOT NULL,
  reserved_tokens integer NOT NULL,
  settled_prompt_tokens integer,
  settled_completion_tokens integer,
  cached_tokens integer,
  reasoning_tokens integer,
  provider_cost text,
  model text,
  provider_name text,
  generation_id text,
  consumes_slot boolean NOT NULL,
  slot_counted boolean NOT NULL DEFAULT false,
  over_reservation boolean NOT NULL DEFAULT false,
  unreconciled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, idempotency_key)
);

CREATE INDEX ai_reservations_status_created ON ai_reservations (status, created_at);
`;
