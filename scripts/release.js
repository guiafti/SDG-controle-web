const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Erro: Você deve fornecer a nova versão (ex: node scripts/release.js 1.1.3)');
  process.exit(1);
}

// Garante que a versão comece com v para a tag, mas não para o package.json
const versionTag = newVersion.startsWith('v') ? newVersion : `v${newVersion}`;
const versionNum = newVersion.startsWith('v') ? newVersion.substring(1) : newVersion;

try {
  console.log(`🚀 Iniciando lançamento da versão ${versionTag}...`);

  // 1. Atualiza o package.json
  const packagePath = path.join(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.version = versionNum;
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('✅ Versão atualizada no package.json');

  // 2. Git Add e Commit
  execSync('git add .');
  execSync(`git commit -m "chore: release ${versionTag}"`);
  console.log('✅ Alterações commitadas');

  // 3. Git Push (Código)
  execSync('git push');
  console.log('✅ Código enviado para o repositório privado');

  // 4. Git Tag
  execSync(`git tag ${versionTag}`);
  console.log(`✅ Tag ${versionTag} criada localmente`);

  // 5. Git Push (Tag) - Isso dispara o GitHub Actions
  execSync(`git push origin ${versionTag}`);
  console.log(`✅ Tag enviada! O GitHub Actions iniciará o build em breve.`);

  console.log('\n⭐ TUDO PRONTO! Acompanhe o progresso na aba "Actions" do seu GitHub.');

} catch (error) {
  console.error('\n❌ ERRO DURANTE O PROCESSO:');
  console.error(error.message);
  process.exit(1);
}
