// Add authored SCD walkthroughs without renumbering existing dimension-deck links.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { sources, sql, setup, slides } = require('../content/dimension-scd.cjs');
const folder = path.resolve(__dirname, '../de-tracker/decks/dim-dimension-tables');
const check = process.argv.includes('--check');
const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const inline = text => esc(text).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
const fence = text => '```sql\n' + text + '\n```';
function render(n) {
  if (n.type === 'p') return [`<p>${inline(n.text)}</p>`, n.text];
  if (n.type === 'table') return [`<h3>${esc(n.title)}</h3><div class="table-scroll" tabindex="0" role="region" aria-label="${esc(n.title)}"><table><thead><tr>${n.headers.map(t=>`<th scope="col">${inline(t)}</th>`).join('')}</tr></thead><tbody>${n.rows.map(r=>`<tr>${r.map(t=>`<td>${inline(t)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, `### ${n.title}\n\n| ${n.headers.join(' | ')} |\n| ${n.headers.map(()=>'---').join(' | ')} |\n${n.rows.map(r=>'| '+r.join(' | ')+' |').join('\n')}`];
  if (n.type === 'sql') {
    assert.ok(sql[n.key], n.key);
    return [`<div class="code-block"><div class="code-label"><span>SQL · DuckDB</span><button class="copy-code" aria-label="Copy SQL example">Copy</button></div><pre><code class="language-sql" data-scd-sql="${n.key}">${esc(sql[n.key])}</code></pre></div>`, fence(sql[n.key])];
  }
  if (n.type === 'call') return [`<aside class="job"><span class="job-label">${esc(n.label)}</span><p>${inline(n.text)}</p></aside>`, `> **${n.label}:** ${n.text}`];
  if (n.type === 'steps') return [`<ol class="scd-steps">${n.items.map(([h,t])=>`<li><strong>${esc(h)}.</strong> ${inline(t)}</li>`).join('')}</ol>`,n.items.map(([h,t],i)=>`${i+1}. **${h}.** ${t}`).join('\n')];
  if (n.type === 'detail') {
    const children=n.nodes.map(render);
    return [`<details><summary>${esc(n.title)}</summary><div class="reveal">${children.map(x=>x[0]).join('\n')}</div></details>`, `### ${n.title}\n\n${children.map(x=>x[1]).join('\n\n')}`];
  }
  if (n.type === 'profileDiagram') return [`<div class="scd-profile-path" role="group" aria-label="The fact carries separate customer and profile foreign keys"><div><strong>Customer dimension</strong><span>One row per base customer here</span><code>customer_key</code></div><div class="scd-profile-fact"><strong>Order fact</strong><span>One row per order</span><code>customer_key + profile_key</code></div><div><strong>Profile mini-dimension</strong><span>One row per attribute combination</span><code>profile_key</code></div></div>`, 'Customer dimension ← **customer_key · Order fact · profile_key** → Profile mini-dimension. The fact stores both keys; the profile grain is one attribute combination.'];
  if (n.type === 'labLinks') return ['<p class="scd-downloads"><a class="primary" href="lab/run_scd_lab.py" download>Download runnable SCD lab ↗</a> <a href="lab/README.md">Lab instructions</a> · <a href="scd-advanced.md">Worked notes (Markdown)</a></p>', '[Download the runnable lab](lab/run_scd_lab.py) · [Lab instructions](lab/README.md)'];
  throw Error('Unknown SCD node '+n.type);
}
const generated = slides.map(s => {
  const body=s.nodes.map(render).map(r=>r[0]).join('\n');
  return `<section class="slide scd-walkthrough" id="slide-${s.id}" data-num="${s.label}" data-title="${esc(s.title)}" data-category="Slowly changing dimensions" aria-labelledby="title-${s.id}"><header class="slide-heading"><p class="eyebrow">Slowly changing dimensions · ${s.label} · worked example</p><h2 id="title-${s.id}" tabindex="-1">${esc(s.title)}</h2></header><div class="slide-body">${body}</div><aside class="takeaway"><span class="takeaway-label">The main idea</span><p>${inline(s.takeaway)}</p></aside><footer class="sources"><span>Primary sources</span>${s.refs.map(k=>`<a href="${sources[k][1]}">${esc(sources[k][0])}</a>`).join(' · ')}</footer><span class="folio" aria-hidden="true">${s.label}</span></section>`;
}).join('\n');
const marker=/<!-- SCD walkthrough start -->[\s\S]*?<!-- SCD walkthrough end -->\n?/g;
const styleMarker=/\/\* SCD walkthrough style start \*\/[\s\S]*?\/\* SCD walkthrough style end \*\/\n?/g;
const css=`/* SCD walkthrough style start */
.scd-walkthrough .slide-body>p{max-width:78ch;font-size:18px;line-height:1.7;margin-bottom:18px}.scd-walkthrough h3{margin-top:22px}.scd-walkthrough .job{display:block;margin:20px 0;padding:16px 20px}.scd-walkthrough .job-label{display:block;margin-bottom:6px}.scd-walkthrough .job p{font-size:16px;line-height:1.65}.scd-walkthrough td{font-size:15px;line-height:1.55}.scd-walkthrough pre{font-size:15px}.scd-walkthrough details .code-block{margin-top:14px}.scd-walkthrough .reveal>p{font-size:17px;line-height:1.7;margin:14px 0}.scd-steps{font-size:18px;line-height:1.7}.scd-profile-path{display:grid;grid-template-columns:1fr 1.1fr 1fr;gap:18px;margin:24px 0}.scd-profile-path>div{position:relative;padding:18px;background:var(--pale);border:1px solid var(--line);border-radius:12px}.scd-profile-path strong,.scd-profile-path span{display:block}.scd-profile-path strong{font-size:17px}.scd-profile-path span{font-size:14px;margin:7px 0}.scd-profile-path code{font-size:12px}.scd-profile-fact:before,.scd-profile-fact:after{position:absolute;top:40%;font-size:22px;color:var(--green)}.scd-profile-fact:before{content:'←';left:-19px}.scd-profile-fact:after{content:'→';right:-19px}.scd-downloads{display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:15px}
@media(max-width:800px){.scd-profile-path{grid-template-columns:1fr}.scd-profile-fact:before{content:'↑';left:50%;top:-27px}.scd-profile-fact:after{content:'↓';right:50%;top:auto;bottom:-27px}.scd-walkthrough pre{font-size:13px}.scd-walkthrough .slide-body>p,.scd-steps{font-size:17px}}
@media print{.scd-walkthrough .slide-body>p,.scd-steps{font-size:10pt;line-height:1.55}.scd-walkthrough pre{font-size:8pt}.scd-walkthrough td,.scd-walkthrough .reveal>p,.scd-walkthrough .job p{font-size:9pt}.scd-profile-path{gap:4mm;margin:3mm 0;grid-template-columns:1fr 1.1fr 1fr}.scd-profile-path>div{padding:3mm}.scd-profile-path strong{font-size:10pt}.scd-profile-path span,.scd-profile-path code{font-size:8pt}.scd-profile-fact:before,.scd-profile-fact:after{display:none}.scd-downloads .primary{display:none}}
/* SCD walkthrough style end */
`;
const file=path.join(folder,'dim-dimension-tables.html');
let html=fs.readFileSync(file,'utf8').replace(marker,'').replace(styleMarker,'');
assert.equal((html.match(/id="slide-10"/g)||[]).length,1);
html=html.replace('<section class="slide" id="slide-10"',`<!-- SCD walkthrough start -->\n${generated}\n<!-- SCD walkthrough end -->\n<section class="slide" id="slide-10"`);
html=html.replace('</style>',css+'</style>');
// Existing lesson IDs/labels stay stable; the toolbar counts physical pages.
html=html.replace(";const lastNum=lab(slides[total-1],total-1);",';')
  .replace("lab(slides[current],current)+' / '+lastNum","(current+1)+' / '+total");
for (const [label,id] of [['Type 3',21],['Type 4 (mini-dimension)',23],['Type 6 (1 + 2 + 3)',25]]) {
  html=html.replace(`<td>${label}</td>`,`<td><a href="#slide-${id}">${label}</a></td>`);
}
let md='# SCD Types 3, 4 and 6: worked Leafy examples\n\nSupplement to [Dimension tables](dim-dimension-tables.html). Six worked additions, researched 27 October 2026, placed after lesson 9 as 9A–9F. Original section links remain stable. Each example is a separate demonstration schema, with **one fact row per order**, using the same 64 + 25 + 18 = 107 of sales. Profile assignments and regions are synthetic extensions of Leafy.\n\nSQL uses DuckDB; an embedded analytical database that can run this lab locally without a server. Run [the lab](lab/README.md) to create all tables and verify the outputs, identical replays, date boundaries and rollback. It never connects to your tracker or a warehouse.\n\n## Contents\n\n'+slides.map(s=>`- [${s.label}. ${s.title}](#slide-${s.id})`).join('\n')+'\n\n';
for(const s of slides) md+=`<a id="slide-${s.id}"></a>\n## ${s.label}. ${s.title}\n\n${s.nodes.map(render).map(r=>r[1]).join('\n\n')}\n\n**The main idea:** ${s.takeaway}\n\n*Primary sources:* ${s.refs.map(k=>`[${sources[k][0]}](${sources[k][1]})`).join(' · ')}\n\n---\n\n`;
const lab=`"""Synthetic SCD lab. Requires duckdb==1.5.6; all data stays in memory."""
import duckdb

SETUP = ${JSON.stringify(setup)}
SQL = ${JSON.stringify(sql, null, 4)}

def run():
    c = duckdb.connect(":memory:")
    try:
        c.execute(SETUP)
        c.execute(SQL["type3Load"])
        region_report = c.execute(SQL["type3Report"]).fetchall()
        assert region_report == [("new_map", "Central", 82), ("new_map", "West", 25),
                                 ("old_map", "South", 82), ("old_map", "West", 25)]
        before = c.execute("SELECT * FROM dim_customer3 ORDER BY customer_key").fetchall()
        c.execute(SQL["type3Load"])
        assert before == c.execute("SELECT * FROM dim_customer3 ORDER BY customer_key").fetchall()
        c.execute(SQL["type3Load"].replace("Central", "East"))
        assert c.execute("SELECT sales_region, previous_sales_region FROM dim_customer3 WHERE customer_id='C-101'").fetchone() == ("East", "Central")

        def load4():
            c.execute("BEGIN")
            try:
                # A missing lookup must fail rather than silently drop orders.
                assert c.execute("SELECT count(*) FROM stg_order4 s LEFT JOIN dim_customer4 d USING(customer_id) WHERE d.customer_key IS NULL").fetchone()[0] == 0
                c.execute(SQL["type4Profiles"])
                c.execute(SQL["type4Facts"])
                c.execute("COMMIT")
            except BaseException:
                c.execute("ROLLBACK")
                raise
        load4()
        profile_report = c.execute(SQL["type4Report"]).fetchall()
        assert profile_report == [("Bronze", 89), ("Silver", 18)]
        profiles = c.execute("SELECT * FROM dim_profile4 ORDER BY profile_key").fetchall()
        facts4 = c.execute("SELECT * FROM fact_order4 ORDER BY order_number").fetchall()
        assert len(profiles) == 3  # two observed combinations plus Unknown
        assert c.execute("SELECT count(*) FROM dim_customer4").fetchone()[0] == 3
        assert facts4[0][3] == facts4[1][3] == 10
        assert facts4[2][3] == 11
        load4()
        assert profiles == c.execute("SELECT * FROM dim_profile4 ORDER BY profile_key").fetchall()
        assert facts4 == c.execute("SELECT * FROM fact_order4 ORDER BY order_number").fetchall()

        c.execute(SQL["type6Load"])
        c.execute(SQL["type6Facts"])
        city_report = c.execute(SQL["type6Report"]).fetchall()
        assert city_report == [("as_is", "Denver", 107), ("as_was", "Austin", 64), ("as_was", "Denver", 43)]
        versions = c.execute("SELECT * FROM dim_customer6 ORDER BY customer_key").fetchall()
        assert len(versions) == 4
        c.execute(SQL["type6Load"])
        c.execute(SQL["type6Facts"])
        assert versions == c.execute("SELECT * FROM dim_customer6 ORDER BY customer_key").fetchall()
        assert c.execute("SELECT count(*), sum(amount) FROM fact_order6").fetchone() == (3, 107)
        for day, expected in [("2026-03-04", 1), ("2026-03-05", 4)]:
            keys = c.execute("SELECT customer_key FROM dim_customer6 WHERE customer_id='C-101' AND CAST(? AS DATE) BETWEEN valid_from AND valid_to", [day]).fetchall()
            assert keys == [(expected,)]
        wrong = c.execute("SELECT sum(f.amount) FROM fact_order6 f JOIN dim_customer6 d USING(customer_key) WHERE d.is_current").fetchone()[0]
        assert wrong == 43  # the old 64 disappeared

        c.execute("BEGIN")
        try:
            c.execute("UPDATE dim_customer6 SET is_current=FALSE WHERE customer_id='C-101' AND is_current")
            raise RuntimeError("simulated interruption after expiry")
        except RuntimeError:
            c.execute("ROLLBACK")
        assert versions == c.execute("SELECT * FROM dim_customer6 ORDER BY customer_key").fetchall()

        c.execute("UPDATE stg_city6 SET city='Seattle', effective_date=DATE '2026-06-01'")
        c.execute(SQL["type6Load"])
        assert c.execute("SELECT city, current_city FROM dim_customer6 WHERE customer_id='C-101' ORDER BY valid_from").fetchall() == [("Austin", "Seattle"), ("Denver", "Seattle"), ("Seattle", "Seattle")]
        assert c.execute("SELECT customer_id FROM dim_customer6 GROUP BY customer_id HAVING count(*) FILTER(WHERE is_current) <> 1").fetchall() == []
        assert c.execute("SELECT customer_id FROM dim_customer6 GROUP BY customer_id HAVING count(DISTINCT current_city) <> 1").fetchall() == []
        assert c.execute("SELECT a.customer_key FROM dim_customer6 a JOIN dim_customer6 b ON a.customer_id=b.customer_id AND a.customer_key<b.customer_key AND a.valid_from<=b.valid_to AND b.valid_from<=a.valid_to").fetchall() == []
        later = c.execute(SQL["type6Report"]).fetchall()
        assert later == [("as_is", "Denver", 25), ("as_is", "Seattle", 82), ("as_was", "Austin", 64), ("as_was", "Denver", 43)]
        print("Type 3, before the optional East exercise:", region_report)
        print("Type 4, event-time profiles:", profile_report)
        print("Type 6, before the optional Seattle move:", city_report)
        print("PASS: exact totals, shared profiles, identical replays, effective-date boundaries, rollback and current attributes on every version.")
        print("DuckDB", duckdb.__version__)
    finally:
        c.close()

if __name__ == "__main__":
    run()
`;
const instructions=`# Run the SCD Types 3, 4 and 6 lab\n\nDownload [run_scd_lab.py](run_scd_lab.py). It embeds the same SQL shown in [lessons 9A–9F](../dim-dimension-tables.html#slide-21), plus the synthetic table setup. Run it with Python 3.11+ and DuckDB 1.5.6:\n\n\`\`\`sh\n# From this deck's folder after downloading the lab file:\nuv run --with duckdb==1.5.6 python lab/run_scd_lab.py\n\`\`\`\n\nAlternatively install DuckDB in a disposable virtual environment with \`python -m pip install duckdb==1.5.6\`, then run the script with that environment's Python. First-time dependency installation needs a connection; the lab makes no network requests and writes no files. All databases are in memory and close on exit.\n\nThe three models are independent alternatives, each with one row per order and 107 of sales. The original Leafy orders are unchanged; region/profile details are synthetic. The Type 6 fixture uses inclusive date bounds and assumes one deduplicated forward-effective change per customer. Retroactive correction and concurrent loaders require additional design.\n\nChecks cover Type 3 map totals and previous-slot rotation, Type 4 shared combinations and identical replays, and Type 6 historical/current totals, boundary lookups, rollback, a third city, one current row, non-overlapping intervals and matching current attributes on all versions. The run prints its tested DuckDB version.\n\n[Worked notes](../scd-advanced.md) · [Deck](../dim-dimension-tables.html#slide-21)\n`;
const searchMarker=/<!-- AE deck search start -->[\s\S]*?<!-- AE deck search end -->\n?/g;
for(const [relative,body] of [['dim-dimension-tables.html',html],['scd-advanced.md',md],['lab/run_scd_lab.py',lab],['lab/README.md',instructions]]){
  const target=path.join(folder,relative);
  if(check)assert.equal(fs.readFileSync(target,'utf8').replace(searchMarker,''),body.replace(searchMarker,''),'Rebuild SCD material: '+relative);
  else{fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,body);}
}
console.log('Six SCD walkthrough slides, Markdown notes and executable lab '+(check?'verified.':'built.'));
