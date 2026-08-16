#!/usr/bin/env node
/**
 * Preparação da primeira execução.
 *
 * Confere a versão do Node, cria o .env a partir do exemplo e diz o que fazer
 * em seguida. Existe porque "copie .env.example para .env" é exatamente o tipo
 * de passo que trava alguém que só quer jogar.
 */

import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Em servidor de hospedagem não há ninguém lendo o terminal, e as variáveis
// vêm do painel — criar um .env ali só polui o log. Sai quieto.
if (process.env.CI || process.env.NODE_ENV === 'production' || process.env.RENDER) {
  process.exit(0);
}

const bold = (text) => `[1m${text}[0m`;
const green = (text) => `[32m${text}[0m`;
const yellow = (text) => `[33m${text}[0m`;
const red = (text) => `[31m${text}[0m`;

let problems = 0;

// --- Node -------------------------------------------------------------------

const major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  console.log(red(`✗ Node ${process.versions.node} é antigo demais. A plataforma precisa da 20 ou superior.`));
  console.log(`  Baixe em ${bold('https://nodejs.org')} (escolha a versão LTS) e rode este comando de novo.\n`);
  problems++;
} else {
  console.log(green(`✓ Node ${process.versions.node}`));
}

// --- .env -------------------------------------------------------------------

const envPath = join(root, '.env');
const examplePath = join(root, '.env.example');

if (!existsSync(envPath)) {
  copyFileSync(examplePath, envPath);
  console.log(green('✓ Arquivo .env criado a partir de .env.example'));
} else {
  console.log(green('✓ Arquivo .env já existe'));
}

// Detecta se a chave foi preenchida, sem nunca imprimir o valor.
const envText = readFileSync(envPath, 'utf8');
const keyLine = envText.split(/\r?\n/).find((line) => line.startsWith('ANTHROPIC_API_KEY='));
const hasKey = Boolean(keyLine && keyLine.slice('ANTHROPIC_API_KEY='.length).trim());

console.log();
if (hasKey) {
  console.log(green('✓ Chave da Anthropic configurada — o Mestre IA vai estar disponível.'));
} else {
  console.log(yellow('• Sem chave da Anthropic. A plataforma funciona assim mesmo,'));
  console.log(yellow('  mas com o Mestre Offline, que só puxa ganchos prontos da ambientação.'));
  console.log();
  console.log(`  Para habilitar o Mestre IA:`);
  console.log(`    1. Entre em ${bold('https://console.anthropic.com')} e crie uma conta`);
  console.log(`    2. Adicione créditos em ${bold('Billing')} (o uso é cobrado por token)`);
  console.log(`    3. Vá em ${bold('API Keys')} → ${bold('Create Key')} e copie a chave`);
  console.log(`    4. Abra o arquivo ${bold('.env')} na raiz do projeto e cole depois do sinal de igual:`);
  console.log(`       ${bold('ANTHROPIC_API_KEY=cole-aqui')}`);
  console.log();
  console.log(`  A chave aparece uma única vez — se perder, crie outra.`);
  console.log(`  O arquivo .env nunca vai para o repositório; não compartilhe a chave com ninguém.`);
}

console.log();
if (problems === 0) {
  console.log(bold('Tudo pronto. Agora rode:'));
  console.log();
  console.log(`    ${bold('npm run dev')}`);
  console.log();
  console.log(`E abra ${bold('http://localhost:5173')} no navegador.`);
} else {
  console.log(red('Resolva o item acima e rode `npm run setup` de novo.'));
  process.exitCode = 1;
}
console.log();
