import test from 'node:test';
import assert from 'node:assert/strict';
import { formatProfilePhone, validateProfileForm } from '../src/components/EditProfileModal/profileForm.ts';

const validProfile = { name: 'Anderson Mendes', email: 'anderson@exemplo.com', phone: '(64) 99999-9687' };

test('aceita os dados preenchidos com telefone celular ou fixo', () => {
  assert.deepEqual(validateProfileForm(validProfile), {});
  assert.deepEqual(validateProfileForm({ ...validProfile, phone: '(64) 3333-4444' }), {});
});

test('identifica campos obrigatórios vazios e nome apenas com espaços', () => {
  assert.deepEqual(Object.keys(validateProfileForm({ name: '   ', email: '', phone: '' })), ['name', 'email', 'phone']);
});

test('rejeita e-mail inválido e telefone incompleto', () => {
  const errors = validateProfileForm({ ...validProfile, email: 'sem-arroba', phone: '(64) 9999' });
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.equal(errors.name, undefined);
});

test('valida e-mail após remover espaços nas extremidades', () => {
  assert.deepEqual(validateProfileForm({ ...validProfile, email: ' anderson@exemplo.com ' }), {});
});

test('formata os dados atuais e a digitação parcial', () => {
  assert.equal(formatProfilePhone('64999999687'), '(64) 99999-9687');
  assert.equal(formatProfilePhone('6433334444'), '(64) 3333-4444');
  assert.equal(formatProfilePhone('64'), '64');
  assert.equal(formatProfilePhone('64999'), '(64) 999');
  assert.equal(formatProfilePhone(''), '');
});

test('aceita colagem com +55 e preserva o DDD 55 de telefones nacionais', () => {
  assert.equal(formatProfilePhone('+55 (64) 99999-9687'), '(64) 99999-9687');
  assert.equal(formatProfilePhone('+55 64 3333-4444'), '(64) 3333-4444');
  assert.equal(formatProfilePhone('55999999687'), '(55) 99999-9687');
});
