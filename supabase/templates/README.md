# Templates de e-mail do SERFES

## Confirmação de cadastro

**Assunto sugerido:** `SERFES | Confirme seu cadastro`

Arquivo: `confirmation.html`

### Ativação no Supabase hospedado

1. Acesse o projeto do SERFES no Supabase.
2. Vá em **Authentication → Email Templates**.
3. Abra o template **Confirm signup** / confirmação de cadastro.
4. Substitua o assunto por `SERFES | Confirme seu cadastro`.
5. Cole o conteúdo de `confirmation.html` no corpo do template.
6. Salve.

O template utiliza `{{ .ConfirmationURL }}`, variável oficial do Supabase para o link de confirmação.
