import { Client as QStashClient } from '@upstash/qstash';

const globalForQStash = globalThis;

let qstash;

if (!globalForQStash.qstash) {
    globalForQStash.qstash = new QStashClient({ token: process.env.QSTASH_TOKEN });
}

qstash = globalForQStash.qstash;

export default qstash;
