import { chromium } from "@playwright/test"
const OUT=process.argv[2]||"."; const base="http://localhost:3100/e2e-harness/blocks"
async function waitUp(u,t=120){for(let i=0;i<t;i++){try{const r=await fetch(u);if(r.ok)return true}catch{}await new Promise(r=>setTimeout(r,1000))}return false}
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:430,height:900}})
if(!(await waitUp(base))){console.log("DOWN");process.exit(1)}
await p.goto(base,{waitUntil:"networkidle"})
const sec=p.locator("[data-block='menu_tabs']"); await sec.scrollIntoViewIfNeeded()
await sec.screenshot({path:`${OUT}/feat-coll-closed.png`})
const beforeTabs = await sec.locator("[role=tab]").count()
await sec.locator("button[aria-expanded]").first().click(); await p.waitForTimeout(300)
await sec.screenshot({path:`${OUT}/feat-coll-open.png`})
console.log("tabs when closed:", beforeTabs, "| aria-expanded after click:", await sec.locator("button[aria-expanded]").first().getAttribute("aria-expanded"))
await b.close(); console.log("DONE")
