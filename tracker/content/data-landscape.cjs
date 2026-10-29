// Authored reference content. Product roles, not feature or price rankings.
// Build browser data + Markdown with scripts/build-data-landscape.cjs.
const sources = {};
const source = (id, title, url) => { sources[id] = { title, url }; };
source('hive', 'Apache Hive: introduction', 'https://hive.apache.org/docs/latest/introduction-to-apache-hive/');
source('hms', 'Apache Hive: metastore role', 'https://hive.apache.org/');
source('trino', 'Trino: concepts and connectors', 'https://trino.io/docs/current/overview/concepts.html');
source('trinoHive', 'Trino: Hive connector and metastore requirements', 'https://trino.io/docs/current/connector/hive.html');
source('presto', 'Presto: use cases', 'https://www.prestodb.io/docs/current/overview/use-cases.html');
source('rename', 'Trino founders: PrestoSQL rename, December 2020', 'https://trino.io/blog/2020/12/27/announcing-trino.html');
source('spark', 'Apache Spark: overview', 'https://spark.apache.org/docs/latest/');
source('sparkTune', 'Spark SQL: performance tuning', 'https://spark.apache.org/docs/latest/sql-performance-tuning.html');
source('sparkStream', 'Spark: Structured Streaming guide', 'https://spark.apache.org/docs/latest/streaming/apis-on-dataframes-and-datasets.html');
source('hadoop', 'Apache Hadoop: component documentation', 'https://hadoop.apache.org/docs/stable/');
source('hdfs', 'Hadoop: HDFS architecture', 'https://hadoop.apache.org/docs/stable/hadoop-project-dist/hadoop-hdfs/HdfsDesign.html');
source('yarn', 'Hadoop: YARN architecture', 'https://hadoop.apache.org/docs/stable/hadoop-yarn/hadoop-yarn-site/YARN.html');
source('parquet', 'Apache Parquet: overview', 'https://parquet.apache.org/docs/overview/');
source('orc', 'Apache ORC: design and background', 'https://orc.apache.org/docs/');
source('avro', 'Apache Avro: specification, including schema resolution', 'https://avro.apache.org/docs/1.12.0/specification/');
source('arrow', 'Apache Arrow: columnar memory and transport specification', 'https://arrow.apache.org/docs/format/Columnar.html');
source('pyarrow', 'PyArrow: Python tools and I/O', 'https://arrow.apache.org/docs/python/');
source('csv', 'IETF RFC 4180: CSV', 'https://datatracker.ietf.org/doc/html/rfc4180');
source('json', 'IETF RFC 8259: JSON', 'https://www.rfc-editor.org/rfc/rfc8259');
source('jsonl', 'JSON Lines: format description', 'https://jsonlines.org/');
source('protobuf', 'Protocol Buffers: overview', 'https://protobuf.dev/overview/');
source('gzip', 'Python: gzip compression', 'https://docs.python.org/3/library/gzip.html');
source('snappy', 'Snappy: compression design', 'https://google.github.io/snappy/');
source('zstd', 'Zstandard: compression design', 'https://facebook.github.io/zstd/');
source('delta', 'Delta Lake: introduction and feature scope', 'https://docs.delta.io/');
source('iceberg', 'Apache Iceberg: introduction', 'https://iceberg.apache.org/docs/latest/');
source('iceEvolve', 'Iceberg: schema and partition evolution', 'https://iceberg.apache.org/docs/latest/evolution/');
source('iceCommit', 'Iceberg: commits and reliability', 'https://iceberg.apache.org/docs/latest/reliability/');
source('iceMaintain', 'Iceberg: snapshot expiration and file compaction', 'https://iceberg.apache.org/docs/latest/maintenance/');
source('hudi', 'Apache Hudi: overview', 'https://hudi.apache.org/docs/overview/');
source('glue', 'AWS Glue: Data Catalog and crawlers', 'https://docs.aws.amazon.com/glue/latest/dg/catalog-and-crawler.html');
source('unity', 'Databricks: Unity Catalog', 'https://docs.databricks.com/aws/en/data-governance/unity-catalog/');
source('s3', 'AWS: Amazon S3 concepts', 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html');
source('adls', 'Microsoft: Azure Data Lake Storage', 'https://learn.microsoft.com/en-us/azure/storage/blobs/data-lake-storage-introduction');
source('gcs', 'Google Cloud: Cloud Storage overview', 'https://docs.cloud.google.com/storage/docs/introduction');
source('duckdb', 'DuckDB: why an embedded analytical database', 'https://duckdb.org/why_duckdb');
source('pandas', 'pandas: getting started', 'https://pandas.pydata.org/docs/getting_started/intro_tutorials/index.html');
source('polars', 'Polars: expressions and DataFrames', 'https://docs.pola.rs/user-guide/getting-started/');
source('flink', 'Apache Flink: processing concepts', 'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/overview/');
source('beam', 'Apache Beam: model, windows and runners', 'https://beam.apache.org/documentation/basics/');
source('kafka', 'Apache Kafka: introduction', 'https://kafka.apache.org/intro/');
source('debezium', 'Debezium: architecture and deployment options', 'https://debezium.io/documentation/reference/stable/architecture.html');
source('registry', 'Confluent: schema registry', 'https://docs.confluent.io/platform/current/schema-registry/index.html');
source('pubsub', 'Google Cloud: Pub/Sub overview', 'https://docs.cloud.google.com/pubsub/docs/overview');
source('kinesis', 'AWS: Kinesis Data Streams', 'https://docs.aws.amazon.com/streams/latest/dev/introduction.html');
source('dbt', 'dbt: introduction', 'https://docs.getdbt.com/docs/introduction');
source('airflow', 'Apache Airflow: architecture', 'https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/overview.html');
source('airflowPractice', 'Airflow: rerun-safe task practices', 'https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html');
source('dagster', 'Dagster: assets and orchestration', 'https://dagster.io/docs/guides/build/assets');
source('prefect', 'Prefect: introduction', 'https://docs.prefect.io/v3/get-started');
source('dlt', 'dlt: Python ingestion', 'https://dlthub.com/docs/intro');
source('airbyte', 'Airbyte: replication core concepts', 'https://docs.airbyte.com/platform/using-airbyte/core-concepts');
source('fivetran', 'Fivetran: connectors and destinations', 'https://fivetran.com/docs/getting-started');
source('snowflake', 'Snowflake: architecture and virtual warehouses', 'https://docs.snowflake.com/en/user-guide/intro-key-concepts');
source('bigquery', 'Google Cloud: BigQuery overview', 'https://docs.cloud.google.com/bigquery/docs/introduction');
source('redshift', 'AWS: Redshift overview', 'https://docs.aws.amazon.com/redshift/latest/mgmt/welcome.html');
source('databricks', 'Databricks: platform overview', 'https://docs.databricks.com/aws/en/introduction/');
source('fabric', 'Microsoft: Fabric overview', 'https://learn.microsoft.com/en-us/fabric/fundamentals/microsoft-fabric-overview');
source('postgres', 'PostgreSQL: database overview', 'https://www.postgresql.org/about/');
source('clickhouse', 'ClickHouse: analytical database overview', 'https://clickhouse.com/docs/get-started/about/intro');
source('adf', 'Microsoft: Azure Data Factory', 'https://learn.microsoft.com/en-us/azure/data-factory/introduction');
source('cosmos', 'Astronomer Cosmos: dbt and Airflow', 'https://astronomer.github.io/astronomer-cosmos/');
source('semantic', 'dbt: semantic layer', 'https://docs.getdbt.com/docs/use-dbt-semantic-layer/dbt-sl');
source('gx', 'Great Expectations: GX Core', 'https://docs.greatexpectations.io/docs/core/introduction/');
source('dbtTests', 'dbt: data tests', 'https://docs.getdbt.com/docs/build/data-tests');
source('contracts', 'dbt: model contracts and their limits', 'https://docs.getdbt.com/docs/mesh/govern/model-contracts');
source('lineage', 'OpenLineage: specification and collection', 'https://openlineage.io/docs/');
source('datahub', 'DataHub: project overview and metadata role', 'https://github.com/datahub-project/datahub');
source('powerbi', 'Microsoft: Power BI overview', 'https://learn.microsoft.com/en-us/power-bi/fundamentals/power-bi-overview');
source('tableau', 'Tableau: visualization and authoring', 'https://help.tableau.com/current/pro/desktop/en-us/gettingstarted_overview.htm');
source('superset', 'Apache Superset: project overview', 'https://github.com/apache/superset');
source('streamlit', 'Streamlit: documentation', 'https://docs.streamlit.io/');
source('mesh', 'Zhamak Dehghani: data mesh principles', 'https://martinfowler.com/articles/data-mesh-principles.html');
source('medallion', 'Databricks: medallion layers', 'https://docs.databricks.com/aws/en/lakehouse/medallion');
source('dataFabric', 'IBM: data fabric terminology', 'https://www.ibm.com/think/topics/data-fabric');
source('lakehouse', 'CIDR 2021: lakehouse proposal', 'https://www.cidrdb.org/cidr2021/papers/cidr2021_paper17.pdf');
source('incremental', 'dbt: incremental models', 'https://docs.getdbt.com/docs/build/incremental-models');
source('transaction', 'PostgreSQL: transaction isolation', 'https://www.postgresql.org/docs/current/transaction-iso.html');
source('partition', 'BigQuery: table partitioning', 'https://docs.cloud.google.com/bigquery/docs/partitioned-tables');
source('clustering', 'BigQuery: clustered tables', 'https://docs.cloud.google.com/bigquery/docs/clustered-tables');
source('kimball', 'Kimball Group: dimensional modeling techniques', 'https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/');
source('docker', 'Docker: containers and images', 'https://docs.docker.com/get-started/docker-overview/');
source('kubernetes', 'Kubernetes: role and concepts', 'https://kubernetes.io/docs/concepts/overview/');
source('terraform', 'HashiCorp: Terraform and infrastructure as code', 'https://developer.hashicorp.com/terraform/intro');
source('actions', 'GitHub: Actions workflows and CI', 'https://docs.github.com/en/actions/get-started/understand-github-actions');
source('uv', 'Astral: uv', 'https://docs.astral.sh/uv/');
source('ruff', 'Astral: Ruff', 'https://docs.astral.sh/ruff/');
source('pytest', 'pytest: test framework', 'https://docs.pytest.org/en/stable/');
source('iam', 'AWS: identity and access management', 'https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction.html');
source('rowSecurity', 'BigQuery: row-level security', 'https://docs.cloud.google.com/bigquery/docs/row-level-security-intro');
source('slo', 'Google SRE: service-level objectives', 'https://sre.google/sre-book/service-level-objectives/');


source('federation', 'Trino: analytical query use cases', 'https://trino.io/docs/current/overview/use-cases.html');
source('pushdown', 'Trino: predicate and projection pushdown', 'https://trino.io/docs/current/optimizer/pushdown.html');
source('eventTime', 'Flink: event time and watermarks', 'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/');
source('fabricDelta', 'Fabric: lakehouse and Delta tables', 'https://learn.microsoft.com/en-us/fabric/data-engineering/lakehouse-and-delta-tables');
source('parquetLayout', 'Parquet: row groups, column chunks and pages', 'https://parquet.apache.org/docs/concepts/');
source('transactions', 'PostgreSQL: transaction boundaries', 'https://www.postgresql.org/docs/current/tutorial-transactions.html');
source('httpx', 'HTTPX: HTTP requests, status codes and errors', 'https://www.python-httpx.org/quickstart/');
source('tez', 'Apache Tez: execution framework', 'https://tez.apache.org/');
source('athena', 'AWS: Amazon Athena SQL and Spark', 'https://docs.aws.amazon.com/athena/latest/ug/what-is.html');
source('dataflow', 'Google Cloud: Dataflow and Beam', 'https://docs.cloud.google.com/dataflow/docs/overview');

const groups = [], entries = [];
let current;
function group(id, name, question, note, lessons, decks) {
  current = { id, name, question, note, lessons, decks }; groups.push(current);
}
function term(id, name, kind, summary, what, why, difference, good, refs, related, aliases = []) {
  entries.push({ id, name, kind, group: current.id, summary, what, why, difference, good,
    sources: refs.split(' '), related: related.map(([to, label]) => ({ to, label })), aliases });
}

group('ingest', 'Move data', 'How does it get here?', 'Connectors copy records; CDC captures changes. Neither defines your business metrics.', ['Py3', 'PL5', 'A1'], ['python-ingestion']);
term('python', 'Python ingestion', 'tool', 'Custom API and file extraction',
  'A script that retrieves source data and records how it was obtained.', 'Useful when source behavior or validation needs custom code.',
  'You own pagination, timeouts, retry policy and checkpoints.', 'Retain source versions and test with offline fixtures; a successful download does not prove completeness.', 'httpx dlt', [['dlt','Can delegate loading to'],['parquet','Can publish typed data as'],['idempotency','Needs safe replay']], ['httpx','requests','API','REST']);
term('dlt', 'dlt', 'tool', 'Python-first extraction and loading',
  'A Python library for loading source data into structured destination datasets.', 'Reduces custom normalization, load-state and destination plumbing.',
  'A code-first ingestion library rather than a warehouse or scheduler.', 'Check the source, destination and incremental-state semantics. This is not Databricks’ former Delta Live Tables name.', 'dlt', [['python','Used from'],['duckdb','Can load into'],['incremental','Can track incremental loading']], ['data load tool','dltHub']);
term('airbyte', 'Airbyte', 'tool', 'Connector-based replication',
  'A platform that syncs configured sources to destinations.', 'Useful when supported connectors can replace bespoke extraction work.',
  'A configured connection combines source, destination, schedule and sync mode.', 'Connector support and deletion/history behavior vary. Self-managed operation still takes work.', 'airbyte', [['cdc','Some connectors support'],['dbt','Can feed transformation models'],['fivetran','Compare replication approach with']]);
term('fivetran', 'Fivetran', 'tool', 'Managed source replication',
  'A managed service for moving supported source data to analytical destinations.', 'Useful when a team wants managed connector operations.',
  'Trades managed ingestion convenience against service cost and connector-specific behavior.', 'Confirm source permissions, deletion handling, sync latency and the billing unit for the exact connector.', 'fivetran', [['airbyte','Compare replication approach with'],['snowflake','Can load a warehouse such as'],['cdc','May capture database changes with']]);
term('cdc', 'CDC', 'concept', 'Capture inserts, updates and deletes',
  'Change data capture propagates source changes rather than repeatedly copying the whole source.', 'Keeps analytical copies current with less full-table extraction.',
  'Log-based capture reads a database change log; polling checks queries or timestamps.', 'Source ordering, delete events, initial snapshots and replay policy matter as much as capture.', 'debezium', [['debezium','Implemented by'],['kafka','Often transports events through'],['incremental','Feeds incremental application']], ['change data capture','WAL','binlog']);
term('debezium', 'Debezium', 'tool', 'Database change-event capture',
  'Source connectors turn database changes into events.', 'Useful for feeding analytics and other consumers from operational changes.',
  'Capture is separate from applying events to a destination table.', 'Kafka Connect is a common deployment; Debezium Server and embedded options also exist.', 'debezium', [['cdc','Implements'],['kafka-connect','Common deployment runtime'],['kafka','Can publish events to']]);
term('etl', 'ETL / ELT', 'concept', 'Where transformation happens',
  'ETL transforms before loading the target; ELT loads it before transformation there.', 'Makes the placement of processing and validation explicit.',
  'The acronym depends on which target boundary you mean.', 'One pipeline can do both at different boundaries. Neither guarantees trusted data.', 'dbt dlt', [['dbt','Often transforms after loading'],['warehouse','Can be the target'],['lake','Can retain raw inputs']], ['extract transform load','extract load transform']);

group('storage', 'Keep the bytes', 'Where does the data live?', 'Storage holds objects or files. An engine still has to interpret and query them.', ['A2', 'PL1', 'PL2'], ['architecture-evolution']);
term('object-storage', 'Object storage', 'concept', 'Objects addressed by keys',
  'Storage organized as named objects in containers such as buckets.', 'Separates retained data from the life of a compute machine.',
  'General-purpose object keys often look like folders; this is not the same interface as a local filesystem.', 'Object consistency alone does not make a group of writes one table transaction.', 's3', [['s3','AWS implementation'],['adls','Azure analytics storage'],['gcs','Google implementation'],['lake','Often underlies']]);
term('s3', 'Amazon S3', 'tool', 'AWS object storage',
  'An object service for data in buckets addressed by keys.', 'Often retains lake data, source archives and backups.',
  'Stores bytes independently of Spark, Trino or warehouse compute.', 'Choose access and lifecycle policies deliberately; do not treat a normal bucket like a mounted local disk.', 's3', [['object-storage','Implements'],['parquet','Can hold files encoded as'],['iceberg','Can hold data files for']]);
term('adls', 'ADLS Gen2', 'tool', 'Azure lake storage capabilities',
  'Azure Data Lake Storage capabilities built on Blob Storage.', 'Supports analytics with a hierarchical namespace and data access controls.',
  'Adds filesystem-oriented namespace capabilities to object storage.', 'ADLS is storage, not Azure Data Factory and not a table format.', 'adls', [['object-storage','Built on object storage'],['adf','Can receive data moved by'],['delta','Can hold tables represented by']], ['Azure Data Lake Storage','Azure Blob']);
term('gcs', 'Cloud Storage', 'tool', 'Google Cloud object storage',
  'Google Cloud’s bucket-and-object storage service.', 'Keeps files for analytical jobs, archives and other consumers.',
  'Separate from BigQuery’s query execution and managed table storage.', 'A bucket containing Parquet does not automatically provide a governed warehouse table.', 'gcs', [['object-storage','Implements'],['bigquery','Can provide external data to'],['parquet','Can retain']], ['GCS','Google Cloud Storage']);
term('hdfs', 'HDFS', 'tool', 'Distributed filesystem',
  'Hadoop’s filesystem distributes large files across DataNodes, with namespace metadata managed by NameNodes.', 'Designed for high-throughput distributed file access.',
  'A cluster filesystem with an operational model different from rented object storage.', 'HDFS stores data; MapReduce, Hive and Spark do processing. Small files impose metadata overhead.', 'hdfs', [['hadoop','Part of'],['spark','Can supply files to'],['hive','Can store data read by']]);
term('hadoop', 'Hadoop', 'tool', 'A family, not one engine',
  'An ecosystem including HDFS, YARN and MapReduce plus shared libraries.', 'Established distributed storage and batch-processing infrastructure.',
  'The umbrella name covers storage, resource scheduling and execution.', 'Using Spark does not require running your own HDFS or Hadoop cluster.', 'hadoop spark', [['hdfs','Contains storage component'],['yarn','Contains resource scheduler'],['mapreduce','Contains batch framework']], ['Apache Hadoop']);

group('formats', 'Encode the data', 'How are values represented?', 'File formats, memory layouts and compression codecs solve different problems.', ['Py3', 'S7', 'P3'], ['data-file-formats']);
term('csv', 'CSV', 'format', 'Readable delimited rows',
  'Text records with fields separated by a delimiter and quoting rules.', 'Simple exchange with spreadsheets and many source systems.',
  'Portable and inspectable, but does not carry a rich typed schema.', 'Agree on encoding, delimiter, NULLs, dates and quoting. Embedded newlines make naïve line splitting unsafe.', 'csv', [['python','Often ingested with'],['parquet','Convert validated analytical data to']]);
term('json', 'JSON', 'format', 'Nested text values',
  'Text objects, arrays and scalar values used to exchange structured data.', 'Fits APIs and variable nested payloads.',
  'Naturally expresses nested values; repeated field names and parsing add overhead.', 'Flattening arrays changes row grain. Missing fields and explicit null need deliberate handling.', 'json', [['jsonl','Record-per-line convention'],['protobuf','Compare message encoding with'],['parquet','Can normalize to typed analytical files']]);
term('jsonl', 'JSON Lines', 'format', 'One JSON value per line',
  'UTF-8 text with a complete JSON value on each nonempty line.', 'Convenient for log ingestion and incremental record processing.',
  'Can process one record at a time without parsing one giant array.', 'JSON Lines is a convention, not a new JSON type system; ordinary pretty-printed JSON is not necessarily JSONL.', 'jsonl', [['json','Uses'],['gzip','Often compressed with']], ['JSONL','NDJSON','newline-delimited JSON']);
term('avro', 'Avro', 'format', 'Schema-based record serialization',
  'A serialization system with schemas and compact binary record encoding.', 'Useful for events and record-oriented exchange with evolving schemas.',
  'Writer and reader schema resolution is central to compatibility.', 'An Avro container file includes a schema; Kafka message framing may refer to a registry instead. Evolution has rules.', 'avro', [['schema-registry','Can pair messages with'],['kafka','Often used for events on'],['parquet','Compare record vs column layout with']]);
term('parquet', 'Parquet', 'format', 'Columnar analytical files',
  'A typed column-oriented file format with row groups, encodings and compression.', 'Reads fewer columns and can skip irrelevant regions in analytical scans.',
  'Optimizes file-level analytics; does not manage a changing multi-file table.', 'Many tiny files can be slow. A Parquet filename glob can include obsolete table data.', 'parquet parquetLayout', [['delta','Provides data files for'],['iceberg','Common data files for'],['arrow','Compare disk layout with memory layout']], ['Apache Parquet']);
term('orc', 'ORC', 'format', 'Columnar files with stripes',
  'A typed columnar format with stripes, indexes and statistics.', 'Developed to improve Hive/Hadoop analytical storage and reads.',
  'Often encountered in Hive-oriented systems; also supported by other engines.', 'File support and table transaction support are separate questions. Benchmark your reader and workload.', 'orc', [['hive','Historically closely associated with'],['parquet','Compare columnar file format with']]);
term('arrow', 'Apache Arrow', 'format', 'Columnar memory and interchange',
  'A specification and ecosystem for typed columnar memory and data interchange.', 'Allows analytical components to exchange data with less conversion.',
  'Primarily a memory/interchange layout; Parquet targets compact persistent analytics files.', 'Zero-copy is possible only on compatible paths. Arrow also defines IPC serialization; it is not “memory only”.', 'arrow', [['pyarrow','Python implementation ecosystem'],['polars','Uses Arrow-compatible columnar data'],['parquet','Different role from']], ['Arrow IPC','Feather']);
term('protobuf', 'Protocol Buffers', 'format', 'Schema-defined binary messages',
  'A message serialization system with schemas, numbered fields and generated language bindings.', 'Useful for compact service and event messages.',
  'A message protocol rather than an analytical columnar file format.', 'Preserve field-number compatibility; binary payloads need the corresponding message definition to be interpreted.', 'protobuf', [['json','Compare message representation with'],['schema-registry','Can govern message schemas']]);
term('gzip', 'gzip', 'format', 'Compressed byte stream',
  'A compression format commonly wrapped around CSV or JSONL files.', 'Reduces transfer and storage size for text data.',
  'A codec/container layer, not a schema or row/column layout.', 'A single ordinary gzip stream is generally not independently splittable for parallel text reads; format framing matters.', 'gzip', [['jsonl','Common payload'],['csv','Common payload'],['zstd','Compare compression choices with']]);
term('snappy', 'Snappy', 'format', 'Compression favoring speed',
  'A compressor/decompressor designed for speed with reasonable size reduction.', 'Common inside analytics files and data systems.',
  'Prioritizes processing speed rather than maximum compression ratio.', 'Read/write codec support is implementation-specific. It does not replace Parquet or Avro.', 'snappy', [['parquet','Can compress pages in'],['zstd','Compare speed/size trade-off with']]);
term('zstd', 'Zstandard', 'format', 'Tunable compression',
  'A compression algorithm with multiple levels and optional dictionary support.', 'Useful when balancing transfer size, storage and CPU work.',
  'Offers a range of compression/speed settings; no single codec wins every workload.', 'Measure end-to-end reads and writes, not only compressed size. Check all consumers support the codec.', 'zstd', [['snappy','Compare codec with'],['parquet','Can be used inside']], ['zstd']);

group('tables', 'Manage tables & metadata', 'Which data is the current table?', 'A table format tracks state; a catalog resolves named tables. Both need compatible engines.', ['A2', 'SB3', 'A5'], ['data-table-formats', 'architecture-evolution']);
term('delta', 'Delta Lake', 'format', 'Table protocol and transaction log',
  'An open table format that manages data files and table changes through metadata and a transaction log.', 'Adds reliable updates, snapshots and schema controls to lake data.',
  'Data files are Parquet; the log determines the table state.', 'Read through a compatible Delta reader, not a Parquet glob. Retention and supported table features constrain time travel.', 'delta', [['parquet','Stores data in'],['spark','Common processing engine'],['databricks','Integrated in platform'],['iceberg','Alternative table format']]);
term('iceberg', 'Apache Iceberg', 'format', 'Snapshots and evolvable tables',
  'An open table format using metadata, manifests and snapshots to describe table state.', 'Supports changing analytical tables across compatible engines.',
  'Stable field identities, hidden partitioning and partition evolution are important design features.', 'Sharing files alone is insufficient: catalog, engine versions and read/write feature support must agree.', 'iceberg iceEvolve', [['parquet','Commonly stores data in'],['trino','Can be queried through'],['catalog','Needs a supported metadata/commit path'],['delta','Alternative table format']]);
term('hudi', 'Apache Hudi', 'format', 'Changing records and incremental work',
  'An open table platform combining table representation with ingestion and maintenance capabilities.', 'Useful for upserts and incremental processing of changing lake data.',
  'Emphasizes record keys, merge behavior, indexing and table services.', 'Copy-on-write and merge-on-read have different read/maintenance trade-offs; verify engine support.', 'hudi', [['cdc','Can receive changes from'],['spark','Common processing engine'],['iceberg','Compare table management with']], ['Hoodie']);
term('catalog', 'Catalog', 'concept', 'Resolve names to metadata',
  'A metadata interface that helps locate and manage named data assets.', 'Lets engines discover table definitions and, for supported formats, coordinate table metadata.',
  'An execution catalog and an enterprise discovery catalog can have different responsibilities.', 'Catalog registration alone does not enforce every storage access path or guarantee cross-engine writes.', 'glue trino', [['hms','An implementation'],['glue','AWS metadata service'],['unity','Governance-oriented catalog'],['datahub','Discovery catalog role']]);
term('hms', 'Hive Metastore', 'tool', 'Shared table metadata service',
  'A repository/service for table schemas, locations, partitions and related metadata.', 'Allows several engines to discover compatible lake table definitions.',
  'Can be used without submitting queries to the Hive execution engine.', '“Hive table” may refer to catalog metadata. Ask which engine actually runs the SQL.', 'hms trinoHive', [['hive','Originates in'],['trino','Can provide metadata to'],['spark','Can share metadata with']], ['HMS','metastore']);
term('glue', 'AWS Glue Data Catalog', 'tool', 'AWS-managed table metadata',
  'A centralized metadata repository that can be populated by crawlers, APIs or manual definitions.', 'Shares dataset descriptions with AWS analytical services.',
  'The Data Catalog is one component of Glue; Glue ETL jobs are a different responsibility.', 'A crawler infers metadata; inference is not proof of source correctness or a business contract.', 'glue', [['catalog','Implements a catalog role'],['s3','Can describe data stored in'],['iceberg','Can participate in table catalog setups']], ['Glue Catalog']);
term('unity', 'Unity Catalog', 'tool', 'Databricks governance layer',
  'A catalog and governance layer for data and AI assets in Databricks.', 'Centralizes supported access controls, discovery, auditing and lineage.',
  'A broader governance role than recording a file schema.', 'Managed service and open-source implementations are not identical. Verify enforcement on every consumer access path.', 'unity', [['databricks','Integrated into'],['catalog','Implements'],['lineage','Can capture'],['iam','Works with cloud access controls']]);

group('compute', 'Read & compute', 'What actually runs the work?', 'Engines execute; APIs and libraries expose computation. SQL is a language, not a storage layer.', ['Py2', 'SB1', 'SB2', 'A1'], ['pandas-polars', 'architecture-evolution']);
term('sql', 'SQL', 'concept', 'A query language, not an engine',
  'A language for declaring queries and data operations in supported database systems.', 'Lets you express joins, filters, aggregates and more without specifying every execution step.',
  'Spark SQL, Trino, DuckDB and PostgreSQL implement their own SQL dialects and execution behavior.', 'Check the target engine for syntax, NULL rules, types and transaction support; the same-looking query can behave differently.', 'trino postgres', [['duckdb','One engine that executes'],['spark','Provides Spark SQL'],['trino','Another engine that executes']], ['Structured Query Language']);
term('spark', 'Apache Spark', 'tool', 'Distributed processing engine',
  'An engine for SQL, DataFrames and other large-scale analytical processing.', 'Useful when a workload benefits from parallel execution across a cluster.',
  'Execution is distinct from HDFS storage, Delta table metadata and the Databricks platform.', 'Can also run locally. Distributed execution adds scheduling, shuffle and operational overhead.', 'spark', [['pyspark','Python API'],['hdfs','Can read from'],['delta','Can process tables using'],['shuffle','May move data through']]);
term('pyspark', 'PySpark', 'tool', 'Python API for Spark',
  'Python interfaces for constructing and running Spark jobs.', 'Lets Python users work with Spark SQL, DataFrames and streaming.',
  'A Spark DataFrame is not a pandas DataFrame; operations form work for Spark execution.', 'Avoid pulling large distributed results to the driver with collect() or toPandas().', 'spark', [['spark','API for'],['pandas','Different execution model from'],['structured-streaming','Can express']]);
term('hive', 'Apache Hive', 'tool', 'SQL warehousing over distributed data',
  'Software for querying and managing large datasets in distributed storage using SQL.', 'Brought SQL-oriented warehouse workflows to the Hadoop ecosystem.',
  'Includes query execution and metadata components; Hive Metastore can be used independently.', 'Hive does not always mean MapReduce. Execution backend and transaction support depend on configuration and version.', 'hive', [['hms','Includes metadata component'],['hdfs','Can query stored data in'],['presto','Alternative SQL execution approach']]);
term('presto', 'Presto / PrestoDB', 'tool', 'Distributed SQL query engine',
  'An engine that queries large datasets through connectors to multiple sources.', 'Useful for analytical SQL without first moving everything into one database.',
  'PrestoDB and Trino are separate projects with shared ancestry.', 'PrestoSQL was renamed Trino in 2020; PrestoDB did not disappear. Connector behavior and versions differ.', 'presto rename', [['trino','Related project; distinct today'],['hms','Can use shared table metadata'],['federation','Supports through connectors']], ['PrestoDB']);
term('trino', 'Trino', 'tool', 'Distributed and federated SQL',
  'A coordinator-and-worker query engine with connectors to varied data sources.', 'Lets analysts query lake tables and other systems with SQL.',
  'Formerly PrestoSQL; a separate codebase from present-day PrestoDB.', 'A Trino catalog is connector configuration, not necessarily an enterprise data catalog. Writes depend on connectors.', 'trino rename', [['iceberg','Can query using a connector'],['hms','Can obtain Hive metadata from'],['presto','Shared ancestry with'],['federation','Can execute']], ['PrestoSQL']);
term('duckdb', 'DuckDB', 'tool', 'Embedded analytical SQL database',
  'An in-process analytical database that can query files and persist database tables.', 'Excellent for local analysis, repeatable data pipelines and small first releases.',
  'No separate database server is needed for the embedded engine.', 'Local does not mean tiny-data-only; memory, disk, concurrency and workload still determine practical limits.', 'duckdb', [['parquet','Can query directly'],['dbt','Can execute models via dbt-duckdb'],['spark','Compare local vs distributed execution with']]);
term('pandas', 'pandas', 'tool', 'Python tabular manipulation',
  'A Python library for indexed tabular data, joins, aggregation and time-series work.', 'Useful for exploration and familiar Python data workflows.',
  'Usually eager operations on a local DataFrame rather than a distributed query plan.', 'Check dtypes, memory and join cardinality. A notebook that runs is not automatically a reliable pipeline.', 'pandas', [['polars','Alternative DataFrame library'],['duckdb','SQL alternative for tabular work'],['pyarrow','Can use for columnar interoperability']]);
term('polars', 'Polars', 'tool', 'Expression-based DataFrame engine',
  'A DataFrame engine with eager and lazy APIs and columnar execution.', 'Useful for analytical transformations with optimized lazy plans.',
  'Expressions and query planning differ from pandas’ index-oriented API.', 'Lazy execution can optimize a query; performance and streaming eligibility still depend on the operations and environment.', 'polars', [['pandas','Compare DataFrame API with'],['arrow','Uses compatible columnar representations'],['pushdown','Lazy plans can benefit from']]);
term('pyarrow', 'PyArrow', 'tool', 'Arrow and file I/O in Python',
  'Python bindings and tools for Arrow data, datasets and formats such as Parquet.', 'Useful for typed conversion, efficient file I/O and interchange.',
  'A library implementing multiple capabilities, not another name for Parquet.', 'Specify important types rather than trusting inference; compatibility depends on the chosen file features.', 'pyarrow', [['arrow','Implements Python access to'],['parquet','Can read and write'],['python','Useful in ingestion scripts']]);
term('mapreduce', 'MapReduce', 'tool', 'Distributed map/shuffle/reduce',
  'A batch programming and execution model that groups mapped records for reduction.', 'Enabled scalable processing with distribution and failure handling.',
  'Classic jobs have materialized stage boundaries; Spark offers a broader execution model.', 'Historical importance does not make it a mandatory first tool for your local project.', 'hadoop', [['hadoop','Part of ecosystem'],['hdfs','Often processed files from'],['spark','Compare execution approach with']]);

term('tez', 'Apache Tez', 'tool', 'DAG execution on Hadoop',
  'An execution framework for expressing processing as a directed graph of tasks.', 'Useful as an execution backend for systems such as Hive.',
  'Executes a processing plan; it is not the Hive SQL language or the Hive Metastore.', 'A processing DAG is not the same operating boundary as a scheduled business workflow in Airflow.', 'tez hive', [['hive','Can execute plans for'],['yarn','Uses Hadoop resource management'],['mapreduce','Alternative execution framework']]);

group('platforms', 'Databases & platforms', 'What system do users work in?', 'A platform bundles several layers. A warehouse can also query open lake tables.', ['PL1', 'PL2', 'PL3', 'PL4', 'SB4'], ['architecture-evolution']);
term('snowflake', 'Snowflake', 'tool', 'Managed cloud data platform',
  'A managed analytical service with stored data, virtual-warehouse compute and cloud services.', 'Useful for SQL analytics with independently provisioned workload capacity.',
  'A Snowflake virtual warehouse is compute, not a separate copy of all stored tables.', 'Do not confuse Snowflake the product with a snowflake-shaped dimensional schema. Cost depends on workload and configuration.', 'snowflake', [['warehouse','Implements warehouse-oriented analytics'],['iceberg','Also supports Iceberg table options'],['dbt','Can execute models built by']]);
term('bigquery', 'BigQuery', 'tool', 'Google-managed analytics',
  'A managed analytical service for SQL and broader data workloads.', 'Useful when the service manages much of the query infrastructure.',
  'Separates managed analytical execution from the consumer’s local machine.', 'Serverless does not mean free or limitless. Pricing and capacity modes differ; scan reduction still matters.', 'bigquery', [['gcs','Can query external data in'],['partitioning','Supports table partitioning'],['clustering','Supports clustered tables'],['warehouse','Serves analytical warehouse use cases']]);
term('redshift', 'Amazon Redshift', 'tool', 'AWS-managed analytical warehouse',
  'A managed SQL warehouse with provisioned and serverless deployment options.', 'Useful for analytical workloads integrated with AWS services.',
  'A warehouse service rather than general-purpose S3 object storage.', 'Provisioned and serverless capacity models differ. Evaluate external data access, concurrency and cost for your setup.', 'redshift', [['s3','Can integrate with files in'],['warehouse','Implements'],['snowflake','Alternative managed analytical service']]);
term('databricks', 'Databricks', 'tool', 'Integrated analytics and AI platform',
  'A platform combining processing, SQL, governance and data/AI development experiences.', 'Useful when teams want integrated lakehouse workflows and managed operation.',
  'A platform around engines and metadata, not a synonym for Apache Spark or Delta Lake.', 'An open format does not make every platform feature portable. Check runtime, catalog and consumer paths.', 'databricks', [['spark','Supports processing with'],['delta','Integrates table management with'],['unity','Provides governance through'],['lakehouse','Common architectural fit']]);
term('fabric', 'Microsoft Fabric', 'tool', 'Microsoft analytics suite',
  'A SaaS analytics platform integrating engineering, warehousing, real-time and BI experiences.', 'Useful when teams want connected Microsoft data and reporting workloads.',
  'Combines several experiences around OneLake rather than being only a file format or engine.', 'Fabric the product is different from the generic term data fabric. Capacity and access behavior depend on the workload.', 'fabric fabricDelta', [['powerbi','Integrates reporting through'],['delta','Default lakehouse table format'],['data-fabric','Different from this architecture term']], ['OneLake']);
term('postgres', 'PostgreSQL', 'tool', 'General-purpose relational database',
  'An open-source database supporting SQL, transactions and extensible data types.', 'Useful for operational applications and many moderate analytical workloads.',
  'Often serves OLTP work; it is not a file format or only a warehouse query engine.', 'Heavy analytics can compete with application transactions. Choose indexes and isolation intentionally.', 'postgres', [['oltp-olap','Can support both workload types'],['cdc','Can supply database changes for'],['duckdb','Compare application vs analytical focus with']], ['Postgres']);
term('clickhouse', 'ClickHouse', 'tool', 'Column-oriented analytical database',
  'A database designed for analytical queries, including event and observability workloads.', 'Useful for repeated aggregation over large analytical datasets.',
  'Owns an analytical storage/query system rather than just federating external SQL sources.', 'Update, merge and deduplication behavior depends on table engine and design; do not assume OLTP semantics.', 'clickhouse', [['oltp-olap','Oriented toward analytical workloads'],['presto','Compare stored analytics vs federated execution with']]);

term('athena', 'Amazon Athena', 'tool', 'Managed SQL over lake data',
  'An AWS interactive query service for data such as files in S3; it also offers a Spark experience.', 'Useful for SQL exploration without operating a separate query cluster.',
  'A managed service rather than S3 storage or the open-source engine project itself.', 'Athena SQL and Athena Spark are distinct experiences. Table, catalog and engine-version support still need checking.', 'athena', [['s3','Can query data in'],['glue','Can use metadata from'],['spark','Also has a managed Spark experience']]);

group('events', 'Transport & process events', 'What happens as events arrive?', 'A broker keeps/moves events. A stream processor computes results from them.', ['A1', 'SB2'], ['architecture-evolution']);
term('kafka', 'Apache Kafka', 'tool', 'Durable partitioned event log',
  'An event-streaming platform with topics, partitions and independently advancing consumers.', 'Useful for retaining events and decoupling producers from consumers.',
  'Stores event streams; Flink or Spark can compute over them.', 'Order is per partition, not global. Retention and delivery guarantees need explicit configuration.', 'kafka', [['kafka-connect','Connector framework in ecosystem'],['flink','Can feed processing by'],['avro','Possible event encoding'],['exactly-once','Guarantee scope to verify']]);
term('kafka-connect', 'Kafka Connect', 'tool', 'Source and sink connector runtime',
  'A framework for streaming records between Kafka and external systems through connectors.', 'Reduces custom producer/consumer integration plumbing.',
  'A connector execution framework, not the same thing as a Kafka topic or a stream-processing query.', 'Source and sink connector behavior differs. A connector being available does not prove deletion or transactional semantics.', 'kafka debezium', [['kafka','Connects systems to'],['debezium','Can run database connectors from']]);
term('flink', 'Apache Flink', 'tool', 'Stateful distributed processing',
  'An engine for stateful computations over bounded and unbounded data.', 'Useful for event-time processing and continuously maintained results.',
  'Runs computation; Kafka transports/retains the events.', 'State size, checkpoints, late events and sink guarantees shape correctness and operating cost.', 'flink', [['kafka','Can consume events from'],['watermark','Uses event-time progress concepts such as'],['beam','Can serve as a runner for']]);
term('structured-streaming', 'Structured Streaming', 'tool', 'Incremental processing in Spark',
  'Spark’s streaming API built around incremental DataFrame/SQL computations.', 'Reuses Spark’s structured APIs for arriving data.',
  'Often executes in micro-batches; it is not equivalent to a Kafka broker.', 'Checkpoint state, output mode, event-time watermarks and sink support all affect restart behavior.', 'sparkStream', [['spark','Part of'],['kafka','Can read events from'],['watermark','Can manage late event state with']], ['Spark Structured Streaming']);
term('beam', 'Apache Beam', 'tool', 'Portable pipeline programming model',
  'SDKs and a model for expressing bounded and unbounded data processing.', 'Lets a pipeline target supported execution runners.',
  'Describes the pipeline; a runner such as Flink or Dataflow executes it.', 'Runner capability and connector support differ. Portability is not a promise of identical behavior everywhere.', 'beam', [['flink','One possible runner'],['batch-stream','Models both bounded and unbounded data']]);
term('pubsub', 'Google Pub/Sub', 'tool', 'Managed publish/subscribe messaging',
  'A Google Cloud messaging service connecting publishers to subscriptions.', 'Useful for decoupling producers and event-consuming services.',
  'A managed delivery system rather than an analytical table or BI tool.', 'Delivery, ordering and exactly-once options have specific scopes; check the chosen subscription mode.', 'pubsub', [['kafka','Compare messaging model with'],['beam','Can feed a processing pipeline expressed with']]);
term('kinesis', 'Kinesis Data Streams', 'tool', 'AWS-managed data streams',
  'An AWS service for collecting and consuming streams of records.', 'Useful for streaming integrations in AWS environments.',
  'A managed stream service; consumers still implement useful processing.', 'Choose stream capacity, partition-key distribution and retention deliberately. This entry refers to Data Streams specifically.', 'kinesis', [['kafka','Compare event infrastructure with'],['flink','Can feed stateful processing by']], ['Amazon Kinesis']);
term('schema-registry', 'Schema registry', 'concept', 'Version event message definitions',
  'A service for storing schemas and enforcing configured compatibility rules between versions.', 'Helps independently deployed producers and consumers agree on message shape.',
  'Message-schema metadata differs from a lake table catalog.', 'Compatibility checks do not prove the event’s business meaning, completeness or correct units.', 'registry', [['avro','Can manage schemas for'],['protobuf','Can manage schemas for'],['catalog','Different metadata responsibility from']]);

term('dataflow', 'Google Dataflow', 'tool', 'Managed Beam execution',
  'A Google Cloud service for executing batch and streaming data pipelines.', 'Useful when teams want managed execution for supported Beam workloads.',
  'Beam describes the pipeline; Dataflow runs it as a managed service.', 'Managed execution does not remove decisions about state, late data, connector behavior or cost.', 'dataflow', [['beam','Runs supported pipelines expressed with'],['pubsub','Can consume messages from'],['bigquery','Can publish results to']]);

group('workflows', 'Transform & coordinate', 'What runs, and in what order?', 'Transformation builds data. Orchestration schedules dependencies, retries and recovery.', ['D1', 'AF1', 'AF2', 'AF3'], ['dbt-fundamentals']);
term('dbt', 'dbt', 'tool', 'Versioned analytical transformations',
  'A framework for defining, building, testing and documenting data models.', 'Makes analytical transformation logic and dependencies explicit.',
  'The target engine executes the SQL; dbt does not become the warehouse.', 'dbt Core and hosted platform capabilities differ. Ingestion and event transport are separate responsibilities.', 'dbt', [['duckdb','Can execute locally through adapter'],['snowflake','Can execute on'],['airflow','Can be scheduled by'],['data-tests','Provides tests for']], ['data build tool','dbt Core']);
term('airflow', 'Apache Airflow', 'tool', 'Workflow dependency orchestration',
  'A platform for defining and operating workflows made of dependent tasks.', 'Coordinates scheduled work, retries and integrations across systems.',
  'Tasks trigger/run work; the scheduler is not a distributed SQL engine.', 'Use explicit data intervals and rerun-safe tasks. Pass small metadata references rather than bulk data between tasks.', 'airflow', [['dag','Represents workflows as'],['spark','Can trigger work in'],['cosmos','Can integrate dbt with'],['idempotency','Tasks should support']]);
term('dagster', 'Dagster', 'tool', 'Asset-oriented orchestration',
  'An orchestration system with software-defined assets, dependencies and execution metadata.', 'Useful when datasets and their lineage are the central operating model.',
  'Can describe the data asset being produced, alongside jobs that produce it.', 'An asset declaration does not validate the data automatically; configure checks, resources and deployment behavior.', 'dagster', [['airflow','Alternative orchestration approach'],['dbt','Can coordinate models from'],['lineage','Can expose dependency metadata for']]);
term('prefect', 'Prefect', 'tool', 'Python-native workflow orchestration',
  'An orchestration engine for Python flows and tasks with tracked execution state.', 'Adds scheduling, retries and monitoring to Python workflows.',
  'Focuses on orchestrating code; does not replace the storage/query engine.', 'Decide where workers and code run and how retries interact with side effects.', 'prefect', [['airflow','Alternative orchestration approach'],['python','Can coordinate extraction written in'],['idempotency','Still requires safe side effects']]);
term('adf', 'Azure Data Factory', 'tool', 'Managed integration pipelines',
  'An Azure service for data movement, transformation coordination and integration workflows.', 'Useful for managed, connector-driven data integration in Azure.',
  'Pipelines coordinate activities; linked processing systems may execute transformations.', 'ADF and Fabric Data Factory are related product experiences, not interchangeable configuration targets.', 'adf', [['adls','Can move data into'],['databricks','Can coordinate processing on'],['etl','Can implement']], ['ADF']);
term('cosmos', 'Astronomer Cosmos', 'tool', 'dbt workflows in Airflow',
  'An integration that turns dbt workflow structure into Airflow tasks and DAGs.', 'Makes model-level orchestration and visibility available in Airflow.',
  'An integration layer, not another dbt execution engine.', 'This is Astronomer Cosmos, not Azure Cosmos DB. Keep adapter, dbt and Airflow integration versions compatible.', 'cosmos', [['dbt','Reads workflow structure from'],['airflow','Builds tasks in']], ['Cosmos']);
term('dag', 'DAG', 'concept', 'Acyclic dependency graph',
  'A directed acyclic graph showing dependencies between units of work.', 'Expresses which outputs or tasks must be ready before others run.',
  'The same graph idea appears in Airflow workflows and dbt model dependencies.', 'Dependency order does not guarantee data quality, correct intervals or safe retries.', 'airflow dbt', [['airflow','Represents workflows in'],['dbt','Represents model dependencies in'] ], ['directed acyclic graph']);

group('architecture', 'Architecture & modeling', 'Which boundaries and meanings?', 'Storage design, business modeling and ownership are different axes.', ['A1', 'A2', 'A3', 'A6', 'M1', 'M3'], ['architecture-evolution', 'modeling-approaches']);
term('warehouse', 'Data warehouse', 'concept', 'Integrated analytical serving',
  'A system and curated data layer for integrated analytical queries and reporting.', 'Gives consumers consistent business data and query interfaces.',
  'Defined by analytical responsibilities, not one vendor or a requirement for a star schema.', 'Modern warehouses can also handle semi-structured data and open-table integrations.', 'snowflake lakehouse', [['lake','Can coexist with'],['lakehouse','Compare architectural responsibilities with'],['star','Can publish models such as']]);
term('lake', 'Data lake', 'concept', 'Flexible retained data',
  'A storage-oriented architecture retaining data for multiple processing and consumer needs.', 'Keeps detail and enables replay or questions not modeled at ingestion.',
  'Raw retention and curated serving are separate responsibilities.', 'A folder full of files needs discoverability, version policy, ownership and validation to remain useful.', 'lakehouse', [['object-storage','Often built on'],['lakehouse','Can add reliable table management through'],['medallion','Can organize quality progression using']]);
term('lakehouse', 'Lakehouse', 'concept', 'Lake storage with table reliability',
  'An architecture combining lake-style storage with reliable table management and analytical execution.', 'Supports changing tables and broader workloads without relying only on unmanaged files.',
  'Needs file formats, table protocols, metadata and compatible engines working together.', 'Neither a mandatory successor to a warehouse nor a guarantee of zero copies or universal interoperability.', 'lakehouse', [['iceberg','Can use table management from'],['delta','Can use table management from'],['mesh','Independent ownership choice from']]);
term('medallion', 'Medallion', 'concept', 'Bronze → silver → gold',
  'A logical pattern that moves data from raw evidence through validated records to consumer-ready outputs.', 'Clarifies how meaning and quality progress through a pipeline.',
  'Names responsibilities, not three mandatory storage products or physical copies.', 'Naming folders bronze/silver/gold does not create transactions or correctness. Implement the checks and publication boundaries.', 'medallion', [['lakehouse','Commonly used in'],['dbt','Staging/intermediate/marts are related layering ideas'],['data-tests','Quality must be proved with']], ['bronze','silver','gold']);
term('mesh', 'Data mesh', 'concept', 'Domain-owned data products',
  'An approach combining domain ownership, data as a product, a self-serve platform and federated governance.', 'Addresses delivery and ownership bottlenecks across many teams.',
  'An organizational and technical operating model, not a file or storage format.', 'A personal project can use clear contracts without pretending to operate a multi-domain mesh.', 'mesh', [['warehouse','Products can live in'],['lakehouse','Products can live in'],['contracts','Products need explicit interfaces'],['data-fabric','Different emphasis from']]);
term('data-fabric', 'Data fabric', 'concept', 'Metadata-driven integration umbrella',
  'A broad architecture term for connecting data, metadata, integration and policy across an estate.', 'Aims to make distributed data easier to discover, connect and govern.',
  'Not one standardized table protocol; vendors package different capabilities under the label.', 'Ask which concrete integration or governance problem is solved. Microsoft Fabric is a product name, not this definition.', 'dataFabric', [['fabric','Do not confuse with product'],['mesh','Can coexist with ownership approach'],['catalog','May include metadata capabilities from']]);
term('batch-stream', 'Batch / streaming', 'concept', 'Bounded vs continuously arriving data',
  'Batch processes bounded input; streaming processes data as it arrives, often using retained state.', 'Matches processing behavior to source availability and consumer freshness.',
  'Micro-batching processes small bounded increments as a streaming execution approach.', 'Streaming a monthly source does not make its data live. Event time and arrival time can differ.', 'beam', [['structured-streaming','One implementation'],['flink','Another processing engine'],['watermark','Useful for event-time progress']], ['microbatch','micro-batch','batch processing','stream processing']);
term('oltp-olap', 'OLTP / OLAP', 'concept', 'Transactions vs analytical scans',
  'OLTP serves operational transactions; OLAP serves analytical queries across many records.', 'Explains why an application database and reporting system may use different designs.',
  'A workload distinction, not a claim that one database can never do both.', 'Measure contention and query patterns before separating systems. “SQL database” alone does not identify the workload.', 'presto postgres', [['postgres','Often used for operational transactions'],['clickhouse','Targets analytical processing'],['warehouse','Typically serves analytical needs']], ['online transaction processing','online analytical processing']);
term('star', 'Star schema', 'concept', 'Facts connected to dimensions',
  'A dimensional model with event/measurement facts linked to descriptive dimensions.', 'Makes business reporting and filtering easier to reason about.',
  'Business modeling is independent of the physical file or table format.', 'Declare the fact grain first; dimension joins can still multiply rows if keys are not unique.', 'kimball', [['grain','Depends on explicit'],['scd','Dimensions may preserve history with'],['warehouse','Can be served in']], ['Kimball','fact table','dimension table','dimensional modeling']);
term('grain', 'Grain', 'concept', 'What one row represents',
  'The precise business event or entity represented by one row.', 'Prevents mixed-level joins, invalid aggregates and ambiguous keys.',
  'A business meaning decision, not a partition or file size.', 'Write “one scheduled flight leg” before choosing columns or computing rates.', 'kimball', [['star','Defines facts in'],['data-tests','Can be checked with keys and reconciliation']]);
term('scd', 'SCD', 'concept', 'Dimension attribute history',
  'Slowly changing dimension techniques define how descriptive changes are stored.', 'Preserves either the latest value or historical context for reporting.',
  'Type 1 overwrites; Type 2 preserves versions with validity periods.', 'Historical joins need the right effective-time rule. Table time travel does not replace business-effective history.', 'kimball', [['star','Used in dimensions of'],['time-travel','Different from storage snapshot history']], ['slowly changing dimension','SCD2','SCD Type 2']);

group('reliability', 'Correctness & recovery', 'What survives change or failure?', 'A successful job is not proof of a correct, reproducible business answer.', ['S8', 'A4', 'Q1', 'Q2'], ['sql-warehouse-writes', 'data-quality-contracts']);
term('acid', 'ACID', 'concept', 'Transaction guarantees with a scope',
  'Atomicity, consistency, isolation and durability describe transaction properties.', 'Helps reason about partial writes, concurrent work and committed state.',
  'Database consistency means preserving declared rules, not proving the business formula is correct.', 'Ask whether the guarantee covers one table, several tables, or an external sink too. Isolation levels differ.', 'transactions transaction iceCommit', [['delta','Provides supported table transaction behavior'],['idempotency','Different from rerun safety'],['exactly-once','Different from end-to-end event handling']]);
term('idempotency', 'Idempotency', 'concept', 'Same intended result after replay',
  'Repeating an operation with the same logical input does not add unintended effects.', 'Makes retries, reruns and recovery safer.',
  'A transaction makes one execution atomic; idempotency makes repetition safe.', 'Use stable keys or interval replacement, and prove it by running twice and comparing the full result.', 'airflowPractice', [['airflow','Needed for retrying tasks in'],['incremental','Needed for safe updates in'],['acid','Different guarantee from']]);
term('incremental', 'Incremental load', 'concept', 'Process changes since a boundary',
  'A load that processes a selected new or changed subset rather than rebuilding everything.', 'Reduces work when the boundary and update policy are reliable.',
  'A watermark/filter selects input; a merge or replacement policy applies it.', 'Late corrections and deletes need explicit handling. Compare incremental output with a full rebuild.', 'incremental', [['cdc','Can identify source changes using'],['idempotency','Still needs safe replay'],['backfill','Must coexist with']]);
term('backfill', 'Backfill', 'concept', 'Rebuild past intervals',
  'Processing historical data intervals that were missed or need recomputation.', 'Repairs gaps or applies changed logic to history.',
  'Uses explicit data intervals rather than just the machine’s current date.', 'Make historical inputs reproducible and writes replay-safe; avoid overwriting newer corrections with stale inputs.', 'airflowPractice', [['idempotency','Requires'],['incremental','Must agree with current loads'],['airflow','Can coordinate']]);
term('exactly-once', 'Exactly-once', 'concept', 'A scoped processing guarantee',
  'A guarantee about the observable effect of processing within a defined system boundary.', 'Avoids duplicate effects despite retries or replay when the boundary supports it.',
  'A processor’s internal guarantee is not automatically an external sink’s guarantee.', 'Check source offsets, checkpoint recovery and sink publication together. Idempotent writes often help close the boundary.', 'sparkStream', [['kafka','Event systems advertise scoped guarantees'],['flink','Processing guarantees depend on sink setup'],['idempotency','Can help make sinks replay-safe']]);
term('watermark', 'Event-time watermark', 'concept', 'Progress despite late events',
  'A processing rule/estimate for event-time progress used to bound late-data handling and state.', 'Lets streaming systems close windows and manage retained state.',
  'Different from a batch incremental cursor such as latest_loaded_id.', 'Events arriving beyond the lateness policy may be dropped or routed differently. Define and test the business policy.', 'eventTime', [['structured-streaming','Used in'],['flink','Uses event-time progress rules'],['incremental','Do not confuse with batch loading cursor']]);
term('time-travel', 'Time travel / snapshots', 'concept', 'Read an earlier table state',
  'A supported way to query retained versions of a changing table.', 'Useful for investigation, reproducibility and some recovery workflows.',
  'A snapshot selects physical table state; SCD tracks business-effective attribute history.', 'Old metadata and data files must remain available. Retention/cleanup can remove the ability to read a version.', 'iceMaintain delta', [['delta','Supported table feature in'],['iceberg','Supported table feature in'],['scd','Different history concept from']]);
term('schema-evolution', 'Schema evolution', 'concept', 'Change structure deliberately',
  'Controlled changes to a dataset’s columns, types or other schema definition.', 'Lets producers add or alter data while preserving intended compatibility.',
  'Adding a nullable field and renaming/changing meaning have different risks.', 'Support depends on format, engine and consumer. A technically accepted change can still break a metric.', 'iceEvolve', [['iceberg','Supports defined evolution operations'],['avro','Has writer/reader compatibility rules'],['contracts','Can constrain published interfaces']]);
term('contracts', 'Data contract', 'concept', 'A published producer/consumer promise',
  'An explicit agreement about data shape, meaning and expected behavior.', 'Makes incompatible changes and responsibilities visible before consumers fail.',
  'A dbt model contract enforces part of the shape; a broader contract also covers ownership and service expectations.', 'Supported constraints vary by adapter. A contract declaration does not enforce every quality or freshness rule.', 'contracts', [['schema-registry','Can enforce part of message shape'],['mesh','Supports data-product interfaces'],['data-tests','Complemented by']]);

group('performance', 'Layout & query work', 'How do we avoid wasted reads?', 'Optimize the amount and movement of data after defining the correct answer.', ['P1', 'P3', 'SB2'], ['data-file-formats']);
term('partitioning', 'Partitioning', 'concept', 'Split data by a useful rule',
  'Organizing data into subsets, often by date or another limited-cardinality key.', 'Allows suitable filters to avoid scanning unrelated subsets.',
  'Storage partitioning, Kafka partitions and Spark execution partitions are different uses of the word.', 'A high-cardinality storage key can create too many tiny partitions. Pruning depends on supported filters and metadata.', 'partition', [['clustering','Different physical organization from'],['iceberg','Supports partition evolution'],['parquet','Files may be grouped into storage partitions']], ['partition pruning','hidden partitioning']);
term('clustering', 'Clustering / sorting', 'concept', 'Bring related values together',
  'Organizing values so selected queries can skip more irrelevant data blocks.', 'Improves selective scans when layout matches common filters.',
  'Usually organizes within a table or partition rather than creating a partition for every distinct value.', '“Clustering” means different things across engines. Maintenance cost and supported pruning behavior matter.', 'clustering', [['partitioning','Can complement'],['pushdown','Helps selective scans with']], ['Z-order','ZORDER','liquid clustering']);
term('pushdown', 'Pushdown & data skipping', 'concept', 'Do less work nearer the data',
  'Pushdown delegates filters/columns/work to a lower layer; skipping avoids data ruled out by metadata.', 'Reduces reads, network transfer or computation.',
  'Column projection, file statistics and remote predicate pushdown are related but distinct mechanisms.', 'Not every predicate or connector supports pushdown. Inspect the query plan and actual scanned data.', 'parquet pushdown', [['parquet','Supports selective columnar reads'],['trino','Depends on connector capabilities in'],['polars','Lazy plans can optimize'] ], ['predicate pushdown','projection pushdown','row group','column pruning']);
term('shuffle', 'Shuffle', 'concept', 'Redistribute rows across workers',
  'Moving records among execution partitions so related records can be processed together.', 'Enables distributed joins, aggregation and other key-based work.',
  'An execution data movement cost rather than a persistent table format.', 'Skewed keys can overload a few workers. Read the plan before blindly increasing partition counts.', 'sparkTune', [['spark','A major performance consideration in'],['partitioning','Execution partitions differ from storage partitions']]);
term('compaction', 'Compaction / small files', 'concept', 'Rewrite layout for efficient reads',
  'Combining or reorganizing data files to reduce overhead and improve layout.', 'Counters many tiny files produced by repeated small writes.',
  'Changes physical layout; logical table rows should retain their meaning.', 'Use table-aware maintenance. Deleting “old-looking” files by hand can break snapshots or concurrent readers.', 'iceMaintain', [['iceberg','Has table maintenance procedures'],['hudi','Includes table services'],['time-travel','Retention and cleanup affect']]);
term('federation', 'Query federation', 'concept', 'One query across data systems',
  'Executing a query over multiple connected systems without first consolidating every dataset.', 'Useful for exploration and some cross-system access patterns.',
  'Avoiding a stored copy does not eliminate network movement or remote computation.', 'Permissions, pushdown, type mappings and source freshness differ; remote joins can be expensive.', 'federation', [['trino','Supported through connectors in'],['presto','Supported through connectors in'],['catalog','Uses connector configuration/metadata from']]);

group('governance', 'Validate, discover & govern', 'Can consumers trust and access it?', 'Testing, lineage, discovery and authorization are separate capabilities.', ['Q1', 'Q2', 'A4', 'A5'], ['data-quality-contracts']);
term('data-tests', 'Data tests', 'concept', 'Assertions about actual records',
  'Checks for properties such as unique keys, accepted values and relationships in produced data.', 'Catch broken assumptions before publishing a consumer dataset.',
  'Different from unit tests on code/fixtures and from a declared schema contract.', 'Choose tests from business risk. Passing uniqueness tests does not prove the population or denominator is correct.', 'dbtTests', [['dbt','Built into model workflows with'],['gx','Alternative validation tooling'],['grain','Can protect the chosen row meaning']]);
term('gx', 'Great Expectations', 'tool', 'Data validation workflows',
  'A library/platform ecosystem for expressing and running data expectations.', 'Useful for reusable validation outside a single SQL model framework.',
  'GX Core is the Python library; hosted capabilities are a separate product choice.', 'Validation must sit at a meaningful publication boundary with a failure policy; checks alone do not repair data.', 'gx', [['data-tests','Implements validation checks'],['contracts','Can help validate parts of'] ], ['GX','GX Core']);
term('lineage', 'Lineage / OpenLineage', 'concept', 'Trace dataset dependencies and runs',
  'Lineage records where data comes from and goes; OpenLineage specifies interoperable run/job/dataset metadata.', 'Helps investigate incidents and assess downstream impact.',
  'Dependency visibility is different from validating business correctness.', 'Collected lineage is only as complete as its integrations and supported paths; a missing edge may mean missing capture.', 'lineage', [['datahub','Can surface collected lineage in'],['airflow','Can emit run metadata through integrations'],['unity','Can capture supported lineage paths']], ['OpenLineage']);
term('datahub', 'DataHub', 'tool', 'Metadata discovery and context',
  'A metadata platform for discovering assets, ownership, lineage and related context.', 'Helps people find datasets and understand their use.',
  'An enterprise metadata/discovery role, not the engine scanning the underlying records.', 'Indexing metadata does not automatically enforce access to every data file. Connectors determine coverage.', 'datahub', [['catalog','Implements a discovery catalog role'],['lineage','Can surface'],['hms','Different role from execution metastore']]);
term('iam', 'IAM / RBAC', 'concept', 'Identity, roles and permissions',
  'Identity/access management controls who can do what; role-based access groups permissions by role.', 'Provides manageable, least-privilege access to systems and data.',
  'Signing in proves identity; authorization determines permitted actions.', 'A SQL-level restriction can be bypassed by a separate broad storage credential. Review every access path.', 'iam rowSecurity', [['unity','Can govern data access in'],['s3','Storage permissions also matter for'],['contracts','Complements published access expectations']], ['identity and access management','role-based access control','least privilege']);
term('slo', 'SLI / SLO / SLA', 'concept', 'Measure and promise service behavior',
  'An SLI measures behavior, an SLO sets a target, and an SLA adds an agreement and consequences.', 'Turns vague “reliable data” requests into observable service expectations.',
  'Dataset freshness and completion delay are different from the source’s publication schedule.', 'Define the population, measurement window and incident owner. No pipeline can promise data before its source publishes it.', 'slo', [['contracts','Can include service expectations in'],['airflow','Can monitor workflow delivery through']], ['service level indicator','service level objective','service level agreement','freshness','observability']);

group('serve', 'Publish useful answers', 'What do people consume?', 'BI, semantic metrics and data apps sit above modeled data; they do not fix its grain.', ['BZ3', 'BZ5', 'D4'], ['dashboard-storytelling', 'metric-design']);
term('semantic', 'Semantic layer', 'concept', 'Shared dimensions and metrics',
  'A consumer-facing model of business entities, relationships and metric definitions.', 'Keeps measures such as cancellation rate consistent across consumers.',
  'Different from a storage schema or the visualization that renders a chart.', 'A shared definition still needs valid joins, population rules and tested data underneath.', 'semantic', [['dbt','One ecosystem with a semantic-layer product'],['powerbi','Has semantic modeling capabilities'],['grain','Metric validity depends on']], ['metrics layer','MetricFlow']);
term('powerbi', 'Power BI', 'tool', 'Semantic models and reporting',
  'Microsoft tools/services for modeling, visualizing and sharing analytical data.', 'Useful for business reporting and interactive exploration.',
  'Combines semantic modeling with visuals; distinct from the lake files holding source data.', 'Import, DirectQuery and other connection modes have different freshness, performance and deployment behavior.', 'powerbi', [['semantic','Can define business semantics in'],['fabric','Integrated analytics ecosystem'],['warehouse','Can consume curated data from']]);
term('tableau', 'Tableau', 'tool', 'Visual analytics and dashboards',
  'Tools for building and sharing visual analysis over connected data.', 'Useful for exploratory visual analysis and business dashboards.',
  'A consumer interface rather than the engine/storage architecture for the whole pipeline.', 'Live connections and extracts have different refresh behavior; verify the chart’s actual data source and grain.', 'tableau', [['warehouse','Can consume analytical tables from'],['powerbi','Alternative BI interface']]);
term('superset', 'Apache Superset', 'tool', 'Open-source SQL-oriented BI',
  'A data exploration and visualization platform over connected analytical databases.', 'Useful for self-hosted dashboards and SQL exploration.',
  'Queries an underlying engine rather than replacing its storage and execution.', 'Self-hosting still requires authentication, authorization, upgrades and reliable database connectivity.', 'superset', [['trino','Can visualize queries executed by'],['duckdb','Compare deployment/connector support before connecting'],['semantic','Metrics must still be defined consistently']]);
term('streamlit', 'Streamlit', 'tool', 'Python data apps',
  'A framework for creating interactive applications from Python code.', 'Useful for a focused portfolio explorer with filters and clear explanatory text.',
  'An app framework, not a warehouse or ready-made enterprise BI governance layer.', 'Avoid exposing secrets or unrestricted query execution. Cache with explicit freshness and resource limits.', 'streamlit', [['duckdb','Can query a local analytical dataset with'],['python','Uses Python code alongside'],['powerbi','Different publishing experience from']]);

group('operate', 'Build & run the stack', 'How is it repeatable?', 'Infrastructure orchestration, workflow orchestration and code quality are different jobs.', ['Py4', 'PL7', 'AF1'], ['python-quality-tooling']);
term('docker', 'Docker', 'tool', 'Package code and runtime',
  'Tools for building images and running isolated application containers.', 'Makes runtime dependencies and deployment packaging more reproducible.',
  'An image is the packaged template; a container is a running instance.', 'Container files are not automatically durable storage. Use explicit persistence and keep credentials out of images.', 'docker', [['kubernetes','Can schedule containerized applications'],['airflow','Can package a runtime for']]);
term('kubernetes', 'Kubernetes', 'tool', 'Operate containerized workloads',
  'A platform for scheduling and managing containerized applications and their resources.', 'Useful when a deployment needs cluster-level workload control.',
  'Schedules infrastructure/workloads; Airflow schedules data-task dependencies.', 'Cluster management adds real operating work. It is not required for your first local data pipeline.', 'kubernetes', [['docker','Uses container images built by tools such as'],['yarn','Different cluster resource-management ecosystem'],['airflow','Different orchestration responsibility from']], ['K8s']);
term('yarn', 'YARN', 'tool', 'Hadoop cluster resource allocation',
  'A resource-management layer coordinating cluster capacity and application execution.', 'Lets multiple processing applications share Hadoop cluster resources.',
  'Allocates application resources rather than describing business pipeline dependencies.', 'Spark can run on YARN, Kubernetes or its own standalone cluster manager; these are deployment choices.', 'yarn spark', [['hadoop','Part of'],['spark','Can allocate execution resources for'],['airflow','Different scheduling layer from']]);
term('terraform', 'Terraform', 'tool', 'Infrastructure as code',
  'A tool for describing and managing infrastructure through provider-backed configuration and state.', 'Makes infrastructure changes reviewable and repeatable.',
  'Provisions resources; does not perform the dataset transformation itself.', 'Review plans and protect state. A small local project may not need cloud provisioning.', 'terraform', [['iam','Can provision cloud access resources'],['kubernetes','Can manage related infrastructure'],['actions','Can be checked in CI with']]);
term('actions', 'GitHub Actions / CI', 'tool', 'Automated repository checks',
  'Workflow automation triggered by events such as pull requests or schedules.', 'Runs repeatable lint, tests and build checks before changes are accepted.',
  'CI validates changes; deployment and production data orchestration have separate requirements.', 'A green workflow only proves the checks you actually ran. Keep fixture tests independent of personal credentials.', 'actions', [['pytest','Can run tests with'],['ruff','Can lint Python with'],['dbt','Can validate models built with']], ['continuous integration','CI/CD','GitHub Actions']);
term('uv', 'uv', 'tool', 'Python projects and dependencies',
  'Tools for managing Python versions, environments, dependencies and project execution.', 'Keeps a project’s runnable environment explicit and reproducible.',
  'Manages the environment; DuckDB or pandas performs the data computation.', 'Commit the relevant project and lock files. Development dependencies such as Ruff serve tooling, not runtime data logic.', 'uv', [['python','Manages environments for scripts'],['ruff','Can install as a development dependency'],['duckdb','Can install the Python package for']]);
term('ruff', 'Ruff', 'tool', 'Python linting and formatting',
  'A Python linter and formatter.', 'Catches selected code issues and keeps style consistent.',
  'Static code checks are different from executing assertions on data behavior.', 'Passing lint does not prove correct retries, SQL logic or business metrics.', 'ruff', [['pytest','Complements behavior tests written with'],['actions','Can run in CI through'],['uv','Can be managed as a development dependency by']]);
term('pytest', 'pytest', 'tool', 'Python behavior tests',
  'A test framework with assertions, fixtures and parametrization.', 'Makes edge cases, regressions and failure behavior repeatably testable.',
  'Tests selected behavior; neither lint nor coverage percentage is a correctness proof.', 'Use small fixtures and explicit expected outcomes; test reruns, malformed inputs and failure boundaries.', 'pytest', [['python','Tests ingestion code written in'],['idempotency','Can prove rerun behavior such as'],['actions','Can run automatically through']]);

const stacks = [
  { id: 'lake', name: 'A lake query', note: 'One possible read path: bytes, encoding, table state, catalog and engine. Exact write/read features depend on the chosen versions and configuration.',
    steps: ['s3', 'parquet', 'iceberg', 'glue', 'trino'], links: ['holds files in', 'data tracked by', 'registered in', 'metadata used by'],
    alongside: ['hms', 'hive', 'spark'], alongsideLabel: 'Other pieces you may encounter' },
  { id: 'flights', name: 'Your flights v1', note: 'A local first release. dbt generates model SQL for DuckDB; the app consumes the resulting data. This does not require a cloud lakehouse.',
    steps: ['csv', 'python', 'parquet', 'duckdb', 'dbt', 'streamlit'], links: ['read by', 'writes typed', 'queried by', 'model SQL from', 'models viewed in'],
    alongside: ['pytest', 'data-tests', 'idempotency'], alongsideLabel: 'Keep the result reliable' },
  { id: 'events', name: 'Events to analytics', note: 'An illustrative CDC path. A sink applies the events; capture alone does not build the destination table. End-to-end guarantees need proof.',
    steps: ['postgres', 'debezium', 'kafka', 'flink', 'iceberg'], links: ['changes captured by', 'events sent to', 'consumed by', 'writes through a supported sink'],
    alongside: ['avro', 'schema-registry', 'watermark'], alongsideLabel: 'Message and timing decisions' }
];
const comparisons = [
  { id: 'hive', name: 'Hive vs Metastore', ids: ['hive', 'hms'], answer: 'Hive can execute SQL. Hive Metastore describes tables and their locations; other engines can use it without running Hive queries.' },
  { id: 'engines', name: 'Spark vs Presto / Trino', ids: ['spark', 'presto', 'trino'], answer: 'All perform computation. Spark provides broad processing APIs; Presto and Trino focus on distributed SQL through connectors. Present-day PrestoDB and Trino are distinct projects.' },
  { id: 'file-table', name: 'Parquet vs Iceberg / Delta', ids: ['parquet', 'iceberg', 'delta'], answer: 'Parquet describes values inside files. Iceberg and Delta describe changing table state across files. They usually work together rather than replacing one another.' },
  { id: 'arrow', name: 'Arrow vs Parquet', ids: ['arrow', 'parquet'], answer: 'Arrow emphasizes columnar memory and interchange; Parquet emphasizes persistent analytical files with encoding and compression. Arrow also has IPC serialization.' },
  { id: 'orchestration', name: 'dbt vs Airflow', ids: ['dbt', 'airflow'], answer: 'dbt defines and builds analytical models on a target engine. Airflow coordinates task dependencies, scheduling and retries; it can trigger a dbt build.' },
  { id: 'mesh', name: 'Lakehouse vs Mesh', ids: ['lakehouse', 'mesh'], answer: 'Lakehouse addresses data storage, table management and execution. Mesh addresses domain ownership, data products, self-serve infrastructure and shared governance. They can coexist.' }
];
const specificLearning = {
  csv: ['Py3'], json: ['S7', 'Py3'], jsonl: ['Py3'], avro: ['A2'], parquet: ['P3', 'Py3'], orc: ['P3'], arrow: ['Py2'],
  spark: ['SB1', 'SB2'], pyspark: ['SB1', 'SB2'], hive: ['A1', 'A2'], hms: ['A2'], presto: ['A2', 'A3'], trino: ['A2', 'A3'],
  duckdb: ['SETUP', 'Py2'], pandas: ['Py2'], polars: ['Py2'], pyarrow: ['Py3'], sql: ['S1', 'S4'], tez: ['A1'], mapreduce: ['A1'],
  snowflake: ['PL3'], bigquery: ['PL4'], databricks: ['SB4'], fabric: ['A2'], postgres: ['A1'], clickhouse: ['A3'], redshift: ['A2'], athena: ['A2'],
  airflow: ['AF1', 'AF2'], cosmos: ['AF3'], dbt: ['D1'], dag: ['AF1', 'D1'], dagster: ['AF4'], prefect: ['AF4'],
  mesh: ['A6'], 'data-fabric': ['A6'], star: ['M1'], grain: ['M1', 'S4'], scd: ['M3'],
  semantic: ['D4'], powerbi: ['BZ3'], tableau: ['BZ3'], streamlit: ['BZ3'], superset: ['BZ3'],
  uv: ['SETUP'], ruff: ['Py4'], pytest: ['Py4'], docker: ['PL7'], kubernetes: ['PL7'], terraform: ['PL7'], yarn: ['SB1'], actions: ['Py4']
};
for (const entry of entries) entry.lessons = specificLearning[entry.id] || groups.find(g => g.id === entry.group).lessons;
const usedSources = new Set(entries.flatMap(e => e.sources));
module.exports = { reviewed: '2026-10-22', groups, sources: Object.fromEntries(Object.entries(sources).filter(([id]) => usedSources.has(id))), entries, stacks, comparisons };
