/** Offline labels, links and visual tokens. No remote assets are loaded. */
export const connectorMeta: Record<
  string,
  {
    name: string;
    icon: string | null;
    doc: string | null;
  }
> = {
  salesforce: {
    name: 'Salesforce',
    icon: 'com.mulesoft.connectors/mule-salesforce-connector/icon/svg/',
    doc: 'salesforce-connector',
  },
  netsuite: {
    name: 'NetSuite',
    icon: 'com.mulesoft.connectors/mule-netsuite-connector/icon/svg/',
    doc: 'netsuite-connector',
  },
  workday: {
    name: 'Workday',
    icon: 'com.mulesoft.connectors/mule-workday-connector/icon/svg/',
    doc: 'workday-connector',
  },
  http: {
    name: 'HTTP',
    icon: 'org.mule.connectors/mule-http-connector/icon/svg/',
    doc: 'http-connector',
  },
  db: {
    name: 'Database',
    icon: 'org.mule.connectors/mule-db-connector/icon/svg/',
    doc: 'db-connector',
  },
  database: {
    name: 'Database',
    icon: 'org.mule.connectors/mule-db-connector/icon/svg/',
    doc: 'db-connector',
  },
  sap: {
    name: 'SAP',
    icon: 'com.mulesoft.connectors/mule-sap-connector/icon/svg/',
    doc: 'sap-connector',
  },
  kafka: {
    name: 'Kafka',
    icon: 'com.mulesoft.connectors/mule-kafka-connector/icon/svg/',
    doc: 'kafka-connector',
  },
  jms: {
    name: 'JMS',
    icon: 'org.mule.connectors/mule-jms-connector/icon/svg/',
    doc: 'jms-connector',
  },
  amqp: {
    name: 'AMQP',
    icon: 'com.mulesoft.connectors/mule-amqp-connector/icon/svg/',
    doc: 'amqp-connector',
  },
  sftp: {
    name: 'SFTP',
    icon: 'org.mule.connectors/mule-sftp-connector/icon/svg/',
    doc: 'sftp-connector',
  },
  ftp: {
    name: 'FTP',
    icon: 'org.mule.connectors/mule-ftp-connector/icon/svg/',
    doc: 'ftp-connector',
  },
  file: {
    name: 'File',
    icon: 'org.mule.connectors/mule-file-connector/icon/svg/',
    doc: 'file-connector',
  },
  email: {
    name: 'Email',
    icon: 'org.mule.connectors/mule-email-connector/icon/svg/',
    doc: 'email-connector',
  },
  vm: {
    name: 'VM',
    icon: 'org.mule.connectors/mule-vm-connector/icon/svg/',
    doc: 'vm-connector',
  },
  os: {
    name: 'ObjectStore',
    icon: 'org.mule.connectors/mule-objectstore-connector/icon/svg/',
    doc: 'object-store-connector',
  },
  mongodb: {
    name: 'MongoDB',
    icon: 'com.mulesoft.connectors/mule-mongodb-connector/icon/svg/',
    doc: 'mongodb-connector',
  },
  redis: {
    name: 'Redis',
    icon: 'com.mulesoft.connectors/mule-redis-connector/icon/svg/',
    doc: 'redis-connector',
  },
  slack: {
    name: 'Slack',
    icon: 'com.mulesoft.connectors/mule-slack-connector/icon/svg/',
    doc: 'slack-connector',
  },
  box: {
    name: 'Box',
    icon: 'com.mulesoft.connectors/mule-box-connector/icon/svg/',
    doc: 'box-connector',
  },
  s3: {
    name: 'Amazon S3',
    icon: 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/',
    doc: 'amazon-s3-connector',
  },
  'amazon-s3': {
    name: 'Amazon S3',
    icon: 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/',
    doc: 'amazon-s3-connector',
  },
  sqs: {
    name: 'Amazon SQS',
    icon: 'com.mulesoft.connectors/mule-amazon-sqs-connector/icon/svg/',
    doc: 'amazon-sqs-connector',
  },
  dynamodb: {
    name: 'DynamoDB',
    icon: 'com.mulesoft.connectors/mule-amazon-dynamodb-connector/icon/svg/',
    doc: 'amazon-dynamodb-connector',
  },
  servicenow: {
    name: 'ServiceNow',
    icon: 'com.mulesoft.connectors/mule-servicenow-connector/icon/svg/',
    doc: 'servicenow-connector',
  },
  sockets: {
    name: 'Sockets',
    icon: 'org.mule.connectors/mule-sockets-connector/icon/svg/',
    doc: 'sockets-connector',
  },
  snowflake: {
    name: 'Snowflake',
    icon: 'com.mulesoft.connectors/mule-snowflake-connector/icon/svg/',
    doc: 'snowflake-connector',
  },
  stripe: {
    name: 'Stripe',
    icon: 'com.mulesoft.connectors/mule-stripe-connector/icon/svg/',
    doc: 'stripe-connector',
  },
  'anypoint-mq': {
    name: 'Anypoint MQ',
    icon: 'com.mulesoft.connectors/anypoint-mq-connector/icon/svg/',
    doc: 'anypoint-mq-connector',
  },
  mule: { name: 'Mule Core', icon: null, doc: null },
  apikit: { name: 'APIkit', icon: null, doc: 'apikit' },
  'mule-apikit': { name: 'APIkit', icon: null, doc: 'apikit' },
  java: { name: 'Java', icon: null, doc: 'java-module' },
  'java-logger': { name: 'Logger', icon: null, doc: null },
  schedulers: { name: 'Scheduler', icon: null, doc: null },
  'secure-properties': {
    name: 'Secure Props',
    icon: null,
    doc: 'mule-runtime/mule-4.4/secure-app-props',
  },
};

export const methodStyles: Record<
  string,
  {
    bg: string;
    text: string;
    dot: string;
  }
> = {
  GET: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
  },
  POST: {
    bg: 'bg-sky-100 dark:bg-sky-500/20',
    text: 'text-sky-700 dark:text-sky-400',
    dot: 'bg-sky-500',
  },
  PUT: {
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  PATCH: {
    bg: 'bg-orange-100 dark:bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
  DELETE: {
    bg: 'bg-rose-100 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  ALL: {
    bg: 'bg-slate-100 dark:bg-slate-600',
    text: 'text-slate-600 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
};

export const envStyles: Record<
  string,
  {
    bg: string;
    dot: string;
  }
> = {
  dev: {
    bg: 'bg-cyan-100 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-400',
    dot: 'bg-emerald-500',
  },
  local: {
    bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
  prod: {
    bg: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400',
    dot: 'bg-rose-500',
  },
  qa: {
    bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400',
    dot: 'bg-violet-500',
  },
  staging: {
    bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    dot: 'bg-amber-500',
  },
  uat: {
    bg: 'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
    dot: 'bg-indigo-500',
  },
  test: {
    bg: 'bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400',
    dot: 'bg-teal-500',
  },
  sandbox: {
    bg: 'bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400',
    dot: 'bg-orange-500',
  },
};

export const secStyles: Record<
  string,
  {
    bg: string;
    icon: string;
  }
> = {
  TLS: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400',
    icon: '🔒',
  },
  OAuth: {
    bg: 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400',
    icon: '🔑',
  },
  'Secure Properties': {
    bg: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
    icon: '🔐',
  },
  'Basic Auth': {
    bg: 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400',
    icon: '👤',
  },
};

export const defaultSecStyle = {
  bg: 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300',
  icon: '🛡️',
};
