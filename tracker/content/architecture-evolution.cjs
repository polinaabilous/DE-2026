// Narrative content for the architecture deck; slide identities remain stable.
module.exports = ({ slide, p, table, flow, call, code, answer }) => {
slide('Start here', 'Data architecture: how we got here', [
  p('A warehouse, a lake, a lakehouse, a mesh: it is easy to learn these names and still have no clear picture of why a team would move between them. This guide follows the problems behind the names, using one travel company as a running example.'),
  p('We begin with a team that wants trustworthy reports. As its data and responsibilities grow, it needs to retain more detail, run different kinds of analysis, correct published records and share ownership. Each change solves a particular problem and creates some new work. Real-world developments overlapped; our example follows a learning sequence.'),
  { type: 'read' },
  call('Our running example', 'The company and its situations are fictional. The historical accounts are identified separately. Later, we connect the story to your actual Flight Reliability project and its small synthetic lab.')
], 'Follow the problem first. The architectural names and tools will make more sense once their purpose is clear.');

slide('Start here', 'Meet the team and the question it needs to answer', [
  p('Imagine a travel company called **Waypoint**. Its booking application records reservations, its payment system records charges and refunds, and its operations feed records flight outcomes. Customer support has its own records of passengers asking for help.'),
  p('A manager asks: **“Which routes are regularly disrupted, and how much do those disruptions cost us in refunds?”** Answering this requires more than downloading a file. The team must connect a booking to a payment and to the right flight, decide what counts as a disruption, and make sure everybody uses the same definition.'),
  p('Along the way, we will separate four decisions that are often mixed together: where data is stored, what computes the answer, how business records are modeled, and who is responsible for them. A change in one does not automatically require changing all the others.'),
  p('First, though, the team tries the most obvious approach: asking the existing applications for the report.')
], 'An architecture begins with a consumer question and the data needed to answer it, before any particular storage product is chosen.');

slide('The warehouse need', 'Why querying the applications directly became awkward', [
  p('The booking application is built to handle actions such as creating a reservation or updating a passenger. The manager’s report is a different kind of workload: it scans many past records, joins several systems and groups the results by route and month.'),
  p('Running that work against live applications can compete with customer activity. Even when the queries are fast enough, the systems may disagree about identifiers and meanings. A booking can be created in one month, paid in another and refunded later. Simply joining records does not decide which month should receive the cost.'),
  p('Now imagine two analysts producing two reasonable reports from different extracts. One counts cancelled bookings; the other counts cancelled flights. Their totals disagree because their populations and definitions differ. Faster hardware would leave that disagreement intact.'),
  p('Waypoint needs a place where reporting rules are resolved deliberately, and where analytical work can run without repeatedly rebuilding those rules inside each application query.')
], 'The first problem is dependable, integrated reporting—not merely a shortage of storage.', ['warehouse']);

slide('The warehouse need', 'Decide what the reporting data means', [
  p('Before building the reporting system, the team agrees what each row represents. A flight-outcome table will contain **one scheduled flight leg per row**. A payment table will contain one payment event per row. This is the **grain** of each table, and it matters because one flight can have many passenger bookings and many refund events.'),
  p('The team then aligns keys, dates and business rules. For example, it defines how a refund links back to a booking and flight, and whether costs are reported by payment date or flight date. It checks that the integrated data reconciles with the original systems.'),
  p('These decisions create an analytical representation of the business. A **data model** describes that representation; an **engine** executes queries against it. The model could eventually move to another engine while keeping the same business meaning.'),
  p('With these rules in place, the team can publish a shared reporting dataset. That is the role the warehouse will play.')
], 'Choose row meaning and business rules before choosing how to store or execute the report.', ['warehouse']);

slide('Warehouse', 'The warehouse gives reporting a dependable home', [
  p('A **data warehouse** brings data from operational sources into an analytical system where it can be integrated, retained and queried for reporting. Waypoint now loads its source data into this system and publishes tables that already contain the agreed identifiers and reporting rules.'),
  p('The applications continue serving customers. The warehouse serves questions about the business. Analysts can use the same prepared flight and refund data instead of making independent extracts and reinterpreting every source from scratch.'),
  flow(['Applications', 'Record bookings, payments and flight events.'], ['Integration', 'Align records and apply the agreed rules.'], ['Warehouse', 'Retain shared analytical tables and reporting history.'], ['Reports', 'Answer the manager’s route and refund question.']),
  p('This explains why the warehouse was useful long before today’s cloud services. The durable idea is a trusted analytical representation of the business. The next question is how teams implemented it.')
], 'The warehouse separates analytical reporting from operational activity and gives consumers a shared set of prepared data.', ['warehouse']);

slide('Warehouse', 'How a traditional warehouse pipeline did the work', [
  p("In a traditional deployment, an integration job might extract bookings and payments overnight, clean and reconcile them, and load reporting tables. This is a typical **ETL** flow: extract, transform, then load the target. Waypoint could build those preparation jobs in **SSIS**."),
  p("The prepared records then go into a warehouse database such as **Teradata**. A **BI** (business intelligence) tool turns query results into reports, charts and dashboards. The pipeline has three distinct responsibilities: preparing records, executing analytical queries, and presenting useful answers."),
  p('For Waypoint, this can work very well: the morning report is understandable and consistent. But the platform also has an operating model. Somebody provisions capacity, maintains load jobs, tunes queries and reviews new datasets before they enter the reporting system.'),
  p('That last step becomes more significant when the company starts collecting data that does not fit its existing reports.')
], 'ETL tools prepared the data, the warehouse database stored and queried it, and BI tools presented it. Those responsibilities still exist in newer stacks.', ['warehouse', 'snowpaper', 'ssis', 'teradata']);

slide('Warehouse', 'The business starts asking questions the model never anticipated', [
  p('Waypoint’s website now records searches, clicks and browsing events. A product analyst wants to study searches that never became bookings. A data scientist wants detailed sequences of events. Neither question can be answered from the warehouse’s existing booking totals alone.'),
  p('The team has two new pressures. First, there is much more detail to retain and process. Second, people want to inspect unfamiliar fields before anybody knows the final reporting model. Requiring every event to pass through a fully designed warehouse integration can make this exploratory work slow to start.'),
  p('In many older deployments, adding storage and processing capacity also meant expanding a relatively fixed installation. That could make retaining a large, uncertain-value dataset hard to justify. These were practical constraints of deployments, not permanent limits of the warehouse idea.'),
  p('The team starts looking for a way to retain detailed data and process it more flexibly. Distributed file storage and processing offered one route.')
], 'Growing detail and unfamiliar workloads created pressure for flexible retention and processing alongside trusted reports.', ['lake', 'snowpaper']);

slide('Hadoop and lakes', 'Hadoop made a large collection of files usable across machines', [
  p("One historical response was **Hadoop**. Instead of relying on a single large machine for all the work, a cluster could distribute storage and processing across several machines. That made a large collection of detailed files practical for new kinds of analysis."),
  p("The components divide the work: **HDFS** keeps the files, **MapReduce** processes distributed input, and **Hive** lets analysts approach it through SQL tables. **Hive Metastore** keeps the table definitions that connect those queries to the files. Storage, computation and metadata cooperate, rather than one component doing everything."),
  p('Waypoint could now retain a large event history and process it without first squeezing every field into its existing reporting model. But someone still had to operate the cluster, organize files, maintain metadata and handle failures. Distributing the work moved some limits and introduced new responsibilities.'),
  p('This ability to keep detailed files for different uses helped support the approach we call a data lake.')
], 'HDFS stores files, processing frameworks compute results, and Hive adds SQL-oriented access and metadata. Hadoop is the ecosystem around these roles.', ['hdfs', 'mapreduce', 'hiveDocs']);

slide('Hadoop and lakes', 'The lake preserves data before every future use is known', [
  p('A **data lake** retains data in a flexible storage layer so several kinds of processing can use it. Waypoint can keep source event files, later derive analytical tables from them, and revisit the original detail when a new question appears.'),
  p('This changes when some decisions are made. A consumer may interpret a field when reading a file rather than requiring that field to be integrated into a reporting model first. That is the idea behind **schema on read**. There is still structure: the consumer must decide how to interpret timestamps, nested fields, missing values and identifiers.'),
  p('For example, an analyst can inspect a newly added search-filter field without waiting for the warehouse model to expose it. Once the field becomes part of a published metric, its interpretation needs a stable, tested definition.'),
  p('Keeping the detail creates flexibility. It also creates a new burden: the files must remain understandable and usable as the collection grows.')
], 'A lake postpones some modeling choices while preserving source detail. It does not remove the need to interpret and govern that detail.', ['lake']);

slide('Hadoop and lakes', 'Keeping the data and answering quickly were different problems', [
  p('The distinction appeared in real systems. In its 2009 Hive account, Facebook described rapid data growth and daily processing that could take longer than a day. Hadoop and Hive helped address that scale and throughput problem. Facebook’s later account of **Presto** described a need for more interactive SQL analysis.'),
  p('Back at Waypoint, the same distinction is useful. A nightly job that cleans the entire event history and an analyst exploring a question during a meeting have different needs. Both may use the same stored data, while benefiting from different execution approaches.'),
  p("For Waypoint’s nightly transformations, **Spark** offers a processing engine, and **PySpark** lets the team describe that work in **Python**. For interactive exploration, Presto offers a query path over supported connected sources. The choice can follow the job: preparing a history and asking an ad hoc question need not use the same execution approach."),
  p('The important connection is that storage and execution are separable choices. Next, cloud object storage changes how that storage can be operated.')
], 'Retaining a large history, transforming it efficiently and answering interactive queries are related requirements with different bottlenecks.', ['hive', 'presto', 'spark', 'hiveDocs', 'queryConcepts']);

slide('Cloud', 'Object storage lets the files outlive the compute machines', [
  p("Operating a distributed storage cluster was substantial work. Cloud object services changed that boundary: a provider operates storage, and a team retains named objects such as source files in it. **Amazon S3**, launched in 2006, is one such service; Azure and Google Cloud also provide object storage for analytics."),
  p("Waypoint could encode an analytical dataset as **Parquet** and keep those files in S3. Parquet determines how values are arranged inside each file; S3 provides a place to retain it. Choosing a file representation and choosing a storage service are separate decisions."),
  p('Imagine Waypoint retaining its event files in object storage. A processing job starts, reads the files, produces a result and stops. A separate query engine can later read supported representations of the same data. The team does not have to keep that particular processing machine alive just to preserve its inputs.'),
  p('This is an important form of **storage/compute separation**: stored data and execution capacity can have different lifecycles. It can make it easier to choose capacity for each workload. Scans, data movement, retained copies and idle services still contribute to cost.'),
  p('Cloud storage therefore changes an infrastructure responsibility. It leaves the team with decisions about schemas, models and table behavior—which other cloud services approach differently.')
], 'Storage can persist independently while different compute jobs come and go. That flexibility still needs deliberate data and cost management.', ['s3launch', 'objectStorage', 'parquet']);

slide('Cloud', 'Warehouses also changed when they moved to the cloud', [
  p('It would be misleading to tell this story as though every warehouse stood still while lakes improved. Cloud warehouse services addressed provisioning, workload isolation and operating effort while keeping the goal of dependable analytical SQL.'),
  p("For example, with **Snowflake**, Waypoint can allocate execution capacity to reporting and to another workload independently while they access shared stored data. That changes how the team provisions and isolates work without giving up its analytical warehouse."),
  p("**BigQuery**, with roots in Google’s **Dremel** query work, and **Amazon Redshift** provide other managed analytics routes. These examples show that the warehouse idea also evolved. Each service’s deployment and capacity choices still need evaluation against the actual workload."),
  p('Waypoint therefore has more than one reasonable route. It might modernize its reporting warehouse, use a governed lake for workloads that benefit from open files, or combine them. The answer depends on its consumers, supported operations and available operating capacity.'),
  p('To understand these options, it helps to separate a processing choice—where transformation happens—from the broader architecture.')
], 'Cloud warehouses and cloud lakes evolved alongside one another. A warehouse can address new requirements without being replaced by a lake.', ['snow', 'snowpaper', 'dremel', 'bigquery']);

slide('Cloud', 'ETL and ELT describe where a transformation takes place', [
  p('Earlier, Waypoint transformed operational data before loading its reporting target: ETL. With capable analytical execution available in the target, another option is to load source-like records first and transform them there. That ordering is **ELT**: extract, load, transform.'),
  p("For example, the team could load booking records into a raw database schema, then use **dbt** to build and test SQL models for clean bookings and refund summaries. The target engine executes those models; transformation logic and database execution remain distinct responsibilities."),
  p("A single pipeline can still have several boundaries. A downloader may validate a **CSV** before writing typed Parquet. A later SQL model may apply business rules after loading that representation. Calling the entire system ETL or ELT leaves out those details."),
  p('Similarly, schema on write and schema on read describe when a representation is interpreted or constrained. Both can appear in the same system. We can now use these distinctions to understand a common design: a lake feeding a warehouse.')
], 'Draw where source data is loaded, validated and transformed. ETL and ELT describe that ordering, rather than deciding the entire storage architecture.', ['dbt']);

slide('The lakehouse need', 'A lake and a warehouse often worked together', [
  p('Waypoint keeps detailed event and source files in its lake, but its finance and operations reports still use prepared warehouse tables. A pipeline reads selected lake data, cleans it and loads the reporting representation. Each side serves a useful purpose.'),
  flow(['Retained sources', 'Keep detail and evidence for replay.'], ['Preparation', 'Select versions, validate records and apply rules.'], ['Warehouse marts', 'Publish the agreed analytical representation.'], ['Consumers', 'Use reports with stable definitions.']),
  p('The extra representation also has consequences. A correction can be present in the lake before it reaches the warehouse. Two consumers may query different versions. The team must monitor the copy, define its freshness and reconcile the results.'),
  p('That hybrid can remain a good choice. But it also raises an attractive question: could the lake itself offer more dependable table behavior for consumers that already work there? First, we need to see what an ordinary folder is missing.')
], 'Using both can be sensible. The cost is another publication boundary whose versions, permissions and results must be kept in agreement.', ['lakehouse']);

slide('The lakehouse need', 'A correction exposes what a folder cannot decide', [
  p('Waypoint receives a January flight file and retains it as source evidence. Later, the source republishes January with one corrected record. The team keeps both files so it can investigate what changed. Keeping them both is sensible; treating them both as current input is a different decision.'),
  code('text', 'raw/2025-01-v1.csv    # original January: 3 records\nraw/2025-01-v2.csv    # replacement January: 3 records\nraw/2025-02-v1.csv    # February: 2 records'),
  p('A query that reads every file finds eight rows. The intended current dataset contains five flight identities. The query can execute successfully and still answer the wrong question, because the folder does not tell it which January version is current. Converting every file to Parquet would preserve that ambiguity.'),
  p('A real changing table needs an agreed state: which data belongs to the version readers should see? It also needs rules for publishing a new state when writers fail or overlap. That is where table-management mechanisms become useful.')
], 'File encoding and current-table membership solve different problems. Readers need explicit rules for selecting a consistent state.', ['deltapaper', 'icebergcommit']);

slide('Lakehouse', 'The lakehouse brings reliable table behavior to lake data', [
  p('Instead of asking each reader to discover the right files independently, a table-management layer records which data belongs to a table version. A writer prepares a change, then **commits** it: it publishes a new agreed state through the supported protocol. A reader resolves a **snapshot**, a particular state of the table.'),
  p('For Waypoint’s correction, that means readers can use the previous complete table state while the replacement is being prepared, then use the new state after it is published. The precise behavior depends on the table format, catalog and execution engine, but the responsibility is now explicit.'),
  p('A **lakehouse** combines lake-style storage with reliable table management and useful analytical execution. Its database-like guarantees often include ACID transactions: atomic changes, consistency with declared rules, isolation between concurrent work and durability of committed state. The scope of those guarantees must be checked.'),
  p('The influential 2021 lakehouse paper argued for this direction. The practical question for our team is which components provide the table, metadata and query behavior it needs.')
], 'The lakehouse adds coordinated table state and execution around stored data. The next step is to identify which component does each job.', ['lakehouse', 'deltapaper', 'delta', 'icebergcommit']);

slide('Lakehouse', 'Walk through one query, from a table name to stored values', [
  p('An analyst submits a query for `analytics.flight_legs`. The query engine needs to find that table. A supported **catalog** provides the relevant metadata or a route to it, including the location of the table’s current metadata.'),
  p('The **table format** defines how that metadata describes table state: for example, which files belong to a snapshot and how changes are represented. The engine uses compatible readers to interpret that state. It then reads the required values from **data files**, commonly Parquet, held in a storage system such as object storage.'),
  p("For example, an **Apache Iceberg** table can be queried by **Trino** through a compatible connector and catalog. Iceberg describes the changing table state; Trino executes the query. Being able to read Parquet alone would not establish that the engine understands the table’s snapshots, deletes and publication rules."),
  call('A concrete path', 'An appropriately configured Trino Iceberg connector can resolve an Iceberg table through a supported catalog and query its Parquet data in object storage. Compatibility includes metadata, permissions and supported table features—not just readable files.'),
  p('With these roles separated, the three common open table projects become easier to compare.')
], 'To explain a lakehouse, trace a real query through its engine, catalog, table metadata, file format and storage.', ['trino', 'queryConcepts', 'iceberg', 'trinoHistory']);

slide('Lakehouse', 'Delta, Iceberg and Hudi address overlapping table problems', [
  p('All three projects help make changing lake data more dependable. Their starting pressures and design emphases differ, so a team should investigate the operations and consumers it actually needs rather than choose by a single feature slogan.'),
  p("With **Delta Lake**, a compatible reader uses the transaction log to identify the table state instead of treating every Parquet file as current. Waypoint’s corrected January can therefore become a deliberate table change, rather than one more file that every consumer must interpret independently."),
  p("With **Apache Iceberg**, stable field identities help supported schema changes preserve which field a column represents, while partition layouts can evolve. Catalog commits and reader/writer feature support matter when several engines share the table."),
  p("With **Apache Hudi**, record keys, updates and incremental processing are central to the ingestion story. Uber’s original account describes the need to update its Hadoop data platform efficiently as source records changed. That is a useful motivation to compare with Waypoint’s corrected source months."),
  p('For Waypoint, a meaningful evaluation would replay a correction, delete a record, change a schema and interrupt a write. Those experiments expose an important distinction about storage guarantees.')
], 'Compare the behavior of a complete supported setup. The projects overlap, and their useful differences appear in real read, write and maintenance operations.', ['delta', 'iceberg', 'hudi', 'hudidocs']);

slide('Lakehouse', 'Reliable object reads do not publish a whole table change', [
  p('Suppose a job intends to publish two data files. It writes the first successfully, then crashes before writing the second. The first object may be perfectly durable and immediately visible, while the intended dataset is still incomplete.'),
  p('S3’s strong read-after-write and listing consistency, announced in 2020, addresses visibility of object operations. It does not turn a sequence of separate object writes into one atomic table update. **Object consistency and table transactions cover different boundaries.**'),
  p('A supported table protocol coordinates publication of table metadata and handles conflicting changes according to its rules. Readers resolve the resulting state instead of assuming that whatever a folder listing reveals must be the complete dataset.'),
  p('Waypoint should therefore ask what happens during failure and concurrent writes, not only whether it can read a file. It should also check whether a transaction covers one table or several: a table commit does not automatically update every report or external system at once.')
], 'Ask what is published atomically, how readers find that state, and where the guarantee ends.', ['consistency', 'delta', 'icebergcommit']);

slide('Convergence', 'Today, product labels tell only part of the architecture', [
  p('These mechanisms have spread across product boundaries. A service described as a warehouse may offer open lake tables, while a lakehouse platform may offer a managed SQL experience familiar to warehouse users. The historical categories explain motivations better than they predict every current feature.'),
  p("For example, Snowflake supports Iceberg table options, and BigQuery offers managed Iceberg tables in **Google Cloud Storage**. **Microsoft Fabric** brings a Delta-based lakehouse into a wider analytics suite. **Databricks** combines lakehouse processing with SQL and governance experiences. Similar consumer needs can now be approached from several product families."),
  p('This does not make every path interchangeable. Waypoint still needs to identify who manages the table, which catalog is used, which operations each engine supports, and where authorization is enforced. These details are specific to the selected service, feature version and configuration.'),
  p('Once the team can trace the actual read and write paths, another issue becomes visible: how should it control access and responsibility across them?')
], 'Use current product documentation to trace the concrete access path. A warehouse or lakehouse brand name alone cannot answer the implementation questions.', ['snowice', 'bqice', 'fabric', 'databricks', 'fabricOverview']);

slide('Governance', 'A shared table still needs controlled access and an owner', [
  p('Several teams can now work with Waypoint’s data, sometimes through different engines. That is useful, but it means a permission on one SQL endpoint may not cover every possible access path. A user denied a sensitive column in a query tool might still have credentials that allow reading the underlying storage.'),
  p('The team needs to understand and enforce the supported paths deliberately. A catalog can help discover and govern assets, but the exact enforcement depends on the platform, engine and storage setup. Access control has to be checked where data can actually be reached.'),
  p('The data also needs an operating owner. When a source stops arriving, who investigates? When a schema changes, who tells consumers? When old snapshots are removed, can a published result still be reproduced? **Governance** includes these responsibilities alongside security and policy.'),
  p('As Waypoint makes those expectations explicit, it also needs a clearer way to distinguish raw evidence from data that is ready for consumers. That leads to a layering pattern often discussed with lakehouses.')
], 'Shared storage and supported queries are useful foundations; dependable access also needs enforced permissions, lifecycle policies and accountable owners.', ['trino', 'meshaws']);

slide('Patterns around storage', 'Medallion names the steps from source evidence to useful answers', [
  p('Waypoint has several representations of a flight record. The original source file is evidence of what arrived. A typed, de-duplicated flight-leg table is a validated analytical input. A route-level reliability model is prepared for a particular consumer question. These representations have different purposes and quality expectations.'),
  p('The **medallion** pattern gives that progression familiar names: **bronze** for raw/source-oriented data, **silver** for validated and standardized data, and **gold** for consumer-ready data. A corrected record can pass through validation before it changes a published metric.'),
  flow(['Bronze', 'Preserve the source version and how it arrived.'], ['Silver', 'Produce valid flight legs with defined types and keys.'], ['Gold', 'Publish route metrics with explicit populations and rules.']),
  p('These are logical responsibilities. A warehouse can have a similar progression through staging, intermediate models and marts. The names do not require exactly three physical copies, and they do not implement quality or ACID behavior by themselves. Having organized the stages, the team must also decide when each stage runs.')
], 'Medallion describes progressive preparation and quality. The code, checks and transaction mechanisms must make that progression real.', ['medallion']);

slide('Patterns around storage', 'Streaming changes when work happens, rather than replacing the storage story', [
  p('An overnight file gives Waypoint a bounded piece of input to process: a **batch**. Website events arrive continuously, so a consumer may need **streaming** processing that maintains results as new events arrive. Some streaming systems execute that work in small increments called micro-batches.'),
  p("Continuous input introduces questions that a simple file run can avoid. An event may arrive late or be replayed after failure. A system might retain events in **Kafka**, then compute results with **Flink** or **Spark Structured Streaming**. Keeping replayable events and maintaining a result are separate jobs, so the design must account for both."),
  p('Historical architecture discussions proposed different ways to combine fresh and historical results. **Lambda** uses batch and speed paths that meet in serving, at the cost of keeping their results and logic consistent. A **Kappa-style** approach uses a replayable event log and one stream-processing path, making replay capacity and retained history important.'),
  p('Either processing approach can feed a warehouse or lakehouse. Choose timing from the source and consumer need. **BTS**, the US Bureau of Transportation Statistics, publishes the monthly flight records used in your project. Those publications remain a batch source; continuously running a processor would not turn them into live flight events.')
], 'Storage architecture and processing cadence answer different questions. Freshness starts with what the source can actually publish.', ['beam', 'lambda', 'bts', 'kafka', 'flink', 'sparkStreaming']);

slide('Data mesh', 'Eventually, the slow part may be the central team', [
  p('Waypoint’s platform is now technically capable, but requests still wait in one central queue. Finance wants a new refund definition, operations changes a flight-status field, and customer support wants an explanation for a broken report. The central team must understand each domain before it can deliver the change.'),
  p('Adding compute capacity does little for this bottleneck. The constraint is responsibility and domain knowledge. The people closest to a source understand why its records change, while the central team is expected to translate and support everybody’s meaning.'),
  p('**Data mesh** proposes a different operating model: domain teams own and publish supported data products, using a shared self-serve platform and common governance. The intention is to distribute meaningful responsibility without making every team rebuild infrastructure.'),
  p('This is a separate kind of evolution from moving between storage systems. The products can live in a warehouse, lake or lakehouse. To see what changes in practice, consider the four principles behind the approach.')
], 'Data mesh addresses the ownership and delivery problem that appears when one team becomes the default interpreter and maintainer of everybody’s data.', ['meshfirst']);

slide('Data mesh', 'Four principles, explained through the team', [
  p('**Domain-oriented ownership** means the flight-operations team is responsible for the flight-outcome product: its meaning, changes and incident response. Assigning an owner is useful only if that team has the skills, time and authority to support the responsibility.'),
  p('**Data as a product** means consumers receive something they can actually use: an interface with documented meaning, quality and service expectations. The team treats consumer breakage as a product problem, rather than saying that the source file technically arrived.'),
  p('**A self-serve platform** gives teams supported ways to provision, test, secure and publish their products. It keeps decentralized ownership from becoming duplicated infrastructure work. The platform team still has a substantial job, but it no longer has to implement every domain’s business logic.'),
  p('**Federated computational governance** means domains participate in shared rules and suitable controls enforce them automatically. For example, teams can agree on identity, access and publication rules while retaining responsibility for their own business definitions.'),
  p('Together, the principles describe an operating model. Simply renaming schemas after departments would leave the old bottleneck in place if the same central team still does all the work.')
], 'Mesh connects accountable domain ownership with product practices, shared platform capabilities and enforceable common rules.', ['mesh']);

slide('Data mesh', 'A data product is a promise a consumer can rely on', [
  p("The flight-operations team publishes `flight_outcomes`. A consumer should be able to find it, obtain appropriate access, understand what one row represents and know when to expect a corrected source month. The following **YAML** sketch makes some expectations explicit; the sketch does not enforce them by itself."),
  code('yaml', 'product: flight_outcomes\nowner: flight_operations_data\ngrain: one scheduled flight leg\nsource: published BTS monthly files\nquality: unique leg key; source-count reconciliation\nfreshness: agreed lag after source publication\nchange_policy: version breaking changes; notify consumers'),
  p('A weather team could publish station observations under its own expectations. An analytics consumer could then join the products using a documented station and time rule. Clear interfaces make that collaboration possible without pretending the join will be correct automatically.'),
  p('This remains a fictional multi-team example. In your personal project, the useful practice is to write clear ownership, meaning and change expectations. You do not need to invent several teams or buy a mesh platform to learn that habit.')
], 'A product turns “there is a table” into an explicit, supported relationship between its producer and consumers.', ['meshaws']);

slide('Terminology', 'Now the overlapping architecture words have a place', [
  p('We can now return to the labels without treating them as a list of competing upgrades. **Warehouse, lake and lakehouse** describe storage, management and consumption arrangements. **Data mesh** changes how teams own and publish products. **Medallion** describes how representations become more prepared for use.'),
  p('A company can therefore use domain-owned data products, a shared lakehouse platform and bronze/silver/gold layers at the same time. A domain may publish a star schema for BI, while another exposes a different model. Business modeling is another decision alongside storage and ownership.'),
  p('You will also hear **data fabric**, a broad industry term for connecting data, metadata, integration and policy across a distributed estate. Its implementation varies by vendor and design. Ask which concrete discovery, integration or governance capabilities a proposal supplies. Microsoft Fabric is a particular product; the generic term does not refer only to it.'),
  p('Finally, a **semantic layer** publishes business concepts and metrics to consumers, and **query federation** executes across connected systems. Those describe consumption and execution capabilities. Each term becomes easier to evaluate when you identify the responsibility it changes.')
], 'Several patterns can coexist because they answer different questions about the same system.', ['mesh', 'fabricconcept', 'medallion', 'queryConcepts']);

slide('Tools in context', 'Choose tools after you can explain the work', [
  p("If Waypoint wants to retrieve a monthly file, a Python script may be enough; **dlt** can help when ingestion needs normalization and load-state tracking. Propagating database inserts, updates and deletes is a different requirement: **CDC**, or change data capture. **Debezium** addresses that source-change problem, rather than the monthly-download problem."),
  p("For local queries and transformations, the team could start with **DuckDB**. If a workload needs distributed processing, it might evaluate Spark; if it needs SQL over supported connected sources, it might evaluate Trino. The choice follows the actual work and deployment needs."),
  p("dbt defines the analytical models that an engine builds. **Apache Airflow** can coordinate their execution with downloads, checks and other dependent jobs. It can trigger a dbt build or a Spark job without becoming their SQL engine. A BI tool or data app then exposes useful results to people."),
  p('For a design review, tell the story in that order: what arrives, where it is retained, how it becomes trusted data, and what a consumer receives. Introduce each tool at the point where it performs a needed job.')
], 'A tool is easier to understand when it appears as the answer to a concrete job in the pipeline.', ['dbt', 'dlt', 'debezium', 'duckdb', 'airflow']);

slide('Choosing', 'The right starting point depends on the problem you have now', [
  p('Return to Waypoint’s first question and imagine a small team with a few sources and a daily report. A local analytical database or managed warehouse, with retained source inputs and tested models, may solve the immediate problem with relatively little operating work. That is a complete architecture for the requirement.'),
  p('If the company later retains many kinds of files and several processing workloads need them, a governed lake may become useful. If those consumers need to coordinate changing shared tables, lakehouse table management becomes worth evaluating. The evidence is the workload and failure behavior, rather than a universal row-count threshold.'),
  p('Likewise, distributing ownership makes sense when real domain teams can support products and a shared platform can help them do so. A one-person project cannot remove its delivery bottleneck by declaring itself a mesh.'),
  p('The practical habit is to start with a consumer requirement, choose a design you can operate, and name the condition that would make you revisit it. We can apply that habit directly to your portfolio.')
], 'Choose a design you can explain and operate for the current requirement. Let a measurable new need justify the next boundary or tool.');

slide('Your project', 'Your Flight Reliability v1 already has a coherent architecture', [
  p('Your project asks one bounded question: **which airline and departure window has historically been most reliable for a selected route?** It uses January–March 2025 reporting-carrier records for flights between the six selected airports: SEA, SFO, LAX, DEN, ORD and JFK.'),
  p('Python retrieves the monthly source files and records versions, checksums and retrieval information. Validated Parquet provides a typed analytical representation. DuckDB executes queries, and dbt builds and tests the flight models and route-level outputs. A public explorer lets someone use the result.'),
  p('The metric definitions are part of that architecture. Cancellation rate uses the selected scheduled-leg population. The long-arrival-delay rate and p90 (90th-percentile) delay need their defined eligible-arrival population, excluding cancellations, diversions and missing arrival delay. The app should expose sample sizes and missing-data coverage so the result can be interpreted.'),
  p('This release exercises ingestion, modeling, transformation, quality and serving without requiring every platform in the historical story. Retained files plus DuckDB form a useful local analytical pipeline; they do not by themselves provide a shared transactional lakehouse.')
], 'The first release is strong when its question, source versions, transformations and published answer are understandable and reproducible.', ['bts', 'dbt']);

slide('Your project', 'Extend the project when you can state the new need', [
  p('Suppose the explorer can show that a route was disrupted, and you want to investigate whether weather was associated with the pattern. **NOAA**, the US National Oceanic and Atmospheric Administration, publishes weather observations that can support that investigation. The engineering work is then station selection, time alignment, unmatched coverage and a join that preserves flight grain. More sources alone do not create a better answer.'),
  p('Suppose you want to practice larger source archives and corrected-month replay with shared table state. The planned Spark/Delta extension becomes a way to learn those capabilities. Compare its result with the existing model and measure its behavior, rather than claiming that a small local dataset requires distributed processing.'),
  p("When repeated publications and historical backfills need coordination, Airflow supports workflow orchestration. **Astronomer Cosmos** can bring dbt’s model-level workflow into that orchestration. A later semantic interface can help several consumers use the same metrics. Each extension should preserve the established business meaning while proving one additional capability."),
  p('This gives your roadmap a clear progression: publish a dependable first answer, then add a specific requirement and demonstrate how the design handles it.')
], 'Keep the business answer stable while each extension adds a testable capability, such as source alignment, table updates or recoverable scheduling.', ['noaa', 'cosmos']);

slide('Migration', 'A migration should prove that the consumer still gets the right answer', [
  p('Imagine moving one corrected source month from your DuckDB pipeline into the planned Delta pipeline. Begin by recording the exact source versions, selected population and metric definitions. Those are the comparison baseline; a migration becomes difficult to assess if the input and business rules change at the same time.'),
  p('Build the new representation beside the old one. Compare individual flight keys and changed attributes, not only total row counts. Two outputs can contain the same number of rows and still disagree about which flight was cancelled. Reconcile aggregates and metric denominators as well.'),
  p('Then test how the new route behaves when interrupted and rerun. Check which state readers see, how access is enforced, and whether retained history supports recovery. Measure the operating work and resources needed for the improvement you intended.'),
  p('Once the consumer contract has been validated, move the consumer deliberately and keep a rollback path until the new route is dependable. The tiny lab makes one part of this reasoning visible before you add a distributed platform.')
], 'A successful migration preserves meaning and improves a stated requirement, with evidence from normal execution, failure and replay.');

slide('Lab', 'The lab makes the wrong population visible in eight rows', [
  p('The lab uses five synthetic flight identities across two months. January has an original file and a corrected replacement; February has one file. All three files remain available as source evidence. No real BTS download or cloud service is needed.'),
  p('Reading every file counts January twice. Choosing the current January version produces a different—and intended—population. This is why the same-looking metric can change before any complicated SQL or performance problem is involved.'),
  table(['How input is selected', 'Rows / cancellations', 'Cancellation rate'], [
    ['Read all retained files.', '8 rows, 2 cancellations', '25%: the population double-counts January.'],
    ['Choose the current file for each month.', '5 rows, 1 cancellation', '20%: the intended current population.'],
    ['Replay January into the transactional mart twice.', '5 rows, 1 cancellation', '20%: the repeated load preserves the intended result.']
  ]),
  p("The lab records its file selection in **JSON**. That document specifies which source file is current for each month. Typed Parquet and a local DuckDB transaction demonstrate the next boundaries. The JSON selection is a teaching aid, rather than a distributed Delta or Iceberg commit protocol.")
], 'A plausible percentage can be wrong because the input population is wrong. Select versions deliberately before interpreting a metric.');

slide('Lab', 'Run it, then inspect the corrected record', [
  { type: 'links', items: [['Open lab instructions and fixture downloads', 'lab/README.md'], ['Download the Python script', 'lab/run_lab.py']] },
  p("These commands use **uv** to run the script with DuckDB available. Run them from this deck’s folder after obtaining the lab files."),
  code('bash', '# From this deck’s folder; Python 3.11+ and uv\nuv run --with "duckdb>=1.4,<2" python lab/run_lab.py\n\n# Keep inspectable output in a new directory\nuv run --with "duckdb>=1.4,<2" python lab/run_lab.py --output ./architecture-lab-output'),
  p('Start by comparing F002 in the two January files. Then inspect the current-file selection and the typed silver Parquet. The final mart should contain five scheduled legs, one cancellation, four eligible arrivals and two arrivals delayed by at least 30 minutes. The p90 nonnegative arrival delay is 38.5 minutes.'),
  p('The script replaces January twice and asserts that no additional effects appear on the second run. It also deliberately interrupts a transaction after a delete, then checks that rollback preserves the published mart. These are different proofs: safe repetition and atomic failure handling.'),
  p('The assertions were executed with DuckDB 1.5.6. First-time dependency installation may need a network connection, but the lab itself makes no network requests. Default outputs are temporary; use the second command to retain them in a new directory.')
], 'Inspect the source change, selection and transaction boundary. Those explain the result more clearly than the architecture label alone.', ['duckdb', 'uv']);

slide('Interview practice', 'Explain the story before listing the tools', [
  p('Use a requirement, the mechanism it motivates and a consequence you would test. Try answering each question aloud before revealing the suggested reasoning.'),
  answer('“Why would a team add a lake to its warehouse?”', 'Its existing reports may be dependable while new needs require retaining more detail or using different processing workloads. A lake can preserve that detail for later use. The team then takes on version selection, discoverability and governance. A cloud warehouse might also meet the need; compare the actual constraint.'),
  answer('“What does a lakehouse add?”', 'It brings reliable table management and analytical execution to lake-style storage. Explain how a writer publishes a table state and how readers resolve it. Name the file, table, catalog and engine roles, then check update, failure and conflict behavior for that setup.'),
  answer('“Does data mesh replace a lakehouse?”', 'Mesh changes who owns and supports data products and how a shared platform helps them publish consistently. Those products can use a lakehouse or a warehouse. Storage choices and ownership choices can therefore evolve independently.'),
  answer('“The dashboard changed after migration. What do you investigate?”', 'Trace the result back through the metric definition, row grain, joins, date rules, input population and source versions. Reconcile changed keys and denominators. Only after establishing that the systems are answering the same question should you compare execution performance.')
], 'A useful answer explains why the design fits the requirement and how you would know it works.');

slide('Architecture practice', 'Practise choosing a design from a concrete situation', [
  p('For each case, draw the current data flow, name the actual difficulty and propose the smallest change that addresses it. Include an owner and a failure/replay check. The revealed reasoning is a starting point, not a single compulsory stack.'),
  answer('Case A: five analysts need a daily sales report', 'A small analytical database or managed warehouse plus retained inputs may be enough. Clarify the report population and freshness expectation, build tested models, and make reruns safe. A lakehouse becomes worth considering when a stated requirement needs the additional table/platform capabilities.'),
  answer('Case B: several teams update and query the same lake tables', 'The shared table state is now central. Specify the catalog and supported reader/writer paths, then test updates, schema evolution, conflicting writes, permissions and maintenance. Explain which complete state readers see during a failed publication.'),
  answer('Case C: many domains depend on one central delivery queue', 'Investigate domain knowledge, staffing and responsibility. A larger engine will not give the central team more business understanding. Product ownership and self-serve platform practices may help if domain teams can actually support the responsibility.'),
  p('Write the decision as a short record: the need, alternatives, chosen boundaries, owner, evidence, operating effort and rollback. That document should still make sense if the vendor names are removed.')
], 'Judge a design by its correctness, usefulness and operating demands, rather than how many familiar tools it includes.');

slide('Reference', 'A glossary to revisit after the story', [
  p('Use this page as a reminder after reading the explanations. These terms describe different responsibilities, so a system may combine several of them.'),
  table(['Term', 'What to remember'], [
    ['Data warehouse', 'It integrates analytical data and provides prepared representations for reporting and other consumers.'],
    ['Data lake', 'It retains flexible source and derived data for several kinds of processing and consumption.'],
    ['Lakehouse', 'It combines lake-style storage with reliable table management and analytical execution.'],
    ['Snapshot / commit', 'A snapshot is a table state; a commit publishes a new state through the supported protocol.'],
    ['Catalog', 'It helps resolve and manage named assets and their metadata; its exact role depends on the implementation.'],
    ['Data product', 'It gives consumers a supported interface with explicit meaning, ownership and expectations.'],
    ['Data mesh', 'It combines domain product ownership, self-serve platform capabilities and shared governance.'],
    ['Medallion', 'It names the progression from source evidence through validated data to consumer-ready outputs.'],
    ['Serving / semantic layer', 'Serving exposes usable results; a semantic layer defines business concepts and metrics for consumers.'],
    ['Interoperability', 'It means the chosen versions and access paths support the intended behavior, beyond merely reading the same file format.']
  ])
], 'When a label is ambiguous, explain the concrete responsibility, interface or guarantee you mean.');

slide('Reference', 'Retell the evolution in your own words', [
  p('Start with a business that needs consistent reporting across operational systems. It integrates the data into a warehouse so consumers can use shared analytical definitions without rebuilding every source join themselves.'),
  p('As detailed data and unfamiliar workloads grow, retaining flexible source history becomes more valuable. Distributed processing and later independently operated cloud storage support that work. Cloud warehouses also improve provisioning and execution options, so several designs remain reasonable.'),
  p('When many files must behave like a changing, dependable table, the team needs explicit state and coordinated publication. Lakehouse mechanisms bring those capabilities to lake data. Modeling, quality, security and consumer definitions still need deliberate work.'),
  p('When the bottleneck moves to one central team owning everybody’s meaning and delivery, domain data products and shared platform practices address that organizational problem. That is the mesh discussion. Your own project can learn from the whole story while starting with a small, reproducible first answer.'),
  { type: 'links', items: [['Continue with file formats', '../data-file-formats/data-file-formats.html'], ['Continue with table formats', '../data-table-formats/data-table-formats.html'], ['Compare business modeling approaches', '../modeling-approaches/modeling-approaches.html']] }
], 'Each architectural change is easier to understand as a response to a particular need. Keep that causal story when explaining your own design.');
};

// Editorial inventory: each first appearance gets a matching side reference card.
// The content test guards against later edits naming a tool before its introduction.
module.exports.introductions = [
  ['SSIS', 6, 'SSIS'], ['Teradata', 6, 'Teradata'],
  ['Hadoop', 8, 'Hadoop'], ['HDFS', 8, 'HDFS'], ['MapReduce', 8, 'MapReduce'], ['Hive', 8, 'Hive'], ['Hive Metastore', 8, 'Hive Metastore'],
  ['Spark', 10, 'Spark'], ['PySpark', 10, 'PySpark'], ['Python', 10, 'Python'], ['Presto', 10, 'Presto'],
  ['S3', 11, 'Amazon S3'], ['Parquet', 11, 'Parquet'],
  ['Snowflake', 12, 'Snowflake'], ['BigQuery', 12, 'BigQuery'], ['Dremel', 12, 'Dremel'], ['Redshift', 12, 'Amazon Redshift'],
  ['dbt', 13, 'dbt'], ['CSV', 13, 'CSV'], ['Iceberg', 17, 'Apache Iceberg'], ['Trino', 17, 'Trino'],
  ['Delta Lake', 18, 'Delta Lake'], ['Hudi', 18, 'Apache Hudi'],
  ['Google Cloud Storage', 20, 'Google Cloud Storage'], ['Microsoft Fabric', 20, 'Microsoft Fabric'], ['Databricks', 20, 'Databricks'],
  ['Kafka', 23, 'Kafka'], ['Flink', 23, 'Flink'], ['Structured Streaming', 23, 'Spark Structured Streaming'],
  ['YAML', 26, 'YAML'], ['dlt', 28, 'dlt'], ['Debezium', 28, 'Debezium'], ['DuckDB', 28, 'DuckDB'], ['Airflow', 28, 'Apache Airflow'],
  ['Cosmos', 31, 'Astronomer Cosmos'], ['JSON', 33, 'JSON'], ['uv', 34, 'uv']
];
