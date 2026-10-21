module.exports.run = async (page, base, shot) => {
  const out = [];
  // live translate (network available in test env)
  await page.type('#src', 'hello world');
  await page.waitForFunction(() => {
    const o = document.querySelector('#out');
    return !o.classList.contains('placeholder') && o.textContent.length > 1;
  }, {timeout: 15000});
  const t1 = await page.$eval('#out', e => e.textContent);
  out.push(['live translation en->es: ' + t1, /hola/i.test(t1)]);
  const det = await page.$eval('#detected', e => e.textContent);
  out.push(['auto-detect label: ' + det, /Detected: English/.test(det)]);
  // history appears
  const hist = await page.$$eval('.hist-row', r => r.length);
  out.push(['history row added', hist >= 1]);
  // swap
  await page.click('#swap');
  await new Promise(r=>setTimeout(r,1200));
  const t2 = await page.$eval('#out', e => e.textContent);
  out.push(['after swap: ' + t2.slice(0,40), t2.length > 1]);
  // detect Devanagari
  await page.select('#srcLang', 'auto');
  await page.$eval('#src', e => {e.value=''; e.dispatchEvent(new Event('input'));});
  await page.type('#src', 'नमस्ते');
  await new Promise(r=>setTimeout(r,900));
  const det2 = await page.$eval('#detected', e => e.textContent);
  out.push(['Hindi detected: ' + det2, /Hindi/.test(det2)]);
  if (shot) await page.screenshot({path: shot});
  return out;
};
