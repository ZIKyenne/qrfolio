-- Trois statuts d'abonnement Stripe manquaient à l'enum : incomplete,
-- incomplete_expired, unpaid. Le webhook écrivait sub.status tel quel ; pour
-- ces trois-là, l'upsert échouait (500) et le plan payant restait acquis.
-- (ADD VALUE est idempotent avec IF NOT EXISTS ; hors transaction explicite.)
alter type subscription_status add value if not exists 'incomplete';
alter type subscription_status add value if not exists 'incomplete_expired';
alter type subscription_status add value if not exists 'unpaid';
