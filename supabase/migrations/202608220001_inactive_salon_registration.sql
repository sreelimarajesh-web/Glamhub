-- New salon registrations stay hidden until a platform administrator reviews them.
alter table public.salons alter column active set default false;

