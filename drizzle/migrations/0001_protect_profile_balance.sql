create or replace function public.prevent_balance_self_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.balance is distinct from old.balance
     and auth.uid() is not null
     and not public.has_role(auth.uid(), 'admin') then
    raise exception 'Balance cannot be modified directly';
  end if;
  return new;
end; $$;

create trigger profiles_balance_guard before update on public.profiles
for each row execute function public.prevent_balance_self_update();