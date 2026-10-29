// Authored content and dependency-free renderer for the architecture evolution deck.
// Reuses the existing green deck shell; emits matching HTML and Markdown.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../de-tracker/decks');
const out = path.join(root, 'architecture-evolution');
const check = process.argv.includes('--check');
const title = 'Data architecture: how we got here';
const subtitle = 'Warehouse → lake → lakehouse · cloud, streaming, data mesh and the decisions behind them';
const sources = {
  warehouse: ['Devlin & Murphy: original warehouse architecture (1988)', 'https://www.9sight.com/1988/02/art-ibmsj-ebis/'],
  mapreduce: ['Dean & Ghemawat: MapReduce (2004)', 'https://research.google/pubs/mapreduce-simplified-data-processing-on-large-clusters/'],
  hdfs: ['Apache Hadoop: HDFS architecture', 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html'],
  hive: ['Facebook: Hive at petabyte scale (2009)', 'https://engineering.fb.com/2009/06/10/web/hive-a-petabyte-scale-data-warehouse-using-hadoop/'],
  lake: ['James Dixon: the data lake motivation (2010)', 'https://jamesdixon.wordpress.com/2010/10/14/pentaho-hadoop-and-data-lakes/'],
  s3launch: ['Amazon: S3 launch (2006)', 'https://press.aboutamazon.com/2006/3/amazon-web-services-launches'],
  dremel: ['Google: Dremel (2010 paper)', 'https://research.google/pubs/dremel-interactive-analysis-of-web-scale-datasets-2/'],
  presto: ['Facebook: why Presto was built (2013)', 'https://engineering.fb.com/2013/11/06/core-infra/presto-interacting-with-petabytes-of-data-at-facebook/'],
  snow: ['Snowflake: storage, compute and cloud services architecture', 'https://docs.snowflake.com/en/user-guide/intro-key-concepts'],
  snowpaper: ['Snowflake: SIGMOD 2016 paper (public CMU-hosted copy)', 'https://www.cs.cmu.edu/~15721-f24/papers/Snowflake.pdf'],
  lakehouse: ['CIDR: Lakehouse architecture paper (2021)', 'https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf'],
  deltapaper: ['VLDB: Delta Lake paper (2020)', 'https://www.vldb.org/pvldb/vol13/p3411-armbrust.pdf'],
  delta: ['Delta Lake: concurrency control', 'https://docs.delta.io/concurrency-control/'],
  iceberg: ['Apache Iceberg: schema and partition evolution', 'https://iceberg.apache.org/docs/latest/evolution/'],
  icebergcommit: ['Apache Iceberg: concurrent commits and reliability', 'https://iceberg.apache.org/docs/latest/reliability/'],
  hudi: ['Uber: the ingestion problem behind Hudi (2017)', 'https://www.uber.com/ch/en/blog/hoodie/'],
  hudidocs: ['Apache Hudi: table and incremental-processing capabilities', 'https://hudi.apache.org/docs/overview/'],
  consistency: ['AWS: S3 strong consistency announcement (2020)', 'https://aws.amazon.com/blogs/aws/amazon-s3-update-strong-read-after-write-consistency/'],
  trino: ['Trino: Iceberg connector and catalog requirements', 'https://trino.io/docs/current/connector/iceberg.html'],
  snowice: ['Snowflake: Iceberg tables', 'https://docs.snowflake.com/en/user-guide/tables-iceberg'],
  bqice: ['BigQuery: managed Iceberg tables', 'https://docs.cloud.google.com/bigquery/docs/biglake-iceberg-tables-in-bigquery'],
  fabric: ['Microsoft Fabric: lakehouse and Delta tables', 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables'],
  medallion: ['Databricks: medallion as a logical design pattern', 'https://docs.databricks.com/aws/en/lakehouse/medallion'],
  lambda: ['Jay Kreps: questioning Lambda architecture (2014)', 'https://www.oreilly.com/radar/questioning-the-lambda-architecture/'],
  meshfirst: ['Zhamak Dehghani: monolith to data mesh (2019)', 'https://martinfowler.com/articles/data-monolith-to-mesh.html'],
  mesh: ['Zhamak Dehghani: four data mesh principles (2020)', 'https://martinfowler.com/articles/data-mesh-principles.html'],
  meshaws: ['AWS: concrete services for a data mesh', 'https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-data-mesh/aws-offerings-data-mesh.html'],
  fabricconcept: ['IBM: data fabric terminology', 'https://www.ibm.com/think/topics/data-fabric'],
  duckdb: ['DuckDB: Python DB API and transactions', 'https://duckdb.org/docs/current/clients/python/dbapi'],
  bts: ['BTS: flight source fields and monthly files', 'https://www.transtats.bts.gov/Fields.asp?gnoyr_VQ=FGJ'],
  noaa: ['NOAA: hourly weather data and station metadata', 'https://www.ncei.noaa.gov/products/global-historical-climatology-network-hourly'],
  hiveDocs: ['Apache Hive: SQL warehousing and metadata', 'https://hive.apache.org/docs/latest/introduction-to-apache-hive/'],
  spark: ['Apache Spark: processing APIs and execution', 'https://spark.apache.org/docs/latest/'],
  objectStorage: ['AWS: how S3 object storage works', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html'],
  queryConcepts: ['Trino: engines, catalogs and connectors', 'https://trino.io/docs/current/overview/concepts.html'],
  beam: ['Apache Beam: bounded and unbounded data', 'https://beam.apache.org/documentation/basics/'],
  dbt: ['dbt: analytical modeling and execution roles', 'https://docs.getdbt.com/docs/introduction'],
  bigquery: ['Google Cloud: BigQuery overview', 'https://docs.cloud.google.com/bigquery/docs/introduction'],
  trinoHistory: ['Trino founders: the PrestoSQL rename', 'https://trino.io/blog/2020/12/27/announcing-trino.html'],
  dlt: ['dlt: Python ingestion library', 'https://dlthub.com/docs/intro'],
  debezium: ['Debezium: database change capture', 'https://debezium.io/documentation/reference/stable/architecture.html'],
  airflow: ['Apache Airflow: workflow architecture', 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html'],
  cosmos: ['Astronomer Cosmos: dbt workflows in Airflow', 'https://astronomer.github.io/astronomer-cosmos/'],
  uv: ['Astral: Python environment management with uv', 'https://docs.astral.sh/uv/'],
  kafka: ['Apache Kafka: event retention and consumers', 'https://kafka.apache.org/intro/'],
  flink: ['Apache Flink: stateful processing', 'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/'],
  sparkStreaming: ['Spark: Structured Streaming', 'https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html'],
  databricks: ['Databricks: platform overview', 'https://docs.databricks.com/aws/en/introduction/'],
  fabricOverview: ['Microsoft Fabric: integrated analytics platform', 'https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview'],
  ssis: ['Microsoft: SQL Server Integration Services', 'https://learn.microsoft.com/en-us/sql/integration-services/sql-server-integration-services'],
  teradata: ['Teradata: analytical database platform', 'https://www.teradata.com/platform'],
  parquet: ['Apache Parquet: columnar file format', 'https://parquet.apache.org/docs/overview/'],
  redshift: ['AWS: Amazon Redshift overview', 'https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html'],
  python: ['Python: language tutorial', 'https://docs.python.org/3/tutorial/'],
  csv: ['RFC 4180: CSV representation', 'https://www.rfc-editor.org/rfc/rfc4180'],
  json: ['RFC 8259: JSON representation', 'https://www.rfc-editor.org/rfc/rfc8259'],
  yaml: ['YAML: language specification', 'https://yaml.org/spec/1.2.2/']
};
const p = text => ({ type: 'p', text });
const list = (...items) => ({ type: 'list', items });
const table = (headers, rows) => ({ type: 'table', headers, rows });
const flow = (...items) => ({ type: 'flow', items });
const cards = (...items) => ({ type: 'cards', items });
const call = (label, text) => ({ type: 'call', label, text });
const code = (language, text) => ({ type: 'code', language, text });
const answer = (question, text) => ({ type: 'answer', question, text });
const slides = [];
function slide(category, heading, nodes, takeaway, refs = []) { slides.push({ category, heading, nodes, takeaway, refs }); }

const narrative = require('../content/architecture-evolution.cjs');
const toolDefinitions = require('../content/architecture-tools.cjs');
narrative({ slide, p, table, flow, call, code, answer });
assert.equal(slides.length, 38, 'Keep existing lesson and lab slide identities stable');
for (const [name, section, displayName] of narrative.introductions) {
  const definition = toolDefinitions[name];
  assert.ok(definition, `Missing reference card: ${name}`);
  const [role, description, source] = definition;
  assert.ok(role && description && sources[source], `Incomplete reference card: ${name}`);
  const s = slides[section - 1];
  (s.tools ??= []).push({ name: displayName, role, description, source });
  if (!s.refs.includes(source)) s.refs.push(source);
}

const used = [...new Set(slides.flatMap(s => s.refs))];
const referencesPerPage = Math.ceil(used.length / 2);
for (let i = 0; i < used.length; i += referencesPerPage) {
  const keys = used.slice(i, i + referencesPerPage);
  slide('Research', i === 0 ? 'Primary sources: history and mechanisms' : 'Primary sources: current capabilities and ownership', [
    p('Historical sources researched 21 October 2026; the narrative and first-use tool explanations were revised and checked 22 October 2026. Original papers and engineering accounts establish historical motivations; current project/product documentation establishes implementation scope. Company claims are attributed, not treated as universal benchmarks.'),
    { type: 'references', keys },
    ...(i === 0 ? [call('How this was checked', 'The runnable lab was executed locally and its invariants asserted. Platform combinations were researched, not provisioned. Historical dates describe selected evidence; product capability lists are a dated snapshot.')] : [call('Scope', 'Examples and decision exercises are original and synthetic. No product is universally fastest or cheapest. No source forecasts a mandatory migration path for your project.')])
  ], 'Use the original source and the exact installed-version documentation before implementing a platform-specific feature.');
}

const esc = text => String(text).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const inline = text => esc(text).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>');
function render(n) {
  if (n.type === 'read') return ['<p class="arch-read-action"><button type="button" class="primary" data-read-story>Read as a continuous story →</button><span>Or use Next to read one section at a time.</span></p>', 'Read in order for the connected explanation, then use the glossary and exercises for review.'];
  if (n.type === 'links') return [`<p class="arch-links">${n.items.map(([label, href]) => `<a href="${esc(href)}">${esc(label)}</a>`).join(' · ')}</p>`, n.items.map(([label, href]) => `[${label}](${href})`).join(' · ')];
  if (n.type === 'p') return [`<p>${inline(n.text)}</p>`, n.text];
  if (n.type === 'list') return [`<ul>${n.items.map(t => `<li>${inline(t)}</li>`).join('')}</ul>`, n.items.map(t => '- ' + t).join('\n')];
  if (n.type === 'table') return [`<div class="table-scroll" tabindex="0" role="region" aria-label="Comparison"><table><thead><tr>${n.headers.map(t => `<th scope="col">${inline(t)}</th>`).join('')}</tr></thead><tbody>${n.rows.map(r => `<tr>${r.map(t => `<td>${inline(t)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`, ['| ' + n.headers.join(' | ') + ' |', '| ' + n.headers.map(() => '---').join(' | ') + ' |', ...n.rows.map(r => '| ' + r.join(' | ') + ' |')].join('\n')];
  if (n.type === 'flow' || n.type === 'cards') return [`<div class="${n.type === 'flow' ? 'arch-flow' : 'arch-cards'}">${n.items.map(([h, t]) => `<article><h3>${inline(h)}</h3><p>${inline(t)}</p></article>`).join('')}</div>`, n.items.map(([h, t], i) => `${n.type === 'flow' ? i + 1 + '.' : '-'} **${h}** — ${t}`).join('\n')];
  if (n.type === 'call') return [`<aside class="job"><span class="job-label">${esc(n.label)}</span><p>${inline(n.text)}</p></aside>`, `> **${n.label}:** ${n.text}`];
  if (n.type === 'code') return [`<div class="code-block"><div class="code-label"><span>${esc(n.language)}</span><button class="copy-code">Copy</button></div><pre><code>${esc(n.text)}</code></pre></div>`, '```' + n.language + '\n' + n.text + '\n```'];
  if (n.type === 'answer') return [`<details class="arch-answer"><summary>${inline(n.question)}</summary><p>${inline(n.text)}</p></details>`, `### ${n.question}\n\n${n.text}`];
  if (n.type === 'references') return [`<ol class="arch-references">${n.keys.map(k => `<li><a href="${esc(sources[k][1])}" target="_blank" rel="noopener">${esc(sources[k][0])}</a></li>`).join('')}</ol>`, n.keys.map(k => `- [${sources[k][0]}](${sources[k][1]})`).join('\n')];
  throw Error('Unknown node ' + n.type);
}
const template = fs.readFileSync(path.join(root, 'data-table-formats/data-table-formats.html'), 'utf8');
const css = template.match(/<style>([\s\S]*?)<\/style>/)[1];
let script = template.slice(template.lastIndexOf('<script>')).match(/<script>([\s\S]*?)<\/script>/)[1].replace("' · Table formats'", "' · Data architecture'");
script = script.replace("reading?'Slides':'Read'", "reading?'Slides':'Read as story'");
script += `\n(()=>{const start=document.querySelector('[data-read-story]'),read=document.getElementById('reading');start?.addEventListener('click',()=>{if(read.getAttribute('aria-pressed')!=='true')read.click();location.hash='#slide-2';document.getElementById('slide-2').scrollIntoView({behavior:'smooth',block:'start'})})})();`;
// Native details remain usable without JavaScript. Set the responsive default once,
// then leave each reader's open/closed choices intact across navigation and printing.
script += `\n(()=>{const compact=matchMedia('(max-width:1050px)').matches;document.querySelectorAll('.arch-tools').forEach(rail=>rail.querySelectorAll('.arch-tool').forEach((card,i)=>card.open=!compact&&i===0))})();`;

const controls = template.slice(template.indexOf('</main>') + 7, template.lastIndexOf('<script>')).replace('Search formats or unfamiliar words…', 'Search architectures, tools or questions…').replace('Try a format or concept.', 'Try a tool, pressure or concept.');
const extraCss = `
.arch-flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:18px;margin:24px 0}.arch-flow article{position:relative;background:var(--pale);border:1px solid var(--line);border-top:4px solid var(--green);border-radius:12px;padding:20px}.arch-flow article:not(:last-child):after{content:'→';position:absolute;right:-17px;top:36%;font-size:24px;color:var(--green);z-index:1}.arch-flow h3{font-size:20px}.arch-flow p,.arch-cards p{margin-bottom:0;font-size:17px}.arch-cards{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin:22px 0}.arch-cards article{background:white;border:1px solid var(--line);border-radius:12px;padding:24px}.arch-answer{border:1px solid var(--line);border-radius:12px;padding:17px 22px;margin:14px 0;background:white}.arch-answer summary{font-weight:650;cursor:pointer}.arch-answer p{margin:15px 0 0}.arch-references{columns:2;column-gap:40px;font-size:16px}.arch-references li{break-inside:avoid;margin:0 0 10px}.slide .sources{font-size:12px;line-height:1.5}.slide.cover .slide-body{max-width:none}.slide pre{font-size:16px}.slide .table-scroll td{vertical-align:top}.slide{overflow-wrap:anywhere}
main{max-width:1360px}.arch-narrative>p{max-width:76ch;font-size:19px;line-height:1.75;margin-bottom:20px}.arch-narrative>p:last-child{margin-bottom:0}.arch-narrative>.arch-links{font-size:16px;line-height:1.6}.arch-narrative .job{display:block;padding:16px 20px;margin:24px 0}.arch-narrative .job-label{display:block;margin-bottom:7px}.arch-narrative .job p{font-size:17px;line-height:1.65}.arch-read-action{display:flex;flex-wrap:wrap;gap:14px;align-items:center;margin-top:24px}.arch-read-action button{border:0;font-family:inherit;font-size:15px;font-weight:600;line-height:1.5}.arch-read-action>span{font-size:13px;color:var(--muted)}.arch-answer{padding:18px 22px}.arch-answer p{font-size:18px;line-height:1.75}.arch-references{font-size:15px;line-height:1.55}.sources>summary{cursor:pointer;color:var(--muted);font-size:12px}.sources>div{padding-top:10px;line-height:1.8}.takeaway{margin-top:28px}.reading main{max-width:1280px}.reading .slide{padding:36px 42px;margin-bottom:24px}.reading .arch-narrative>p{max-width:72ch}.slide .table-scroll td{font-size:16px;line-height:1.6}
/* First-use references sit outside the story's reading column. */
.arch-layout{display:grid;grid-template-columns:minmax(0,1fr) 248px;gap:32px;align-items:start}.arch-layout .arch-narrative{min-width:0}.arch-tools{min-width:0;border-left:1px solid var(--line);padding-left:20px}.arch-tools-label{font-size:11px;font-weight:650;letter-spacing:1.2px;text-transform:uppercase;color:var(--muted);margin:0 0 12px}.arch-tool{margin:0 0 10px;padding:0;border:1px solid var(--line);border-radius:10px;background:#f8faf5;overflow:hidden;break-inside:avoid}.arch-tool:last-child{margin-bottom:0}.arch-tool summary{position:relative;list-style:none;padding:11px 30px 11px 13px;min-height:44px;line-height:1.35}.arch-tool summary::-webkit-details-marker{display:none}.arch-tool summary:after{content:'+';position:absolute;right:12px;top:12px;color:var(--green);font-size:16px;font-weight:400}.arch-tool[open] summary:after{content:'−'}.arch-tool-name{display:block;font-size:15px;font-weight:650;color:var(--forest)}.arch-tool-role{display:block;margin-top:3px;font-size:11px;font-weight:500;color:var(--muted)}.arch-tool-body{padding:0 13px 12px}.arch-tool .arch-tool-body p{font-size:13px;line-height:1.6;margin:0 0 7px}.arch-tool a{font-size:12px}.arch-tool summary:focus-visible{outline-offset:-4px}
@media screen and (max-width:1050px){.arch-layout{grid-template-columns:1fr;gap:24px}.arch-tools{border-left:0;border-top:1px solid var(--line);padding:16px 0 0}.arch-tools-label{margin-bottom:10px}.arch-tool summary{padding-top:12px;padding-bottom:12px}.arch-tool-name{font-size:15px}.arch-tool-role{font-size:12px}.arch-tool .arch-tool-body p{font-size:15px}.arch-tool a{font-size:13px}}
@media(max-width:800px){.job-label{flex-basis:auto}.reading .slide{padding:28px 24px}.arch-narrative>p{font-size:18px;line-height:1.7}.arch-answer p{font-size:17px}}
@media(max-width:700px){.arch-flow,.arch-cards{grid-template-columns:1fr}.arch-flow article:not(:last-child):after{content:'↓';top:auto;bottom:-27px;right:50%}.arch-references{columns:1}.arch-flow p,.arch-cards p{font-size:16px}.slide pre{font-size:13px}.topbar .brand small{display:none}}
@media print{.arch-layout{grid-template-columns:minmax(0,1fr) 54mm;gap:6mm}.arch-tools{padding-left:4mm}.arch-tools-label{font-size:7pt}.arch-tool summary{min-height:0;padding:2mm 3mm}.arch-tool summary:after{display:none}.arch-tool-name{font-size:9pt}.arch-tool-role{font-size:7pt}.arch-tool-body{padding:0 3mm 2mm}.arch-tool .arch-tool-body p,.arch-tool a{font-size:8pt;line-height:1.5}.arch-answer p{display:block}.arch-references{columns:2;font-size:9pt}.arch-flow article,.arch-cards article{break-inside:avoid}.slide{overflow:visible}.arch-read-action{display:none}.arch-narrative>p,.arch-answer p{font-size:11pt;line-height:1.55;margin-bottom:4mm}.arch-narrative .job p{font-size:10pt}.slide .table-scroll td{font-size:9pt}.sources>summary{font-size:7pt}.reading .slide{padding:5mm;margin-bottom:0}}
`;
let md = `# ${title}\n\n${subtitle}\n\nResearched 21 October 2026; rewritten as a narrative with first-use tool explanations on 22 October 2026. Generated alongside the HTML deck from \`tracker/scripts/build-architecture-deck.cjs\`.\n\nNew tools have compact first-use reference cards beside the story (collapsed below it on small screens). The same definitions are included here and in deck search.\n\nThe guide follows a fictional travel company through connected explanations of reporting, flexible storage, reliable table state and ownership. Read continuously with the Read as story control, or navigate one section at a time. Historical accounts are identified separately; the fictional company is not a claim about the portfolio’s available sources. The local synthetic lab is in [lab/README.md](lab/README.md). It does not demonstrate a distributed lakehouse commit protocol.\n\n## Contents\n\n`;
md += slides.map((s, i) => `${i + 1}. [${s.heading}](#slide-${i + 1})`).join('\n') + '\n\n---\n\n';
const sections = slides.map((s, i) => {
  const rendered = s.nodes.map(render);
  const toolCards = (s.tools || []).map(t => `<details class="arch-tool"${t === s.tools[0] ? ' open' : ''}><summary><span class="arch-tool-name">${esc(t.name)}</span><span class="arch-tool-role">${esc(t.role)}</span></summary><div class="arch-tool-body"><p>${inline(t.description)}</p><a href="${esc(sources[t.source][1])}" target="_blank" rel="noopener" aria-label="Read ${esc(t.name)} documentation">Documentation ↗</a></div></details>`).join('');
  const toolMarkdown = s.tools?.length ? '\n\n### New in this section\n\n' + s.tools.map(t => `**${t.name} · ${t.role}**\n\n${t.description} [Documentation](${sources[t.source][1]})`).join('\n\n') : '';
  const story = `<div class="slide-body arch-narrative">${rendered.map(x => x[0]).join('\n')}</div>`;
  const body = toolCards ? `<div class="arch-layout">${story}<aside class="arch-tools" aria-labelledby="tools-${i + 1}"><h3 class="arch-tools-label" id="tools-${i + 1}">New in this section</h3>${toolCards}</aside></div>` : story;
  const refs = s.refs.map(k => { assert.ok(sources[k], k); return `<a href="${esc(sources[k][1])}" target="_blank" rel="noopener">${esc(sources[k][0])}</a>`; }).join(' · ');
  md += `<a id="slide-${i + 1}"></a>\n## ${i + 1}. ${s.heading}\n\n${rendered.map(x => x[1]).join('\n\n')}${toolMarkdown}\n\n**The main idea:** ${s.takeaway}\n\n${s.refs.length ? '*Sources:* ' + s.refs.map(k => `[${sources[k][0]}](${sources[k][1]})`).join(' · ') + '\n\n' : ''}---\n\n`;
  return `<section class="slide${i === 0 ? ' cover' : ''}" id="slide-${i + 1}" data-num="${String(i + 1).padStart(2, '0')}" data-title="${esc(s.heading)}" data-category="${esc(s.category)}" aria-labelledby="title-${i + 1}"><header class="slide-heading"><p class="eyebrow">${esc(s.category)} · ${String(i + 1).padStart(2, '0')}</p><h2 id="title-${i + 1}" tabindex="-1">${esc(s.heading)}</h2></header>${body}<aside class="takeaway"><span class="takeaway-label">The main idea</span><p>${inline(s.takeaway)}</p></aside>${refs ? `<details class="sources"><summary>Sources for this section</summary><div>${refs}</div></details>` : ''}<span class="folio" aria-hidden="true">${i + 1}</span></section>`;
}).join('\n');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="How data warehouses, lakes, lakehouses and data mesh developed: practical pressures, tools, architecture trade-offs and a runnable local lab."><meta name="theme-color" content="#205c43"><title>Data architecture evolution</title><style>${css}${extraCss}</style></head><body><a class="skip-link" href="#deck">Skip to content</a><header class="topbar"><a class="brand" href="#slide-1"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>Data architecture<small>Evolution, tools and trade-offs</small></span></a><nav class="top-actions" aria-label="Deck tools"><button class="quiet-button js-control" id="open-contents">Contents</button><button class="quiet-button js-control" id="reading" aria-pressed="false">Read as story</button><button class="quiet-button print js-control" id="print">Print / PDF</button><a class="markdown-link" href="architecture-evolution.md" download>Markdown ↗</a></nav></header><main id="deck" tabindex="-1">${sections}</main>${controls}<script>${script}</script></body></html>\n`;
fs.mkdirSync(out, { recursive: true });
const marker = /<!-- AE deck search start -->[\s\S]*?<!-- AE deck search end -->\n?/g;
for (const [file, content] of [['architecture-evolution.html', html], ['architecture-evolution.md', md]]) {
  if (check) assert.equal(fs.readFileSync(path.join(out, file), 'utf8').replace(marker, ''), content, 'Rebuild ' + file);
  else fs.writeFileSync(path.join(out, file), content);
}
console.log(`${slides.length} architecture slides; ${used.length} primary sources; HTML and Markdown ${check ? 'verified' : 'built'}.`);
