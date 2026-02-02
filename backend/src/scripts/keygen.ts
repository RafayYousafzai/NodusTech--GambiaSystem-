import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';

const keyPair = nacl.sign.keyPair();

const publicKey = naclUtil.encodeBase64(keyPair.publicKey);
const secretKey = naclUtil.encodeBase64(keyPair.secretKey);

console.log('==================================================');
console.log('GENERATED ED25519 KEYPAIR');
console.log('==================================================');
console.log('');
console.log('PUBLIC KEY (Safe to share with the Validator App):');
console.log(publicKey);
console.log('');
console.log('PRIVATE KEY (KEEP SECRET - Server Only):');
console.log(secretKey);
console.log('');
console.log('==================================================');
console.log('Add these to your .env file:');
console.log(`SIGNING_PRIVATE_KEY=${secretKey}`);
console.log(`SIGNING_PUBLIC_KEY=${publicKey}`);
