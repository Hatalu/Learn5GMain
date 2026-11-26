-- 031: คลังเกม 3D เปิดตั้งแต่แพ็กเกจ Pro ขึ้นไป และ Pro สั่งทำนวัตกรรมได้ 1 งาน/เดือน (26 พ.ย. 2026)
-- รันหลัง 030 · Dev ยังแก้ค่าเหล่านี้ได้ในหน้า Dev > แพ็กเกจและสิทธิ์
update public.plan_entitlements set ai_game = false, updated_at = now() where tier in ('free', 'plus');
update public.plan_entitlements set ai_game = true, innovation_jobs = 1, innovation_revisions = 3, updated_at = now() where tier = 'pro';
alter table public.plan_entitlements alter column ai_game set default false;
