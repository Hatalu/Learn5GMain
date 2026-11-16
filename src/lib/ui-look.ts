/**
 * ธีมเว็บมีแบบเดียว (ขาว-ดำ มินิมอล) + โหมดสว่าง/มืดจาก next-themes
 * <html data-ui="minimal"> ตั้งไว้ใน layout ตลอด (กฎใน ui-minimal.css)
 * หน้าที่เป็นเครื่องมือ/เกมเต็มจอ ได้ <html data-tool> (ตั้งโดย UiLookScope) กฎลบเงา/ขอบหนาจะไม่แตะ เพราะตัวแก้ไขมีสี/เงาที่มีความหมาย
 */
export const TOOL_ROUTES = ['/studio/edit', '/create/edit', '/create/host', '/play'];
export const isToolRoute = (path: string) => TOOL_ROUTES.some((p) => path === p || path.startsWith(p + '/'));

/** สคริปต์เล็กใน <head>: ตั้ง data-tool ก่อนหน้าแรกวาด */
export const UI_BOOT = `try{var p=location.pathname;if(${JSON.stringify(TOOL_ROUTES)}.some(function(r){return p===r||p.indexOf(r+'/')===0}))document.documentElement.dataset.tool='1'}catch(e){}`;
