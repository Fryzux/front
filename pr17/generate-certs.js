const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');

/**
 * Генерирует самоподписанный SSL-сертификат для локальной разработки.
 * Этот скрипт заменяет mkcert, если он не установлен.
 */

const attrs = [{ name: 'commonName', value: 'localhost' }];
const pems = selfsigned.generate(attrs, {
  days: 365,
  keySize: 2048,
  algorithm: 'sha256',
  extensions: [
    { name: 'basicConstraints', cA: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
      ],
    },
  ],
});

fs.writeFileSync(path.join(__dirname, 'localhost.pem'), pems.cert);
fs.writeFileSync(path.join(__dirname, 'localhost-key.pem'), pems.private);

console.log('✅ SSL Сертификаты успешно сгенерированы:');
console.log(' - localhost.pem');
console.log(' - localhost-key.pem');
console.log('\nТеперь вы можете запустить сервер с HTTPS!');
