/**
 * Renderer Script
 * Dashboard rendering and metrics display
 * 
 * NOTE: The actual renderer implementation is inline in HtmlFormatter.ts
 * since it requires access to DOM, Chart.js, and Tabulator instances.
 * This file exports reusable configuration constants.
 */

/**
 * Connector metadata for displaying connector icons and documentation links
 */
export const connectorMeta: Record<string, { name: string; icon: string | null; doc: string | null }> = {
    salesforce: { name: 'Salesforce', icon: 'com.mulesoft.connectors/mule-salesforce-connector/icon/svg/', doc: 'salesforce-connector' },
    netsuite: { name: 'NetSuite', icon: 'com.mulesoft.connectors/mule-netsuite-connector/icon/svg/', doc: 'netsuite-connector' },
    workday: { name: 'Workday', icon: 'com.mulesoft.connectors/mule-workday-connector/icon/svg/', doc: 'workday-connector' },
    http: { name: 'HTTP', icon: 'org.mule.connectors/mule-http-connector/icon/svg/', doc: 'http-connector' },
    db: { name: 'Database', icon: 'org.mule.connectors/mule-db-connector/icon/svg/', doc: 'db-connector' },
    database: { name: 'Database', icon: 'org.mule.connectors/mule-db-connector/icon/svg/', doc: 'db-connector' },
    sap: { name: 'SAP', icon: 'com.mulesoft.connectors/mule-sap-connector/icon/svg/', doc: 'sap-connector' },
    kafka: { name: 'Kafka', icon: 'com.mulesoft.connectors/mule-kafka-connector/icon/svg/', doc: 'kafka-connector' },
    jms: { name: 'JMS', icon: 'org.mule.connectors/mule-jms-connector/icon/svg/', doc: 'jms-connector' },
    amqp: { name: 'AMQP', icon: 'com.mulesoft.connectors/mule-amqp-connector/icon/svg/', doc: 'amqp-connector' },
    sftp: { name: 'SFTP', icon: 'org.mule.connectors/mule-sftp-connector/icon/svg/', doc: 'sftp-connector' },
    ftp: { name: 'FTP', icon: 'org.mule.connectors/mule-ftp-connector/icon/svg/', doc: 'ftp-connector' },
    file: { name: 'File', icon: 'org.mule.connectors/mule-file-connector/icon/svg/', doc: 'file-connector' },
    email: { name: 'Email', icon: 'org.mule.connectors/mule-email-connector/icon/svg/', doc: 'email-connector' },
    vm: { name: 'VM', icon: 'org.mule.connectors/mule-vm-connector/icon/svg/', doc: 'vm-connector' },
    os: { name: 'ObjectStore', icon: 'org.mule.connectors/mule-objectstore-connector/icon/svg/', doc: 'object-store-connector' },
    mongodb: { name: 'MongoDB', icon: 'com.mulesoft.connectors/mule-mongodb-connector/icon/svg/', doc: 'mongodb-connector' },
    redis: { name: 'Redis', icon: 'com.mulesoft.connectors/mule-redis-connector/icon/svg/', doc: 'redis-connector' },
    slack: { name: 'Slack', icon: 'com.mulesoft.connectors/mule-slack-connector/icon/svg/', doc: 'slack-connector' },
    box: { name: 'Box', icon: 'com.mulesoft.connectors/mule-box-connector/icon/svg/', doc: 'box-connector' },
    's3': { name: 'Amazon S3', icon: 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/', doc: 'amazon-s3-connector' },
    'amazon-s3': { name: 'Amazon S3', icon: 'com.mulesoft.connectors/mule-amazon-s3-connector/icon/svg/', doc: 'amazon-s3-connector' },
    sqs: { name: 'Amazon SQS', icon: 'com.mulesoft.connectors/mule-amazon-sqs-connector/icon/svg/', doc: 'amazon-sqs-connector' },
    dynamodb: { name: 'DynamoDB', icon: 'com.mulesoft.connectors/mule-amazon-dynamodb-connector/icon/svg/', doc: 'amazon-dynamodb-connector' },
    servicenow: { name: 'ServiceNow', icon: 'com.mulesoft.connectors/mule-servicenow-connector/icon/svg/', doc: 'servicenow-connector' },
    sockets: { name: 'Sockets', icon: 'org.mule.connectors/mule-sockets-connector/icon/svg/', doc: 'sockets-connector' },
    snowflake: { name: 'Snowflake', icon: 'com.mulesoft.connectors/mule-snowflake-connector/icon/svg/', doc: 'snowflake-connector' },
    stripe: { name: 'Stripe', icon: 'com.mulesoft.connectors/mule-stripe-connector/icon/svg/', doc: 'stripe-connector' },
    'anypoint-mq': { name: 'Anypoint MQ', icon: 'com.mulesoft.connectors/anypoint-mq-connector/icon/svg/', doc: 'anypoint-mq-connector' },
    // Core/internal connectors
    mule: { name: 'Mule Core', icon: null, doc: null },
    apikit: { name: 'APIkit', icon: null, doc: 'apikit' },
    'mule-apikit': { name: 'APIkit', icon: null, doc: 'apikit' },
    java: { name: 'Java', icon: null, doc: 'java-module' },
    'java-logger': { name: 'Logger', icon: null, doc: null },
    schedulers: { name: 'Scheduler', icon: null, doc: null },
    'secure-properties': { name: 'Secure Props', icon: null, doc: 'mule-runtime/mule-4.4/secure-app-props' }
};

/**
 * HTTP method styles for endpoint display
 */
export const methodStyles: Record<string, { bg: string; text: string; dot: string }> = {
    'GET': { bg: 'bg-emerald-100 dark:bg-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
    'POST': { bg: 'bg-sky-100 dark:bg-sky-500/20', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
    'PUT': { bg: 'bg-amber-100 dark:bg-amber-500/20', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
    'PATCH': { bg: 'bg-orange-100 dark:bg-orange-500/20', text: 'text-orange-700 dark:text-orange-400', dot: 'bg-orange-500' },
    'DELETE': { bg: 'bg-rose-100 dark:bg-rose-500/20', text: 'text-rose-700 dark:text-rose-400', dot: 'bg-rose-500' },
    'ALL': { bg: 'bg-slate-100 dark:bg-slate-600', text: 'text-slate-600 dark:text-slate-300', dot: 'bg-slate-400' }
};

/**
 * MuleSoft Exchange base URL for connector icons
 */
export const exchangeBaseUrl = 'https://www.mulesoft.com/exchange/organizations/68ef9520-24e9-4cf2-b2f5-620025690913/assets/';
