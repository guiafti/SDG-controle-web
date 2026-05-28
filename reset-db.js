const fs = require('fs');
const path = require('path');
const os = require('os');

// Caminhos possíveis do banco
const devDb = path.join(__dirname, 'local.db');
const prodDb = path.join(os.homedir(), 'AppData', 'Roaming', 'SDG Controle', 'local.db');
const prodImages = path.join(os.homedir(), 'AppData', 'Roaming', 'SDG Controle', 'product_images');

console.log('--- LIMPANDO BANCO DE DADOS LOCAL ---');

// Remove banco de desenvolvimento
if (fs.existsSync(devDb)) {
  fs.unlinkSync(devDb);
  console.log('✔ Banco de desenvolvimento removido.');
}

// Remove banco de produção
if (fs.existsSync(prodDb)) {
  fs.unlinkSync(prodDb);
  console.log('✔ Banco de produção removido.');
}

// Limpa imagens locais
if (fs.existsSync(prodImages)) {
  fs.rmSync(prodImages, { recursive: true, force: true });
  console.log('✔ Pasta de imagens limpa.');
}

console.log('---------------------------------------');
console.log('O banco será recriado vazio ao iniciar o sistema.');
