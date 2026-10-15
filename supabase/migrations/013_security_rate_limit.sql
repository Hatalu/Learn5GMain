-- ==============================================================================
-- 013: ตัวจำกัดความถี่ (rate limit) ที่เก็บในฐานข้อมูล
-- ใช้ร่วมกันทุกเครื่องเซิร์ฟเวอร์ (Vercel รันหลายเครื่อง ตัวนับในหน่วยความจำกันบอทไม่อยู่)
-- เรียกได้เฉพาะเซิร์ฟเวอร์ (service role) เท่านั้น ผู้ใช้ทั่วไปเรียกหรืออ่านตารางไม่ได้
-- key ที่เก็บเป็นค่า hash ไม่ใช่ IP จริง  รันซ้ำได้ปลอดภัย
-- ==============================================================================

create table if not exists public.rate_limits (
  key text primary key,
  window_start timestamptz not null default now(),
  hits int not null default 0
);

alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

create or replace function public.rl_hit(p_key text, p_max int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;

  -- เก็บกวาดแถวเก่าเป็นครั้งคราว
  if random() < 0.02 then
    delete from public.rate_limits where window_start < now() - interval '2 days';
  end if;

  return v_hits <= p_max;
end;
$$;

revoke all on function public.rl_hit(text, int, int) from public, anon, authenticated;
grant execute on function public.rl_hit(text, int, int) to service_role;
